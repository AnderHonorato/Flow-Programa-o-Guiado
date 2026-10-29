import { historicoValido, registrarHistorico, type HistoricoConquistas } from '../evolucao/historico';
import { validarAvatar, type AvatarPerfil } from '../perfil/avatar';
import { combinarAvaliacoes, respostasDasAvaliacoes, type Avaliacao } from '../aprendizagem/avaliacao';
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { mensagemDeAcesso, notificarAcesso } from '../componentes/api';
import type { ArquivosCodigo } from '../../../../contratos/tipos';
import { exportarProjetos, importarProjetos, validarProjetos, type ProjetoExportado } from '../laboratorios/armazenamento';

export interface EstadoLocal {
  avaliacoes?: Record<string, Avaliacao>;
  historicoConquistas?: HistoricoConquistas;
  avatar?: AvatarPerfil;
  aulasConcluidas: string[];
  respostas: Record<string, boolean>;
  revisoes: Record<string, { etapa: number; proxima: string }>;
  xp: number;
  ultimaAula: string;
}

export interface TentativaLocal {
  id: string;
  aulaId: string;
  arquivos: ArquivosCodigo;
  criadaEm: string;
  status: 'aguardando_sincronizacao' | 'pendente_validacao' | 'aprovada' | 'revisar';
  feedback?: unknown;
}

export interface EstadoSincronizacao {
  estado: 'local' | 'sincronizando' | 'sincronizado' | 'erro';
  ultimaSincronizacao?: string;
  erro?: string;
  sessaoExpirada?: boolean;
}

interface RecursoLocal { perfilId: string; chave: string; conteudo: unknown; atualizadoEm: string }
interface BancoFlow extends DBSchema {
  estados: { key: string; value: EstadoLocal };
  tentativas: { key: [string, string]; value: TentativaLocal & { perfilId: string }; indexes: { perfil: string } };
  recursos: { key: [string, string]; value: RecursoLocal; indexes: { perfil: string } };
  sincronizacao: { key: string; value: EstadoSincronizacao };
}

let conexao: Promise<IDBPDatabase<BancoFlow>> | undefined;
const sincronizacoes = new Map<string, {token:string;promessa:Promise<{ enviadas: number; pendentes: number }>}>();
const estadosValidos = new Set(['aguardando_sincronizacao', 'pendente_validacao', 'aprovada', 'revisar']);

function banco() {
  if (typeof indexedDB === 'undefined') throw new Error('Este dispositivo não disponibiliza armazenamento IndexedDB. Exporte seu trabalho antes de fechar.');
  if (!conexao) conexao = openDB<BancoFlow>('flow-programacao-guiada', 1, {
    upgrade(db) {
      db.createObjectStore('estados');
      db.createObjectStore('tentativas', { keyPath: ['perfilId', 'id'] }).createIndex('perfil', 'perfilId');
      db.createObjectStore('recursos', { keyPath: ['perfilId', 'chave'] }).createIndex('perfil', 'perfilId');
      db.createObjectStore('sincronizacao');
    },
    blocking() { void conexao?.then(db => db.close()); conexao = undefined; },
    terminated() { conexao = undefined; },
  }).catch(erro => { conexao = undefined; throw erro; });
  return conexao;
}

function validarId(valor: unknown): asserts valor is string {
  if (typeof valor !== 'string' || !valor.trim() || valor.length > 240) throw new Error('Identificador de perfil ou atividade inválido.');
}
function objeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}
function dataValida(valor: unknown): valor is string {
  return typeof valor === 'string' && Number.isFinite(Date.parse(valor));
}

export function estadoInicial(): EstadoLocal {
  return { aulasConcluidas: [], respostas: {}, revisoes: {}, xp: 0, ultimaAula: '' };
}

