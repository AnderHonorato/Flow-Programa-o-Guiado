"""Reconhecimento interno derivado de aprovação auditada; não certifica uma trilha."""
from fastapi import APIRouter, Depends
from servidor.servicos.certificados import certificados_por_usuarios


def criar_rotas_certificados(autenticar, banco):
    rotas = APIRouter()

    @rotas.get('/api/certificados')
    def listar(usuario=Depends(autenticar), db=Depends(banco)):
        return certificados_por_usuarios(db, [usuario]).get(usuario.id, [])

    return rotas
