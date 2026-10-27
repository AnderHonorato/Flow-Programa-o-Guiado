"""Proxy HTTP: o processo principal não usa Docker nem executa código."""
import os
from urllib.parse import urlsplit

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import ValidationError

from executores.contratos import EntradaExecucao, ResultadoExecucao


def criar_rotas_execucoes(autenticar):
    rotas = APIRouter(prefix='/api', dependencies=[Depends(autenticar)])

    @rotas.post('/execucoes', response_model=ResultadoExecucao)
    async def executar(entrada: EntradaExecucao):
        url = os.getenv('EXECUTOR_URL', '').rstrip('/')
        token = os.getenv('EXECUTOR_TOKEN', '')
        try:
            destino = urlsplit(url)
        except ValueError:
            raise HTTPException(503, 'Configuração do executor inválida no servidor.')
        if (not url or len(token) < 32 or destino.scheme not in {'http', 'https'}
                or not destino.hostname or destino.username or destino.password or destino.query or destino.fragment):
            raise HTTPException(503, 'Execução remota desativada. Configure o serviço isolado no servidor.')
        try:
            # trust_env=False impede proxy externo implícito de receber código e token.
            async with httpx.AsyncClient(timeout=httpx.Timeout(22, connect=2), trust_env=False) as cliente:
                async with cliente.stream('POST', url + '/executar',
                        headers={'Authorization': 'Bearer ' + token}, json=entrada.model_dump(mode='json')) as resposta:
                    if resposta.status_code == 429:
                        raise HTTPException(429, 'Executor ocupado. Tente novamente em instantes.', headers={'Retry-After': '5'})
                    if resposta.status_code == 503:
                        raise HTTPException(503, 'Executor indisponível. Tente mais tarde.')
                    if resposta.status_code != 200:
                        raise HTTPException(502, 'Resposta inválida do serviço de execução.')
                    partes = bytearray()
                    async for parte in resposta.aiter_bytes():
                        partes.extend(parte)
                        if len(partes) > 524288:
                            raise HTTPException(502, 'Resposta excessiva do serviço de execução.')
            return ResultadoExecucao.model_validate_json(partes)
        except httpx.HTTPError:
            raise HTTPException(503, 'Executor indisponível. Tente mais tarde.')
        except (ValidationError, ValueError):
            raise HTTPException(502, 'Resposta inválida do serviço de execução.')

    return rotas