function avaliacaoValida(valor: unknown): boolean {
  if (!objeto(valor) || !objeto(valor.escolhas)) return false;
  if (!Object.values(valor.escolhas).every(i => Number.isInteger(i) && Number(i) >= 0 && Number(i) <= 100)) return false;
  if (valor.enviadaEm !== undefined && !dataValida(valor.enviadaEm)) return false;
  if (valor.revisada !== undefined && typeof valor.revisada !== 'boolean') return false;
  if (valor.correcao === undefined) return true;
  return Array.isArray(valor.correcao) && valor.correcao.length <= 100 && valor.correcao.every(q =>
    objeto(q) && typeof q.id === 'string' && typeof q.enunciado === 'string' &&
    Array.isArray(q.alternativas) && q.alternativas.length <= 100 && q.alternativas.every(a =>
      objeto(a) && typeof a.texto === 'string' && typeof a.correta === 'boolean' && typeof a.feedback === 'string'));
}
function validarEstado(estado: unknown): asserts estado is EstadoLocal {
  if (!objeto(estado) || !Array.isArray(estado.aulasConcluidas) || !estado.aulasConcluidas.every(v => typeof v === 'string') ||
      !objeto(estado.respostas) || !Object.values(estado.respostas).every(v => typeof v === 'boolean') ||
      !objeto(estado.revisoes) || !Object.values(estado.revisoes).every(v => objeto(v) && Number.isInteger(v.etapa) && Number(v.etapa) >= 0 && Number(v.etapa) <= 4 && dataValida(v.proxima)) ||
      (estado.avaliacoes !== undefined && (!objeto(estado.avaliacoes) || !Object.values(estado.avaliacoes).every(avaliacaoValida))) ||
      (estado.historicoConquistas !== undefined && !historicoValido(estado.historicoConquistas)) ||
      (estado.avatar !== undefined && !validarAvatar(estado.avatar)) ||
      !Number.isFinite(estado.xp) || Number(estado.xp) < 0 || typeof estado.ultimaAula !== 'string') {
    throw new Error('Progresso inválido. Nenhum dado foi importado.');
  }
}

function validarTentativa(tentativa: unknown): asserts tentativa is TentativaLocal {
  if (!objeto(tentativa)) throw new Error('Tentativa inválida.');
  validarId(tentativa.id); validarId(tentativa.aulaId);
  const a = tentativa.arquivos;
  if (!objeto(a) || !['html', 'css', 'js'].every(k => typeof a[k] === 'string') ||
      (a.python !== undefined && typeof a.python !== 'string') || !dataValida(tentativa.criadaEm) || !estadosValidos.has(String(tentativa.status))) {
    throw new Error('Tentativa com código, data ou estado inválido.');
  }
}

function mesmaTentativa(a: TentativaLocal, b: TentativaLocal) {
  return a.aulaId === b.aulaId && a.criadaEm === b.criadaEm && a.arquivos.html === b.arquivos.html &&
    a.arquivos.css === b.arquivos.css && a.arquivos.js === b.arquivos.js && a.arquivos.python === b.arquivos.python;
}

/** Conclusões e acertos nunca regridem; revisões vencem na data mais próxima. */
export function combinarEstados(local: EstadoLocal, remoto: EstadoLocal): EstadoLocal {
  validarEstado(local); validarEstado(remoto);
  const respostas = Object.fromEntries([...new Set([...Object.keys(local.respostas), ...Object.keys(remoto.respostas)])]
    .map(id => [id, Boolean(local.respostas[id] || remoto.respostas[id])]));
  const revisoes = Object.fromEntries([...new Set([...Object.keys(local.revisoes), ...Object.keys(remoto.revisoes)])].map(id => {
    const a = local.revisoes[id], b = remoto.revisoes[id];
    return [id, a && b ? { etapa: Math.max(a.etapa, b.etapa), proxima: Date.parse(a.proxima) <= Date.parse(b.proxima) ? a.proxima : b.proxima } : a || b];
  }));
  const aulasConcluidas = [...new Set([...local.aulasConcluidas, ...remoto.aulasConcluidas])];
  const avaliacoes = combinarAvaliacoes(local.avaliacoes, remoto.avaliacoes);
  const protegidas = respostasDasAvaliacoes(respostas, avaliacoes);
  const historicoConquistas = { ...remoto.historicoConquistas, ...local.historicoConquistas };
  const avatar = combinarAvatar(local.avatar, remoto.avatar);
  return { ...(avatar ? { avatar } : {}), ...(Object.keys(historicoConquistas).length ? { historicoConquistas } : {}), aulasConcluidas, respostas: protegidas, revisoes, xp: Object.keys(avaliacoes).length ? aulasConcluidas.length * 100 + Object.values(protegidas).filter(Boolean).length * 10 : Math.max(local.xp, remoto.xp), ultimaAula: local.ultimaAula || remoto.ultimaAula, ...(Object.keys(avaliacoes).length ? { avaliacoes } : {}) };
}

