from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class RequisicaoHttp(BaseModel):
    model_config = ConfigDict(extra='forbid')
    metodo: Literal['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'] = 'GET'
    caminho: str = Field(default='/', min_length=1, max_length=1024)
    corpo: str = Field(default='', max_length=4096)

    @field_validator('caminho')
    @classmethod
    def caminho_local(cls, valor):
        if not valor.startswith('/') or valor.startswith('//') or any(ord(c) < 33 or ord(c) > 126 for c in valor):
            raise ValueError('Use caminho HTTP local sem espaços, host ou caracteres de controle.')
        return valor


class EntradaExecucao(BaseModel):
    model_config = ConfigDict(extra='forbid')
    linguagem: Literal['python', 'node', 'backend-python']
    codigo: str = Field(min_length=1, max_length=32768)
    requisicaoHttp: RequisicaoHttp | None = None

    @field_validator('codigo')
    @classmethod
    def limitar_bytes(cls, valor):
        if len(valor.encode('utf-8')) > 32768:
            raise ValueError('Código limitado a 32 KiB em UTF-8.')
        return valor

    @model_validator(mode='after')
    def validar_requisicao(self):
        if self.linguagem != 'backend-python' and self.requisicaoHttp is not None:
            raise ValueError('Requisição HTTP exige backend-python.')
        return self


class RespostaHttp(BaseModel):
    model_config = ConfigDict(extra='forbid')
    status: int = Field(ge=100, le=599)
    corpo: str = Field(max_length=4096)
    truncada: bool


class ResultadoExecucao(BaseModel):
    model_config = ConfigDict(extra='forbid')
    status: Literal['concluido', 'erro', 'tempo_excedido', 'saida_excedida']
    codigoSaida: int | None
    saida: str = Field(max_length=65536)
    duracaoMs: int = Field(ge=0)
    respostaHttp: RespostaHttp | None = None

    @field_validator('saida')
    @classmethod
    def limitar_bytes(cls, valor):
        if len(valor.encode('utf-8')) > 65536:
            raise ValueError('Saída excede 64 KiB.')
        return valor
