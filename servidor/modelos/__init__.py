"""Modelos persistentes. Todas as relações privadas possuem dono explícito."""
from datetime import datetime, timezone
from uuid import uuid4
from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


def agora():
    return datetime.now(timezone.utc)


def identificador():
    return str(uuid4())


class Base(DeclarativeBase):
    pass


class Usuario(Base):
    __tablename__ = 'usuarios'
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=identificador)
    nome: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(254), unique=True, index=True)
    senha_hash: Mapped[str] = mapped_column(Text)
    papel: Mapped[str] = mapped_column(String(20), default='aluno')
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=agora)
    estado: Mapped[str] = mapped_column(String(20), default='ativo', server_default='ativo', index=True)
    motivo_estado: Mapped[str | None] = mapped_column(Text, nullable=True)
    acesso_ate: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class Sessao(Base):
    __tablename__ = 'sessoes'
    hash_token: Mapped[str] = mapped_column(String(64), primary_key=True)
    usuario_id: Mapped[str] = mapped_column(ForeignKey('usuarios.id'), index=True)
    expira_em: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    revogada_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class Progresso(Base):
    __tablename__ = 'progressos'
    usuario_id: Mapped[str] = mapped_column(ForeignKey('usuarios.id'), primary_key=True)
    estado: Mapped[dict] = mapped_column(JSON, default=dict)
    versao: Mapped[int] = mapped_column(Integer, default=0)
    conflitos: Mapped[list] = mapped_column(JSON, default=list)


class EventoProgresso(Base):
    __tablename__ = 'eventos_progresso'
    __table_args__ = (UniqueConstraint('usuario_id', 'evento_id'),)
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    usuario_id: Mapped[str] = mapped_column(ForeignKey('usuarios.id'), index=True)
    evento_id: Mapped[str] = mapped_column(String(100))
    dados: Mapped[dict] = mapped_column(JSON)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=agora)


class Tentativa(Base):
    __tablename__ = 'tentativas'
    __table_args__ = (UniqueConstraint('usuario_id', 'id_cliente'),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=identificador)
    id_cliente: Mapped[str] = mapped_column(String(100))
    usuario_id: Mapped[str] = mapped_column(ForeignKey('usuarios.id'), index=True)
    aula_id: Mapped[str] = mapped_column(String(100), index=True)
    arquivos: Mapped[dict] = mapped_column(JSON)
    criada_em_cliente: Mapped[str] = mapped_column(String(50))
    recebida_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=agora)
    status: Mapped[str] = mapped_column(String(30), default='pendente_validacao', index=True)
    enunciado: Mapped[dict] = mapped_column(JSON)
    feedback: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    versao: Mapped[int] = mapped_column(Integer, default=1)
    correcao_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class Auditoria(Base):
    __tablename__ = 'auditorias'
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ator_id: Mapped[str | None] = mapped_column(ForeignKey('usuarios.id'), nullable=True)
    acao: Mapped[str] = mapped_column(String(80), index=True)
    recurso: Mapped[str] = mapped_column(String(120))
    dados: Mapped[dict] = mapped_column(JSON, default=dict)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=agora)


class VersaoCatalogo(Base):
    __tablename__ = 'versoes_catalogo'
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    autor_id: Mapped[str] = mapped_column(ForeignKey('usuarios.id'))
    dados: Mapped[dict] = mapped_column(JSON)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=agora)


class Leitura(Base):
    __tablename__ = 'leituras'
    __table_args__ = (UniqueConstraint('usuario_id', 'id_cliente'),
                      CheckConstraint('segundos >= 20 AND segundos <= 300', name='ck_leituras_segundos'))
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=identificador)
    id_cliente: Mapped[str] = mapped_column(String(36))
    usuario_id: Mapped[str] = mapped_column(ForeignKey('usuarios.id'), index=True)
    aula_id: Mapped[str] = mapped_column(String(100), index=True)
    segundos: Mapped[int] = mapped_column(Integer)
    criada_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=agora)


class AvaliacaoAula(Base):
    __tablename__ = 'avaliacoes_aulas'
    __table_args__ = (UniqueConstraint('usuario_id', 'aula_id'),
                      CheckConstraint('nota >= 1 AND nota <= 5', name='ck_avaliacoes_aulas_nota'))
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=identificador)
    usuario_id: Mapped[str] = mapped_column(ForeignKey('usuarios.id'), index=True)
    aula_id: Mapped[str] = mapped_column(String(100), index=True)
    nota: Mapped[int] = mapped_column(Integer)
    comentario: Mapped[str] = mapped_column(Text)
    criada_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=agora)
    atualizada_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=agora)