export function combinarAvatar(a?: AvatarPerfil, b?: AvatarPerfil): AvatarPerfil | undefined {
  if (!a || !b) return a ?? b;
  const diferenca = Date.parse(a.atualizadoEm) - Date.parse(b.atualizadoEm);
  return diferenca > 0 || diferenca === 0 && `${a.tipo}:${a.valor}` >= `${b.tipo}:${b.valor}` ? a : b;
}

export async function lerEstado(perfilId: string): Promise<EstadoLocal> {
  validarId(perfilId);
  return (await (await banco()).get('estados', perfilId)) ?? estadoInicial();
}

export async function salvarEstado(perfilId: string, estado: EstadoLocal): Promise<void> {
  validarId(perfilId); validarEstado(estado);
  await (await banco()).put('estados', estado, perfilId);
}

export async function enfileirarTentativa(perfilId: string, tentativa: TentativaLocal): Promise<void> {
  validarId(perfilId); validarTentativa(tentativa);
  const tx = (await banco()).transaction('tentativas', 'readwrite');
  const anterior = await tx.store.get([perfilId, tentativa.id]);
  if (anterior && !mesmaTentativa(anterior, tentativa)) {
    await tx.done;
    throw new Error('Este envio já existe com outro código. Crie uma nova tentativa para preservar ambos.');
  }
  if (!anterior) await tx.store.put({ ...tentativa, perfilId, status: 'aguardando_sincronizacao' });
  await tx.done;
}

/** Lista o histórico completo; filtre aguardando_sincronizacao para mostrar pendências de rede. */
export async function listarFila(perfilId: string): Promise<TentativaLocal[]> {
  validarId(perfilId);
  return (await (await banco()).getAllFromIndex('tentativas', 'perfil', perfilId))
    .map(({ perfilId: _perfil, ...tentativa }) => tentativa)
    .sort((a, b) => a.criadaEm.localeCompare(b.criadaEm));
}

export async function salvarRecursoLocal(perfilId: string, chave: string, conteudo: unknown): Promise<void> {
  validarId(perfilId); validarId(chave);
  await (await banco()).put('recursos', { perfilId, chave, conteudo, atualizadoEm: new Date().toISOString() });
}

export async function lerRecursoLocal<T>(perfilId: string, chave: string): Promise<T | undefined> {
  validarId(perfilId); validarId(chave);
  return (await (await banco()).get('recursos', [perfilId, chave]))?.conteudo as T | undefined;
}

export async function listarRecursosLocais(perfilId: string): Promise<RecursoLocal[]> {
  validarId(perfilId);
  return (await banco()).getAllFromIndex('recursos', 'perfil', perfilId);
}

export async function removerRecursoLocal(perfilId: string, chave: string): Promise<void> {
  validarId(perfilId); validarId(chave);
  await (await banco()).delete('recursos', [perfilId, chave]);
}

export async function lerSincronizacao(perfilId: string): Promise<EstadoSincronizacao> {
  validarId(perfilId);
  return (await (await banco()).get('sincronizacao', perfilId)) ?? { estado: 'local' };
}

async function registrarSincronizacao(perfilId: string, valor: EstadoSincronizacao) {
  await (await banco()).put('sincronizacao', valor, perfilId);
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('flow:sincronizacao', { detail: { perfilId, ...valor } }));
}

export function sincronizarFila(perfilId: string, token: string, api = '/api'): Promise<{ enviadas: number; pendentes: number }> {
  validarId(perfilId);
  const existente = sincronizacoes.get(perfilId);
  if (existente) return existente.token===token?existente.promessa:existente.promessa.catch(()=>{}).then(()=>sincronizarFila(perfilId,token,api));
  const tarefa = sincronizar(perfilId, token, api).finally(() => {if(sincronizacoes.get(perfilId)?.promessa===tarefa)sincronizacoes.delete(perfilId);});
  sincronizacoes.set(perfilId, {token,promessa:tarefa});
  return tarefa;
}

