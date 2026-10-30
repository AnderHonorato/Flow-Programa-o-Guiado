import type { Aula } from '../../../../contratos/tipos';
import { lerRecursoLocal, listarRecursosLocais, removerRecursoLocal, salvarRecursoLocal } from './armazenamento';

export interface PacoteAulas { id: string; titulo: string; aulas: Aula[]; recursos?: string[] }
export interface PacoteInstalado extends PacoteAulas { cache: string; bytes: number; baixadoEm: string }
export const pacotePython:PacoteAulas={
  id:'python-runtime-0.29.3',titulo:'Python local · Pyodide 0.29.3',aulas:[],
  recursos:['pyodide.js','pyodide.mjs','pyodide.asm.js','pyodide.asm.wasm','python_stdlib.zip','pyodide-lock.json'].map(nome=>`/pyodide/${nome}`),
};
const operacoes = new Map<string, Promise<unknown>>();

function chavePacote(id: string) {
  if (!id.trim() || id.length > 200) throw new Error('Identificador de pacote inválido.');
  return `pacote:${id}`;
}
function urlPublica(caminho: string) {
  const url = new URL(caminho, location.origin);
  if (url.origin !== location.origin || url.username || url.password || /^\/api(?:\/|$)/.test(url.pathname) || !/^https?:$/.test(url.protocol)) {
    throw new Error('Pacotes aceitam somente arquivos públicos da aplicação. A API e origens externas não são armazenadas.');
  }
  return url.href;
}

function serializar<T>(perfilId: string, id: string, executar: () => Promise<T>): Promise<T> {
  const chave = `${perfilId}:${id}`;
  const anterior = operacoes.get(chave) ?? Promise.resolve();
  const operacao = anterior.catch(() => {}).then(executar);
  operacoes.set(chave, operacao);
  void operacao.finally(() => { if (operacoes.get(chave) === operacao) operacoes.delete(chave); }).catch(() => {});
  return operacao;
}

/** Uma instalação incompleta não substitui uma versão pronta para uso offline. */
export function baixarPacote(perfilId: string, pacote: PacoteAulas, aoProgresso?: (prontas: number, total: number) => void): Promise<PacoteInstalado> {
  return serializar(perfilId, pacote.id, async () => {
    const chave = chavePacote(pacote.id);
    const recursos = [...new Set((pacote.recursos ?? []).map(urlPublica))];
    if (typeof caches === 'undefined') throw new Error('Downloads offline exigem HTTPS e suporte a CacheStorage neste dispositivo.');
    const anterior = await lerRecursoLocal<PacoteInstalado>(perfilId, chave);
    const nomeCache = `flow-pacote-${crypto.randomUUID()}`;
    let bytes = new TextEncoder().encode(JSON.stringify(pacote.aulas)).byteLength;
    try {
      const cache = await caches.open(nomeCache);
      let prontas = 0;
      aoProgresso?.(prontas, recursos.length);
      for (const url of recursos) {
        const resposta = await fetch(url, { credentials: 'omit', cache: 'no-cache' });
        if (!resposta.ok || resposta.type === 'opaque') throw new Error(`Não foi possível baixar o recurso ${new URL(url).pathname}. O pacote anterior foi preservado.`);
        if (resposta.url) urlPublica(resposta.url);
        bytes += (await resposta.clone().arrayBuffer()).byteLength;
        await cache.put(url, resposta);
        aoProgresso?.(++prontas, recursos.length);
      }
      const instalado: PacoteInstalado = { ...pacote, recursos, bytes, cache: nomeCache, baixadoEm: new Date().toISOString() };
      await salvarRecursoLocal(perfilId, chave, instalado);
      if (anterior?.cache) await caches.delete(anterior.cache).catch(() => false);
      return instalado;
    } catch (erro) {
      await caches.delete(nomeCache).catch(() => false);
      throw erro;
    }
  });
}

export async function listarPacotes(perfilId: string): Promise<PacoteInstalado[]> {
  return (await listarRecursosLocais(perfilId)).filter(r => r.chave.startsWith('pacote:')).map(r => r.conteudo as PacoteInstalado);
}

export function removerPacote(perfilId: string, id: string): Promise<void> {
  return serializar(perfilId, id, async () => {
    const chave = chavePacote(id);
    const pacote = await lerRecursoLocal<PacoteInstalado>(perfilId, chave);
    if (pacote?.cache && typeof caches !== 'undefined') await caches.delete(pacote.cache);
    await removerRecursoLocal(perfilId, chave);
  });
}

export async function consultarEspaco(): Promise<{ usado?: number; cota?: number; persistente: boolean }> {
  if (typeof navigator === 'undefined' || !navigator.storage) return { persistente: false };
  const [estimativa, persistente] = await Promise.all([navigator.storage.estimate(), navigator.storage.persisted?.() ?? false]);
  return { usado: estimativa.usage, cota: estimativa.quota, persistente };
}

/** Chame após ação do aluno; o navegador pode recusar o pedido. */
export async function solicitarArmazenamentoPersistente(): Promise<boolean> {
  return typeof navigator !== 'undefined' && Boolean(await navigator.storage?.persist?.());
}
