"""Catálogo versionado no banco; JSON de origem é a versão inicial somente leitura."""
import json
from typing import Literal
from pydantic import Field
from sqlalchemy import select
from servidor.esquemas import Entrada, Arquivos
from servidor.modelos import VersaoCatalogo


class Alternativa(Entrada):
    texto: str = Field(min_length=1)
    correta: bool
    feedback: str = Field(min_length=1)


class Questao(Entrada):
    id: str = Field(min_length=1, max_length=100)
    enunciado: str = Field(min_length=1)
    alternativas: list[Alternativa] = Field(min_length=2)


class Exemplo(Entrada):
    titulo: str = Field(min_length=1)
    codigo: str = Field(min_length=1)
    explicacao: list[str] = Field(min_length=1)


class TesteLaboratorio(Entrada):
    id: str = Field(min_length=1, max_length=100)
    descricao: str = Field(min_length=1)
    tipo: Literal['elemento', 'texto', 'atributo', 'estilo', 'evento', 'javascript', 'python']
    seletor: str | None = None
    esperado: str | None = None
    propriedade: str | None = None


class Planejamento(Entrada):
    objetivos: list[str]
    aulasPrevistas: int = Field(ge=0)
    exerciciosPrevistos: int = Field(ge=0)


class Aula(Entrada):
    id: str = Field(min_length=1, max_length=100)
    titulo: str = Field(min_length=1)
    objetivo: str = Field(min_length=1)
    preRequisitos: list[str]
    blocos: list[str] = Field(min_length=1)
    exemplos: list[Exemplo] = Field(min_length=2)
    questoes: list[Questao] = Field(min_length=2)
    desafio: str = Field(min_length=1)
    variacao: str = Field(min_length=1)
    resumo: str = Field(min_length=1)
    pontosDificeis: list[str]
    pistas: list[str] = Field(min_length=1)
    arquivos: Arquivos
    competencia: str = Field(min_length=1)
    linguagem: Literal['html', 'css', 'javascript', 'dom', 'python', 'api']
    rubrica: list[str] = Field(min_length=1)
    testes: list[TesteLaboratorio] | None = None


class Modulo(Entrada):
    id: str = Field(min_length=1)
    titulo: str = Field(min_length=1)
    estado: Literal['publicado', 'em_producao']
    aulas: list[Aula]
    planejamento: Planejamento | None = None


class Trilha(Entrada):
    id: str = Field(min_length=1)
    titulo: str = Field(min_length=1)
    descricao: str = Field(min_length=1)
    cor: str = Field(pattern=r'^#[0-9a-fA-F]{6}$')
    preRequisitos: list[str]
    modulos: list[Modulo]


class Catalogo(Entrada):
    versao: int = Field(ge=1)
    trilhas: list[Trilha]


class AtualizacaoCatalogo(Entrada):
    versaoBase: int = Field(ge=0)
    catalogo: Catalogo


def validar_catalogo(catalogo):
    ids = set()
    for trilha in catalogo.trilhas:
        for modulo in trilha.modulos:
            if modulo.estado == 'publicado' and not modulo.aulas:
                raise ValueError('Módulo publicado exige aulas completas.')
            for aula in modulo.aulas:
                if aula.id in ids:
                    raise ValueError('Identificador de aula duplicado.')
                ids.add(aula.id)
                for questao in aula.questoes:
                    if sum(alt.correta for alt in questao.alternativas) != 1:
                        raise ValueError('Questão deve ter exatamente uma alternativa correta.')


def ler_catalogo(banco, caminho):
    versao = banco.scalar(select(VersaoCatalogo).order_by(VersaoCatalogo.id.desc()).limit(1))
    if versao:
        return versao.dados, versao.id
    if caminho.exists():
        return json.loads(caminho.read_text(encoding='utf-8')), 0
    return {'versao': 1, 'trilhas': []}, 0


def encontrar_aula(catalogo, aula_id):
    for trilha in catalogo['trilhas']:
        for modulo in trilha['modulos']:
            if modulo['estado'] == 'publicado':
                for aula in modulo['aulas']:
                    if aula['id'] == aula_id:
                        return aula
    return None
