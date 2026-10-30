import type { Aula, Questao } from '../../../../contratos/tipos';

export interface Avaliacao {
  escolhas: Record<string, number>;
  correcao?: Questao[];
  enviadaEm?: string;
  revisada?: boolean;
}

export function escolher(aula: Aula, atual: Avaliacao | undefined, questaoId: string, indice: number): Avaliacao {
  const prova = atual ?? { escolhas: {} };
  const questao = (atual?.correcao ?? aula.questoes).find(q => q.id === questaoId);
  if (prova.enviadaEm || prova.escolhas[questaoId] !== undefined || !questao || !Number.isInteger(indice) || !questao.alternativas[indice]) return prova;
  return { ...prova, correcao: prova.correcao ?? structuredClone(aula.questoes), escolhas: { ...prova.escolhas, [questaoId]: indice } };
}

export function analisar(aula: Aula, prova: Avaliacao) {
  const questoes = prova.correcao ?? aula.questoes;
  const completa = questoes.length > 0 && questoes.every(q => Number.isInteger(prova.escolhas[q.id]) && !!q.alternativas[prova.escolhas[q.id]]);
  const itens = questoes.map(q => ({ questao: q, escolha: prova.escolhas[q.id], correta: !!q.alternativas[prova.escolhas[q.id]]?.correta, esperada: q.alternativas.find(a => a.correta)! }));
  const acertos = itens.filter(i => i.correta).length;
  return { completa, itens, acertos, total: itens.length, nota: completa ? Math.round(acertos / itens.length * 100) : 0 };
}

/** A primeira escolha permanece, mesmo quando uma sincronização tenta substituí-la. */
export function combinarAvaliacoes(local: Record<string, Avaliacao> = {}, remoto: Record<string, Avaliacao> = {}) {
  const resultado: Record<string, Avaliacao> = {};
  for (const id of new Set([...Object.keys(local), ...Object.keys(remoto)])) {
    const a = local[id], b = remoto[id];
    if (!a || !b) { resultado[id] = a ?? b; continue; }
    const enviadaEm = a.enviadaEm ?? b.enviadaEm;
    resultado[id] = { ...b, ...a, correcao: a.correcao ?? b.correcao, escolhas: { ...b.escolhas, ...a.escolhas }, ...(enviadaEm ? { enviadaEm } : {}), ...(enviadaEm && (a.revisada || b.revisada) ? { revisada: true } : {}) };
  }
  return resultado;
}

/** Avaliações enviadas são a autoridade; um OR legado não pode converter erro em acerto. */
export function respostasDasAvaliacoes(respostas: Record<string, boolean>, avaliacoes: Record<string, Avaliacao> = {}) {
  const novas = { ...respostas };
  for (const [id, prova] of Object.entries(avaliacoes)) {
    for (const chave of Object.keys(novas)) if (chave.startsWith(`${id}:`)) delete novas[chave];
    if (prova.enviadaEm && prova.correcao) for (const q of prova.correcao) novas[`${id}:${q.id}`] = !!q.alternativas[prova.escolhas[q.id]]?.correta;
  }
  return novas;
}
