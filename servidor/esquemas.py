"""Contratos de fronteira; entradas desconhecidas são recusadas."""
from datetime import datetime
from typing import Any, Literal
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class Entrada(BaseModel):
    model_config = ConfigDict(extra='forbid')


class Credenciais(Entrada):
    email: EmailStr
    senha: str = Field(min_length=10, max_length=128)

    @field_validator('email')
    @classmethod
    def normalizar_email(cls, valor):
        return valor.lower()


class Cadastro(Credenciais):
    nome: str = Field(min_length=2, max_length=100)

    @field_validator('nome')
    @classmethod
    def validar_nome(cls, valor):
        valor = valor.strip()
        if len(valor) < 2:
            raise ValueError('Informe um nome com pelo menos dois caracteres.')
        return valor


class RevisaoEspacada(Entrada):
    etapa: int = Field(ge=0, le=10)
    proxima: datetime


class Estado(Entrada):
    aulasConcluidas: list[str] = Field(default_factory=list, max_length=10000)
    respostas: dict[str, bool] = Field(default_factory=dict, max_length=10000)
    revisoes: dict[str, RevisaoEspacada] = Field(default_factory=dict, max_length=10000)
    xp: int = Field(default=0, ge=0)
    ultimaAula: str = Field(default='', max_length=100)


class Evento(Entrada):
    id: str = Field(min_length=1, max_length=100)
    tipo: Literal['aula_concluida', 'resposta', 'revisao', 'ultima_aula']
    alvo: str = Field(min_length=1, max_length=100)
    valor: Any = None
    criadoEm: datetime


class Sincronizacao(Entrada):
    estado: Estado | None = None
    eventos: list[Evento] = Field(default_factory=list, max_length=500)
    versaoBase: int | None = Field(default=None, ge=0)


class Arquivos(Entrada):
    html: str = Field(default='', max_length=100000)
    css: str = Field(default='', max_length=100000)
    js: str = Field(default='', max_length=100000)
    python: str | None = Field(default=None, max_length=100000)


class NovaTentativa(Entrada):
    id: str = Field(min_length=1, max_length=100)
    aulaId: str = Field(min_length=1, max_length=100)
    arquivos: Arquivos
    criadaEm: datetime


class Criterio(Entrada):
    criterio: str = Field(min_length=1, max_length=500)
    atendido: bool
    observacao: str = Field(min_length=1, max_length=2000)


class Feedback(Entrada):
    nota: float = Field(ge=0, le=10)
    criterios: list[Criterio] = Field(min_length=1, max_length=30)
    pontosFortes: list[str] = Field(max_length=20)
    falhas: list[str] = Field(max_length=20)
    dicas: list[str] = Field(min_length=1, max_length=20)
    proximaRevisaoDias: int = Field(ge=1, le=90)
    confianca: float = Field(ge=0, le=1)
    limites: str = Field(min_length=1, max_length=2000)
    aprovado: bool


class RevisaoHumana(Entrada):
    status: Literal['aprovada', 'revisar', 'pendente_validacao']
    feedback: Feedback
    justificativa: str = Field(min_length=5, max_length=2000)
    versaoBase: int | None = Field(default=None, ge=1)


class CorrecaoManual(Entrada):
    confirmarReavaliacao: bool = False
