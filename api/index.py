"""Entrada ASGI da Vercel; banco persistente obrigatório em produção."""
import os
from fastapi import FastAPI
from fastapi.responses import JSONResponse
if os.getenv('DATABASE_URL'):
    from servidor.principal import app
else:
    app = FastAPI()
    @app.api_route('/{caminho:path}', methods=['GET','POST','PUT','PATCH','DELETE'])
    def indisponivel(caminho: str):
        return JSONResponse({'detail':'A API ainda precisa de um banco persistente configurado. Seu trabalho local permanece salvo.'},status_code=503)
