import { describe, expect, it } from 'vitest';
import { restringirApisPython } from './restringirApisPython';

describe('restrições de APIs do worker Python', () => {
  it('remove o getter original em toda a cadeia sem invocá-lo', () => {
    let leituras = 0;
    const prototipo = Object.create(null);
    Object.defineProperty(prototipo, 'indexedDB', { configurable: true, get: () => { leituras++; return 'dados privados'; } });
    const contexto = Object.create(prototipo);
    restringirApisPython(contexto);
    expect(contexto.indexedDB).toBeUndefined();
    expect(leituras).toBe(0);
    expect(Object.getOwnPropertyDescriptor(prototipo, 'indexedDB')).toMatchObject({ value: undefined, writable: false, configurable: false });
    expect(Object.getOwnPropertyDescriptor(prototipo, 'indexedDB')?.get).toBeUndefined();
    expect(() => Object.defineProperty(contexto, 'indexedDB', { value: 'recuperado' })).toThrow();
  });
  it('recusa inicialização se uma API herdada não pode ser removida', () => {
    const prototipo = Object.create(null);
    Object.defineProperty(prototipo, 'indexedDB', { configurable: false, get: () => 'dados privados' });
    expect(() => restringirApisPython(Object.create(prototipo))).toThrow('Python indisponível: não foi possível bloquear a API indexedDB neste navegador.');
  });
});
