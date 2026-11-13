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
