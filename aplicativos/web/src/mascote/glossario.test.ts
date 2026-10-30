import { describe, expect, it } from 'vitest';
import { explicarTermo, normalizarTermo, termoValido } from './glossario';
describe('glossário editorial de J.A.R.V.I.S', () => {
  it('reconhece acentos, siglas, plural e pontuação', () => {
    expect(normalizarTermo(' “VARIÁVEL,” ')).toBe('variavel');
    expect(explicarTermo('variável')?.mensagem).toContain('associa um nome');
    expect(explicarTermo('<HTML>')?.conhecida).toBe(true);
    expect(explicarTermo('funções')?.conhecida).toBe(true);
  });
  it('rejeita entradas excessivas ou inválidas', () => {
    expect(termoValido('a')).toBe(false);
    expect(explicarTermo('a'.repeat(81))).toBeNull();
    expect(explicarTermo('um dois tres quatro cinco seis sete oito nove')).toBeNull();
    expect(explicarTermo('html\u0000')).toBeNull();
  });
  it('usa contexto editorial limitado com declaração honesta para desconhecidos', () => {
    const resultado = explicarTermo('desconhecido', 'Uma frase do material.');
    expect(resultado?.conhecida).toBe(false);
    expect(resultado?.mensagem).toContain('ainda não tem uma definição');
    expect(resultado?.mensagem).toContain('Uma frase do material.');
    expect(explicarTermo('desconhecido', 'x'.repeat(500))?.mensagem.length).toBeLessThan(600);
  });
});