async function sincronizar(perfilId: string, token: string, api: string) {
  let enviadas = 0;
  const falhas: string[] = [];
  let sessaoExpirada = false;
  const anterior = await lerSincronizacao(perfilId);
  await registrarSincronizacao(perfilId, { ...anterior, estado: 'sincronizando', erro: undefined, sessaoExpirada: false });
  const base = api.replace(/\/$/, '');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  async function requisitar(caminho: string, op: RequestInit = {}): Promise<unknown> {
    const resposta = await fetch(`${base}${caminho}`, { ...op, headers, cache: 'no-store' });
    if (!resposta.ok) {
      let dados:unknown;try{dados=await resposta.json();}catch{/* Resposta antiga sem detalhes estruturados. */}
      const acesso=notificarAcesso(resposta.status,dados,token);
      if (resposta.status === 401) sessaoExpirada = true;
      throw new Error(acesso?mensagemDeAcesso(acesso):resposta.status === 401 ? 'Sessão expirada. Entre novamente; seus envios continuam salvos.' : `Sincronização indisponível (HTTP ${resposta.status}).`);
    }
    return resposta.json();
  }
  try {
    if (!token.trim()) throw new Error('Entre na sua conta para sincronizar.');
    for (const tentativa of await listarFila(perfilId)) {
      if (tentativa.status !== 'aguardando_sincronizacao') continue;
      try {
        const { id, aulaId, arquivos, criadaEm } = tentativa;
        const retorno = await requisitar('/tentativas', { method: 'POST', body: JSON.stringify({ id, aulaId, arquivos, criadaEm }) });
        if (!objeto(retorno) || retorno.id !== id || !['pendente_validacao', 'aprovada', 'revisar'].includes(String(retorno.status))) throw new Error('O servidor não confirmou este envio. Ele continua na fila.');
        await (await banco()).put('tentativas', { ...tentativa, perfilId, status: retorno.status as TentativaLocal['status'], feedback: retorno.feedback });
        enviadas++;
      } catch (erro) {
        falhas.push(erro instanceof Error ? erro.message : 'Não foi possível enviar a atividade.');
        // Uma falha de autenticação/rede não descarta nem altera o próximo envio.
        break;
      }
    }
    // Uma resposta perdida no POST poderá ser recuperada aqui pelo mesmo id.
    const resposta = await requisitar('/tentativas');
    const remotas = Array.isArray(resposta) ? resposta : objeto(resposta) && Array.isArray(resposta.tentativas) ? resposta.tentativas : [];
    const db = await banco();
    const tx = db.transaction('tentativas', 'readwrite');
    for (const remota of remotas) {
      if (!objeto(remota) || typeof remota.id !== 'string' || !['pendente_validacao', 'aprovada', 'revisar'].includes(String(remota.status))) continue;
      const local = await tx.store.get([perfilId, remota.id]);
      if (local) {
        await tx.store.put({ ...local, status: remota.status as TentativaLocal['status'], feedback: remota.feedback });
      } else {
        try { validarTentativa(remota); } catch { continue; }
        await tx.store.put({ ...remota, perfilId } as TentativaLocal & { perfilId: string });
      }
    }
    await tx.done;
    const progresso = await requisitar('/progresso', { method: 'PUT', body: JSON.stringify({ estado: await lerEstado(perfilId) }) });
    if (!objeto(progresso)) throw new Error('Resposta de progresso inválida.');
    validarEstado(progresso.estado);
    const progressoTx = db.transaction('estados', 'readwrite');
    const maisRecente = (await progressoTx.store.get(perfilId)) ?? estadoInicial();
    const combinado = combinarEstados(maisRecente, progresso.estado);
    combinado.avaliacoes = combinarAvaliacoes(progresso.estado.avaliacoes, maisRecente.avaliacoes);
    combinado.respostas = respostasDasAvaliacoes({ ...maisRecente.respostas, ...progresso.estado.respostas }, combinado.avaliacoes);
    combinado.historicoConquistas = { ...maisRecente.historicoConquistas, ...progresso.estado.historicoConquistas };
    combinado.historicoConquistas = registrarHistorico(combinado, combinado);
    combinado.xp = combinado.aulasConcluidas.length * 100 + Object.values(combinado.respostas).filter(Boolean).length * 10;
    await progressoTx.store.put(combinado, perfilId);
    await progressoTx.done;
  } catch (erro) { falhas.push(erro instanceof Error ? erro.message : 'Não foi possível sincronizar agora.'); }
  const pendentes = (await listarFila(perfilId)).filter(t => t.status === 'aguardando_sincronizacao').length;
  await registrarSincronizacao(perfilId, falhas.length ? { ...anterior, estado: 'erro', erro: [...new Set(falhas)].join(' '),sessaoExpirada } : { estado: 'sincronizado', ultimaSincronizacao: new Date().toISOString(),sessaoExpirada:false });
  return { enviadas, pendentes };
}

