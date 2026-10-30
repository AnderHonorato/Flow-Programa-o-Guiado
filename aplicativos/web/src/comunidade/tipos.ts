import type { AvatarPerfil } from '../perfil/avatar';
export interface CertificadoComunidade { codigo: string; titulo: string; aulaId: string; emitidoEm: string }
export interface PerfilComunidade {
  id: string; nome: string; avatar?: AvatarPerfil; xp: number; nivel: number; nomeNivel: string;
  concluidas: number; aulasConcluidas: { id: string; titulo: string }[]; leituras: number;
  maisLidas: { aulaId: string; titulo: string; leituras: number; segundos: number }[];
  certificados: CertificadoComunidade[]; certificadosTotal?: number; posicao: number;
}
export interface UsuarioAdmin extends PerfilComunidade {
  email: string; papel: string; estado: 'ativo' | 'banido' | 'inativo'; motivo: string | null; ate: string | null; criadoEm: string;
}
export interface PaginaUsuarios<T> { usuarios: T[]; total: number; pagina: number; tamanho: number }
export interface OpiniaoAula { id: string; aulaId: string; nota: number; comentario: string; criadaEm: string; atualizadaEm: string }
export interface OpiniaoAdmin extends OpiniaoAula { usuarioId: string; usuarioNome: string; tituloAula: string }
export interface PaginaOpinioes { avaliacoes: OpiniaoAdmin[]; total: number; pagina: number; tamanho: number; media: number | null }
