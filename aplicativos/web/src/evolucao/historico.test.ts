import { describe, expect, it } from 'vitest';
import { registrarHistorico, historicoValido, recompensas, dataDaConquista } from './historico';
const vazio = { aulasConcluidas: [], respostas: {} };
const momento = '2026-10-29T12:00:00.000Z';
describe('aquisição de recompensas', () => {
  it('registra todos os emblemas e níveis de uma transição no mesmo instante', () => {
    const depois = { aulasConcluidas: ['a', 'b', 'c'], respostas: { q: true } };
    const h = registrarHistorico(vazio, depois, momento);
    expect(Object.keys(h).sort()).toEqual(['primeira-conexao', 'primeira-criacao', 'base-solida', 'nivel-2', 'nivel-3'].sort());
    expect(Object.values(h).every(r => r.adquiridaEm === momento && r.origem === 'conquista')).toBe(true);
    expect(historicoValido(h)).toBe(true);
  });
  it('não altera a data ao repetir ação, reabrir ou receber um registro divergente', () => {
    const depois = { aulasConcluidas: ['a'], respostas: {} };
    const h = registrarHistorico(vazio, depois, momento);
    const antigo = { ...depois, historicoConquistas: h };
    const forjado = { ...depois, historicoConquistas: { ...h, 'primeira-criacao': { adquiridaEm: '2026-10-30T12:00:00Z', registradaEm: '2026-10-30T12:00:00Z', origem: 'conquista' as const } } };
    expect(registrarHistorico(antigo, forjado, '2026-10-31T12:00:00Z')).toEqual(h);
  });
  it('não inventa aquisição para conquistas anteriores à atualização', () => {
    const antigo = { aulasConcluidas: ['a'], respostas: { q: true } };
    const h = registrarHistorico(antigo, antigo, momento);
    expect(h['primeira-criacao']).toEqual({ registradaEm: momento, origem: 'historico' });
    expect(dataDaConquista(h['primeira-criacao'])).toContain('data original indisponível');
    expect(registrarHistorico({ ...antigo, historicoConquistas: h }, antigo, '2026-10-30T12:00:00Z')).toEqual(h);
  });
  it('não cria prêmios por abrir conteúdo e valida IDs e datas', () => {
    expect(registrarHistorico(vazio, vazio, momento)).toEqual({});
    expect(recompensas(vazio).every(r => !r.obtido)).toBe(true);
    expect(historicoValido({ inventado: { adquiridaEm: momento, registradaEm: momento, origem: 'conquista' } })).toBe(false);
    expect(historicoValido({ 'primeira-criacao': { registradaEm: momento, origem: 'conquista' } })).toBe(false);
    expect(historicoValido({ 'primeira-criacao': { adquiridaEm: momento, registradaEm: momento, origem: 'historico' } })).toBe(false);
  });
});
