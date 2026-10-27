"""Controlador interno separado da API; iniciar somente em host dedicado."""
import hmac
import os

from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.responses import JSONResponse

from executores.contratos import EntradaExecucao, ResultadoExecucao
from executores.docker import ExecutorDocker, ExecutorIndisponivel


def criar_controlador():
    app = FastAPI(title='Executor interno Flow', docs_url=None, redoc_url=None, openapi_url=None)
    habilitado = os.getenv('EXECUTOR_HABILITADO') == '1'
    token = os.getenv('EXECUTOR_TOKEN', '')
    if habilitado and len(token) < 32:
        raise ValueError('EXECUTOR_TOKEN precisa de pelo menos 32 caracteres aleatórios.')
    executor = ExecutorDocker()
    app.state.ativos = 0

    @app.middleware('http')
    async def limitar_corpo(request: Request, proximo):
        if request.method == 'POST':
            partes = []
            total = 0
            async for parte in request.stream():
                total += len(parte)
                if total > 65536:
                    return JSONResponse({'detail': 'Corpo excede 64 KiB.'}, status_code=413)
                partes.append(parte)
            request._body = b''.join(partes)
        resposta = await proximo(request)
        resposta.headers['Cache-Control'] = 'no-store'
        resposta.headers['X-Content-Type-Options'] = 'nosniff'
        return resposta

    def autorizar(authorization: str | None = Header(default=None)):
        if not habilitado:
            raise HTTPException(503, 'Executor remoto desativado.')
        if authorization is None or not hmac.compare_digest(authorization, 'Bearer ' + token):
            raise HTTPException(401, 'Credencial interna inválida.')

    @app.post('/executar', response_model=ResultadoExecucao, dependencies=[Depends(autorizar)])
    async def executar(entrada: EntradaExecucao):
        if app.state.ativos >= 2:
            raise HTTPException(429, 'Executor ocupado. Tente novamente em instantes.', headers={'Retry-After': '5'})
        app.state.ativos += 1
        try:
            return await executor.executar(entrada)
        except ExecutorIndisponivel:
            raise HTTPException(503, 'Executor indisponível. Tente mais tarde.')
        finally:
            app.state.ativos -= 1

    return app


app = criar_controlador()
