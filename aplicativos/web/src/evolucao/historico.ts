import type { EstadoLocal } from '../offline/armazenamento';
import { conquistas, evolucao, niveis } from './regras';

export interface RegistroConquista {
  adquiridaEm?: string;
  registradaEm: string;
  origem: 'conquista' | 'historico';
}
export type HistoricoConquistas = Record<string, RegistroConquista>;
export type EstadoRecompensas = Pick<EstadoLocal, 'aulasConcluidas' | 'respostas'> & { historicoConquistas?: HistoricoConquistas };

export function recompensas(estado: EstadoRecompensas) {
  const jornada = evolucao(estado);
  return [
    ...conquistas(estado).map(m => ({ ...m, tipo: 'emblema' as const })),
    ...niveis.slice(1).map((n, i) => ({ id: `nivel-${i + 2}`, nome: n.nome, descricao: `Chegar ao nível ${i + 2}, acumulando ${n.minimo} XP de aprendizagem. Um novo ícone de jornada fica disponível.`, obtido: jornada.indice >= i + 1, grau: i + 1, desenho: 'nucleo', tipo: 'nivel' as const })),
  ];
}

/** Não atribui uma data de aquisição inventada ao progresso anterior à funcionalidade. */
export function registrarHistorico(antes: EstadoRecompensas, depois: EstadoRecompensas, agora = new Date().toISOString()): HistoricoConquistas {
  const anteriores = new Set(recompensas(antes).filter(m => m.obtido).map(m => m.id));
  const obtidas = new Set(recompensas(depois).filter(m => m.obtido).map(m => m.id));
  const registros = Object.fromEntries(Object.entries({ ...depois.historicoConquistas, ...antes.historicoConquistas }).filter(([id]) => obtidas.has(id)));
  for (const m of recompensas(depois)) {
    if (!m.obtido || registros[m.id]) continue;
    registros[m.id] = anteriores.has(m.id) ? { registradaEm: agora, origem: 'historico' } : { adquiridaEm: agora, registradaEm: agora, origem: 'conquista' };
  }
  return registros;
}

export function historicoValido(valor: unknown): valor is HistoricoConquistas {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return false;
  const ids = new Set(['primeira-conexao', 'primeira-criacao', 'base-solida', 'engenho', 'constelacao', 'universo', ...niveis.slice(1).map((_, i) => `nivel-${i + 2}`)]);
  const data = (v: unknown) => typeof v === 'string' && /T.*(?:Z|[+-]\d\d:\d\d)$/.test(v) && Number.isFinite(Date.parse(v));
  return Object.entries(valor).every(([id, r]) => ids.has(id) && r && typeof r === 'object' && data(r.registradaEm) && (r.origem === 'historico' && r.adquiridaEm === undefined || r.origem === 'conquista' && data(r.adquiridaEm)));
}

export function dataDaConquista(registro?: RegistroConquista) {
  return registro?.adquiridaEm ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(registro.adquiridaEm)) : 'Conquistado anteriormente · data original indisponível';
}
