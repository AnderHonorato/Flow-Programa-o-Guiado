"""Configuração sem segredo embarcado, adequada a SQLite e Postgres."""
import os
from dataclasses import dataclass, field
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]

@dataclass
class Configuracao:
    banco_url: str = field(default_factory=lambda: os.getenv('DATABASE_URL', 'sqlite:///./flow.db').replace('postgres://', 'postgresql+psycopg://', 1).replace('postgresql://', 'postgresql+psycopg://', 1))
    origens: list[str] = field(default_factory=lambda: [x.strip() for x in os.getenv('CORS_ORIGENS', 'http://localhost:5173,http://localhost:4173,capacitor://localhost,https://localhost').split(',') if x.strip()])
    duracao_sessao_horas: int = field(default_factory=lambda: int(os.getenv('SESSAO_HORAS', '168')))
    chave_openai: str = field(default_factory=lambda: os.getenv('OPENAI_API_KEY', ''))
    modelo_openai: str = field(default_factory=lambda: os.getenv('OPENAI_MODELO', 'gpt-4.1-mini'))
    catalogo: Path = field(default_factory=lambda: RAIZ / 'conteudos/catalogo.json')
    web_dist: Path = field(default_factory=lambda: Path(os.getenv('WEB_DIST', str(RAIZ / 'aplicativos/web/dist'))))
    limite_requisicao: int = 2_000_000
