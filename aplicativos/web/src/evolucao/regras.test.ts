import { describe, expect, it } from 'vitest';
import { conquistas, evolucao, experiencia, iconeDisponivel, niveis } from './regras';

const estado = (aulas: number, corretas = 0) => ({ aulasConcluidas: Array.from({length:aulas}, (_,i)=>`aula-${i}`), respostas: Object.fromEntries(Array.from({length:corretas}, (_,i)=>[`q-${i}`,true])) });

describe('evolução por aprendizagem registrada', () => {
  it('começa no primeiro nível sem inventar conquistas', () => {
    const resultado = evolucao(estado(0));
    expect(resultado.numero).toBe(1); expect(resultado.xp).toBe(0); expect(resultado.percentual).toBe(0); expect(resultado.faltam).toBe(100);
    expect(conquistas(estado(0)).some(c=>c.obtido)).toBe(false);
  });
  it('não duplica XP por conclusão repetida nem recompensa erros ou valor declarado', () => {
    const resultado = { aulasConcluidas:['a','a','b'], respostas:{q1:true,q2:false}, xp:999999 };
    expect(experiencia(resultado)).toBe(210);
    expect(experiencia({...resultado})).toBe(210);
    expect(conquistas(resultado).find(c=>c.id==='base-solida')?.obtido).toBe(false);
  });
  it('desbloqueia cada nível exatamente no limiar e mantém o progresso limitado', () => {
    for (let i=1;i<niveis.length;i++) {
      const xp=niveis[i].minimo;
      expect(evolucao(estado(0,xp/10-1)).indice).toBe(i-1);
      expect(evolucao(estado(0,xp/10)).indice).toBe(i);
      expect(evolucao(estado(0,xp/10)).percentual).toBe(i===niveis.length-1?100:0);
    }
    const maximo=evolucao(estado(100));
    expect(maximo.numero).toBe(8);expect(maximo.proximo).toBeUndefined();expect(maximo.faltam).toBe(0);expect(maximo.percentual).toBe(100);
  });
  it('separa emblemas de acerto e de competência, sem premiar só abrir conteúdo', () => {
    const acerto=conquistas(estado(0,1));
    expect(acerto.filter(c=>c.obtido).map(c=>c.id)).toEqual(['primeira-conexao']);
    expect(conquistas(estado(20,1)).every(c=>c.obtido)).toBe(true);
    expect(conquistas(estado(9)).find(c=>c.id==='constelacao')?.atual).toBe(9);
  });
  it('não aceita ícones bloqueados, inválidos ou importados de um nível superior', () => {
    expect(iconeDisponivel(2,2)).toBe(2);
    for (const valor of [3,-1,8,1.5,'2',null,NaN,undefined]) expect(iconeDisponivel(valor,2)).toBe(0);
  });
});
