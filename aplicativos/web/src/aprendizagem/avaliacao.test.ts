import { describe, expect, it } from 'vitest';
import { analisar, escolher } from './avaliacao';
import { catalogoIncluido } from '../offline/catalogo';

const aula = catalogoIncluido.trilhas.flatMap(t=>t.modulos.flatMap(m=>m.aulas)).find(a=>a.id==='html-primeira-pagina')!;

describe('avaliação definitiva com correção ao enviar', () => {
  it('preserva a primeira escolha mesmo diante de toques rápidos ou repetidos', () => {
    const id=aula.questoes[0].id;
    const primeira=escolher(aula, undefined, id, 1);
    expect(primeira.escolhas[id]).toBe(1);
    expect(escolher(aula, primeira, id, 0)).toBe(primeira);
    expect(escolher(aula, primeira, id, 1)).toBe(primeira);
  });
  it('ignora questão inexistente, índices negativos, fracionários e fora das alternativas', () => {
    const prova={escolhas:{}};
    for(const indice of [-1,.5,1000,NaN,Infinity]) expect(escolher(aula,prova,aula.questoes[0].id,indice)).toBe(prova);
    expect(escolher(aula,prova,'questao-inexistente',0)).toBe(prova);
    expect(prova.escolhas).toEqual({});
  });
  it('não permite acrescentar ou mudar escolhas depois do envio', () => {
    const prova={escolhas:{[aula.questoes[0].id]:0},enviadaEm:'2026-10-28T12:00:00.000Z'};
    expect(escolher(aula,prova,aula.questoes[0].id,1)).toBe(prova);
    expect(escolher(aula,prova,aula.questoes[1].id,0)).toBe(prova);
  });
  it('mantém enunciados, índices e nota da versão iniciada quando o catálogo é atualizado', () => {
    const primeira=escolher(aula,undefined,aula.questoes[0].id,0);
    const atualizada=structuredClone(aula);
    atualizada.questoes=[{id:'questao-nova',enunciado:'Uma questão da nova edição',alternativas:[{texto:'Novo conteúdo',correta:true,feedback:'Explicação nova'}]}];
    const segunda=escolher(atualizada,primeira,aula.questoes[1].id,0);
    expect(segunda.escolhas[aula.questoes[1].id]).toBe(0);
    expect(segunda.correcao?.map(q=>q.id)).toEqual(aula.questoes.map(q=>q.id));
    const resultado=analisar(atualizada,segunda);
    expect(resultado.completa).toBe(true);expect(resultado.total).toBe(2);
    expect(resultado.nota).toBe(analisar(aula,segunda).nota);
    expect(escolher(atualizada,segunda,'questao-nova',0)).toBe(segunda);
  });
  it('não considera uma avaliação incompleta ou inválida pronta para enviar', () => {
    expect(analisar(aula,{escolhas:{}}).completa).toBe(false);
    expect(analisar(aula,{escolhas:{[aula.questoes[0].id]:0}}).completa).toBe(false);
    const escolhas=Object.fromEntries(aula.questoes.map(q=>[q.id,999]));
    expect(analisar(aula,{escolhas}).completa).toBe(false);
    expect(analisar(aula,{escolhas}).nota).toBe(0);
  });
  it('pontua escolhas definitivas e identifica a solução explicada para cada erro', () => {
    const escolhas=Object.fromEntries(aula.questoes.map((q,i)=>[q.id,q.alternativas.findIndex(a=>i===0?!a.correta:a.correta)]));
    const resultado=analisar(aula,{escolhas});
    expect(resultado.completa).toBe(true);expect(resultado.total).toBe(2);expect(resultado.acertos).toBe(1);expect(resultado.nota).toBe(50);
    expect(resultado.itens[0].correta).toBe(false);
    expect(resultado.itens[0].esperada.correta).toBe(true);
    expect(resultado.itens[0].esperada.feedback.length).toBeGreaterThan(10);
    expect(resultado.itens[1].correta).toBe(true);
  });
  it('alcança zero ou cem pontos sem criar questões extras a partir do armazenamento', () => {
    for(const correta of [false,true]) {
      const escolhas={inexistente:0,...Object.fromEntries(aula.questoes.map(q=>[q.id,q.alternativas.findIndex(a=>a.correta===correta)]))};
      const resultado=analisar(aula,{escolhas});
      expect(resultado.nota).toBe(correta?100:0);expect(resultado.total).toBe(aula.questoes.length);
    }
  });
});
