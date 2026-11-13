import { describe, expect, it } from 'vitest';
import { moverCursorUnicode } from './moverCursorUnicode';

describe('teclas rápidas de navegação Unicode', () => {
  it('move normalmente entre caracteres ASCII', () => {
    expect(moverCursorUnicode('abc', 1, 1)).toBe(2);
    expect(moverCursorUnicode('abc', 2, -1)).toBe(1);
  });
  it('não divide emoji UTF-16 ao avançar ou retroceder', () => {
    const texto = 'a😀b';
    expect(moverCursorUnicode(texto, 1, 1)).toBe(3);
    expect(moverCursorUnicode(texto, 3, -1)).toBe(1);
  });
  it('respeita limites do documento', () => {
    expect(moverCursorUnicode('a😀', 0, -1)).toBe(0);
    expect(moverCursorUnicode('a😀', 3, 1)).toBe(3);
  });
  it('não ultrapassa caracteres BMP e quebras de linha', () => {
    expect(moverCursorUnicode('á\n中', 1, 1)).toBe(2);
    expect(moverCursorUnicode('á\n中', 2, -1)).toBe(1);
  });
});


describe('navegação por grafemas compostos', () => {
  it('mantém acento combinante junto da letra', () => {
    const texto = 'a' + 'e\u0301' + 'b';
    expect(moverCursorUnicode(texto, 1, 1)).toBe(3);
    expect(moverCursorUnicode(texto, 3, -1)).toBe(1);
  });
  it('não entra no meio de emoji com modificador de pele', () => {
    const texto = 'a👍🏽b';
    expect(moverCursorUnicode(texto, 1, 1)).toBe(5);
    expect(moverCursorUnicode(texto, 5, -1)).toBe(1);
  });
  it('não separa emoji familiar com ZWJ', () => {
    const emoji = '👨‍👩‍👧';
    const texto = 'x' + emoji + 'y';
    expect(moverCursorUnicode(texto, 1, 1)).toBe(1 + emoji.length);
    expect(moverCursorUnicode(texto, 1 + emoji.length, -1)).toBe(1);
  });
  it('navega entre linhas sem saltar caracteres', () => {
    expect(moverCursorUnicode('ab\ncd', 2, 1)).toBe(3);
    expect(moverCursorUnicode('ab\ncd', 3, -1)).toBe(2);
  });
  it('normaliza posições internas e entradas não finitas', () => {
    expect(moverCursorUnicode('a😀b', 2, 1)).toBe(3);
    expect(moverCursorUnicode('a😀b', 2, -1)).toBe(1);
    expect(moverCursorUnicode('abc', Number.NaN, 1)).toBe(1);
  });
});
