// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { CelebracaoEvolucao, GaleriaEvolucao } from './Evolucao';
const dados=vi.hoisted(()=>new Map<string,unknown>());
vi.mock('../offline/armazenamento',()=>({lerRecursoLocal:vi.fn(async(perfil:string,chave:string)=>dados.get(`${perfil}:${chave}`)),salvarRecursoLocal:vi.fn(async(perfil:string,chave:string,valor:unknown)=>{dados.set(`${perfil}:${chave}`,valor);})}));
let elemento:HTMLDivElement;
let raiz:ReturnType<typeof createRoot>;
const estado={aulasConcluidas:['aula-1'],respostas:{}};
const botao=(nome:string)=>elemento.querySelector<HTMLButtonElement>(`button[aria-label^="${nome}:"]`)!;
beforeEach(()=>{dados.clear();Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});elemento=document.createElement('div');document.body.append(elemento);raiz=createRoot(elemento);});
afterEach(async()=>{await act(async()=>raiz.unmount());elemento.remove();});

it('permite equipar um ícone conquistado, preserva ao reabrir e bloqueia os demais',async()=>{
  await act(async()=>raiz.render(<GaleriaEvolucao perfilId="perfil-a" estado={estado}/>));
  expect(botao('Explorador').disabled).toBe(false);expect(botao('Construtor').disabled).toBe(true);
  await act(async()=>botao('Construtor').click());expect(dados.size).toBe(0);
  await act(async()=>botao('Explorador').click());
  expect(botao('Explorador').getAttribute('aria-pressed')).toBe('true');
  expect(dados.get('perfil-a:evolucao:icone')).toBe(1);
  await act(async()=>raiz.render(<GaleriaEvolucao key="reabrir" perfilId="perfil-a" estado={estado}/>));
  expect(botao('Explorador').getAttribute('aria-pressed')).toBe('true');
});
it('a escolha de avatar de um perfil não aparece em outro',async()=>{
  dados.set('perfil-a:evolucao:icone',1);
  await act(async()=>raiz.render(<GaleriaEvolucao perfilId="perfil-a" estado={estado}/>));
  expect(botao('Explorador').getAttribute('aria-pressed')).toBe('true');
  await act(async()=>raiz.render(<GaleriaEvolucao perfilId="perfil-b" estado={estado}/>));
  expect(botao('Faísca').getAttribute('aria-pressed')).toBe('true');
  expect(dados.get('perfil-a:evolucao:icone')).toBe(1);
});
it('comemora uma evolução nova, sem disparar por hidratação ou troca de perfil',async()=>{
  const vazio={aulasConcluidas:[],respostas:{}};
  await act(async()=>raiz.render(<CelebracaoEvolucao perfilId="a" estado={vazio} pronto={false}/>));
  await act(async()=>raiz.render(<CelebracaoEvolucao perfilId="a" estado={estado}/>));
  expect(elemento.querySelector('.evo-celebracao')).toBeNull();
  await act(async()=>raiz.render(<CelebracaoEvolucao perfilId="a" estado={{aulasConcluidas:['a','b','c'],respostas:{}}}/>));
  expect(elemento.textContent).toContain('Construtor');
  await act(async()=>elemento.querySelector<HTMLButtonElement>('button')!.click());
  expect(elemento.querySelector('.evo-celebracao')).toBeNull();
  await act(async()=>raiz.render(<CelebracaoEvolucao perfilId="b" estado={{aulasConcluidas:['a','b','c','d','e','f'],respostas:{}}}/>));
  expect(elemento.querySelector('.evo-celebracao')).toBeNull();
});
