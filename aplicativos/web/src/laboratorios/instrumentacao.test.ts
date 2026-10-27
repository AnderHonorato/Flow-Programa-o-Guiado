import { describe, expect, it } from 'vitest';
import { instrumentarJavascript } from './instrumentacao';
describe('limites do JavaScript do laboratório', () => {
  function rodar(codigo: string) { let passos = 0; const guarda = () => { if (++passos > 100) throw Error('limite'); }; return new Function('guarda', instrumentarJavascript(codigo, 'guarda'))(guarda); }
  it('interrompe while, for e do/while', () => { for (const fonte of ['while(true){}', 'for(;;) console.log;', 'do {} while(true)']) expect(() => rodar(fonte)).toThrow('limite'); });
  it('interrompe recursão com funções e setas de expressão', () => { expect(() => rodar('function repetir(){repetir()} repetir()')).toThrow('limite'); expect(() => rodar('const repetir=()=>repetir();repetir()')).toThrow('limite'); });
  it('preserva loops finitos, continue e strings', () => { expect(() => rodar('let total=0;for(let i=0;i<4;i++){if(i===2)continue;total+=i} if(total!==4)throw Error("resultado");')).not.toThrow(); });
  it('não interpreta código dentro de strings', () => expect(instrumentarJavascript('console.log("while(true){}");', 'guarda')).toBe('console.log("while(true){}");'));
  it('rejeita JavaScript inválido antes de executar', () => expect(() => instrumentarJavascript('let = ;', 'guarda')).toThrow());
});