interface BackupPerfil { versao: 1; exportadoEm: string; estado: EstadoLocal; tentativas: TentativaLocal[]; recursos: { chave: string; conteudo: unknown; atualizadoEm: string }[]; projetos?: ProjetoExportado[] }

export async function exportarPerfil(perfilId: string): Promise<string> {
  validarId(perfilId);
  const db = await banco();
  const tx = db.transaction(['estados', 'tentativas', 'recursos']);
  const estado = (await tx.objectStore('estados').get(perfilId)) ?? estadoInicial();
  const tentativas = (await tx.objectStore('tentativas').index('perfil').getAll(perfilId)).map(({ perfilId: _p, ...t }) => t);
  // CacheStorage tem arquivos binários e pode ser baixado de novo: não entra no JSON.
  const recursos = (await tx.objectStore('recursos').index('perfil').getAll(perfilId)).filter(r => !r.chave.startsWith('pacote:')).map(({ perfilId: _p, ...r }) => r);
  await tx.done;
  const projetos = typeof localStorage !== 'undefined' ? exportarProjetos(perfilId) : [];
  return JSON.stringify({ versao: 1, exportadoEm: new Date().toISOString(), estado, tentativas, recursos, projetos } satisfies BackupPerfil, null, 2);
}

async function incorporar(perfilId: string, dados: BackupPerfil) {
  const db = await banco();
  const tx = db.transaction(['estados', 'tentativas', 'recursos'], 'readwrite');
  const estado = (await tx.objectStore('estados').get(perfilId)) ?? estadoInicial();
  await tx.objectStore('estados').put(combinarEstados(estado, dados.estado), perfilId);
  for (const tentativa of dados.tentativas) {
    const anterior = await tx.objectStore('tentativas').get([perfilId, tentativa.id]);
    if (!anterior) await tx.objectStore('tentativas').put({ ...tentativa, perfilId });
    else if (!mesmaTentativa(anterior, tentativa)) {
      await tx.objectStore('tentativas').put({ ...tentativa, perfilId, id: crypto.randomUUID(), status: 'aguardando_sincronizacao' });
    }
  }
  for (const recurso of dados.recursos) {
    const anterior = await tx.objectStore('recursos').get([perfilId, recurso.chave]);
    if (!anterior) await tx.objectStore('recursos').put({ ...recurso, perfilId });
    else if (JSON.stringify(anterior.conteudo) !== JSON.stringify(recurso.conteudo)) {
      // Preserva ambas as versões de um rascunho; a UI pode oferecer restauração.
      await tx.objectStore('recursos').put({ ...recurso, perfilId, chave: `recuperado:${crypto.randomUUID()}` });
    }
  }
  await tx.done;
}

export async function importarPerfil(perfilId: string, json: string): Promise<void> {
  validarId(perfilId);
  if (json.length > 20_000_000) throw new Error('Backup maior que 20 MB. Divida os projetos antes de importar.');
  const dados: unknown = JSON.parse(json);
  if (!objeto(dados) || dados.versao !== 1 || !Array.isArray(dados.tentativas) || !Array.isArray(dados.recursos)) throw new Error('Formato de backup não reconhecido.');
  validarEstado(dados.estado);
  dados.tentativas.forEach(validarTentativa);
  for (const recurso of dados.recursos) {
    if (!objeto(recurso) || !dataValida(recurso.atualizadoEm)) throw new Error('Recurso de backup inválido.');
    validarId(recurso.chave);
    if (recurso.chave.startsWith('pacote:')) throw new Error('Pacotes devem ser baixados pelo gerenciador offline.');
  }
  if (dados.projetos !== undefined) validarProjetos(dados.projetos);
  // localStorage e IndexedDB não compartilham transação. A validação é integral;
  // uma falha de cota pode deixar uma cópia parcial, mas nunca apaga a origem.
  if (Array.isArray(dados.projetos) && dados.projetos.length) {
    if (typeof localStorage === 'undefined') throw new Error('O armazenamento de projetos não está disponível neste dispositivo.');
    importarProjetos(perfilId, dados.projetos);
  }
  await incorporar(perfilId, dados as unknown as BackupPerfil);
}

/** Cópia transacional: a origem permanece como recuperação e nunca é apagada. */
export async function vincularPerfil(perfilLocalId: string, perfilContaId: string): Promise<void> {
  validarId(perfilLocalId); validarId(perfilContaId);
  if (perfilLocalId === perfilContaId) return;
  await importarPerfil(perfilContaId, await exportarPerfil(perfilLocalId));
}
