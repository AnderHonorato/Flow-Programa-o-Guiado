import { describe, expect, it } from 'vitest';
import { atualizarRevisao, revisoesPendentes, gerarVariacao } from './revisao';

describe('revisão espaçada adaptável', () => {
  const agora = new Date('2026-10-25T12:00:00.000Z');
  it('agenda primeira revisão para o dia seguinte e amplia o intervalo com acertos', () => {
    expect(atualizarRevisao(undefined, 'correta', agora)).toEqual({ etapa: 0, proxima: '2026-10-26T12:00:00.000Z' });
    expect(atualizarRevisao({ etapa: 0, proxima: agora.toISOString() }, 'correta', agora)).toEqual({ etapa: 1, proxima: '2026-10-28T12:00:00.000Z' });
  });
  it('reduz o intervalo após dificuldade e prioriza erros vencidos sem punir o aluno', () => {
    expect(atualizarRevisao({ etapa: 3, proxima: agora.toISOString() }, 'incorreta', agora)).toEqual({ etapa: 0, proxima: '2026-10-26T12:00:00.000Z' });
    const estado = { aulasConcluidas: [], respostas: { a: false, b: true }, revisoes: { a: { etapa: 0, proxima: '2026-10-24T12:00:00.000Z' }, b: { etapa: 1, proxima: '2026-10-25T12:00:00.000Z' }, c: { etapa: 1, proxima: '2026-11-25T12:00:00.000Z' } }, xp: 0, ultimaAula: '' };
    expect(revisoesPendentes(estado, agora).map(r => r.id)).toEqual(['a', 'b']);
  });
  it('gera variações reprodutíveis e alterna o formato dentro da mesma competência', () => {
    const primeira = gerarVariacao('html-semantico', 42, 0);
    expect(gerarVariacao('html-semantico', 42, 0)).toEqual(primeira);
    expect(gerarVariacao('html-semantico', 42, 1).formato).not.toBe(primeira.formato);
    expect(gerarVariacao('html-semantico', 42, 1).competencia).toBe('html-semantico');
    expect(primeira.enunciado.length).toBeGreaterThan(20);
    expect(primeira.resposta).toBeTruthy();
  });
});
