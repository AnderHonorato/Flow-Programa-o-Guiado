// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { AvatarEvolucao, GaleriaEvolucao } from './Evolucao';
import type { AvatarPerfil } from '../perfil/avatar';
const dados=vi.hoisted(()=>new Map<string,unknown>());
vi.mock('../offline/armazenamento',()=>({lerRecursoLocal:vi.fn(async(perfil:string,chave:string)=>dados.get(`${perfil}:${chave}`))}));
let elemento:HTMLDivElement;
let raiz:ReturnType<typeof createRoot>;
const estado={aulasConcluidas:['aula-1'],respostas:{}};
beforeEach(()=>{dados.clear();Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});elemento=document.createElement('div');document.body.append(elemento);raiz=createRoot(elemento);});
afterEach(async()=>{await act(async()=>raiz.unmount());elemento.remove();});
it('preserva o ícone legado e isola sua leitura ao trocar de perfil',async()=>{
 dados.set('a:evolucao:icone',1);
 await act(async()=>raiz.render(<AvatarEvolucao perfilId="a" estado={estado}/>));
 expect(elemento.querySelector('.evo-avatar')?.getAttribute('title')).toBe('Ícone Explorador');
 await act(async()=>raiz.render(<AvatarEvolucao perfilId="b" estado={estado}/>));
 expect(elemento.querySelector('.evo-avatar')?.getAttribute('title')).toBe('Ícone Faísca');
});
it('usa o novo desenho sincronizado e bloqueia emblema importado acima do nível',async()=>{
 const avatar:AvatarPerfil={tipo:'desenho',valor:'pixel-mago',atualizadoEm:'2026-10-29T12:00:00Z'};
 await act(async()=>raiz.render(<AvatarEvolucao perfilId="a" estado={{...estado,avatar}}/>));
 expect(elemento.querySelector('.perfil-desenho--pixel')).not.toBeNull();
 await act(async()=>raiz.render(<AvatarEvolucao perfilId="a" estado={{...estado,avatar:{...avatar,tipo:'emblema',valor:'7'}}}/>));
 expect(elemento.querySelector('.evo-avatar')?.getAttribute('title')).toBe('Ícone Faísca');
});
it('expõe descrição e data histórica sem inventar data de aquisição',async()=>{
 await act(async()=>raiz.render(<GaleriaEvolucao perfilId="a" estado={estado}/>));
 expect(elemento.textContent).toContain('Registrar a competência de uma aula.');
 expect(elemento.textContent).toContain('data original indisponível');
 expect(elemento.querySelectorAll('.recompensa-cartao')).toHaveLength(6);
});
