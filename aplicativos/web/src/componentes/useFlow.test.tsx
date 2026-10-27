// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import {act} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {useFlow,type Flow} from './useFlow';
import {catalogoIncluido} from '../offline/catalogo';
import {estadoInicial,lerEstado,listarFila,salvarEstado} from '../offline/armazenamento';
import type {Sessao} from './api';
import {carregarProjeto,salvarProjeto} from '../laboratorios/armazenamento';
let raiz:Root,elemento:HTMLDivElement,flow:Flow;
function Hospedeiro(){flow=useFlow();return null;}
function sessao(id:string):Sessao{return {token:`token-${id}`,usuario:{id,nome:`Pessoa ${id}`,email:`${id}@flow.test`,papel:'aluno'}};}
async function esperar(verificar:()=>void){for(let i=0;i<500;i++){await act(async()=>{await new Promise(r=>setTimeout(r,10));});try{verificar();return;}catch(e){if(i===499)throw e;}}}
async function montar(){await act(async()=>raiz.render(<Hospedeiro/>));await esperar(()=>expect(flow.carregando).toBe(false));}
beforeEach(()=>{
 Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});localStorage.clear();sessionStorage.clear();
 vi.spyOn(navigator,'onLine','get').mockReturnValue(false);
 elemento=document.createElement('div');document.body.append(elemento);raiz=createRoot(elemento);
 vi.stubGlobal('fetch',async()=>new Response('{}'));
});
afterEach(async()=>{await act(async()=>raiz.unmount());elemento.remove();vi.unstubAllGlobals();vi.restoreAllMocks();});
describe('perfis, sessão e sincronização do hook',()=>{
 it('vincula somente o perfil local original e preserva os dados separados de A e B',async()=>{
  const local=crypto.randomUUID(),a=crypto.randomUUID(),b=crypto.randomUUID();localStorage.setItem('flow-id-local',local);
  await salvarEstado(local,{...estadoInicial(),xp:10});await montar();
  await act(async()=>{await flow.autenticar(sessao(a));});await esperar(()=>expect(flow.carregando).toBe(false));
  expect(flow.estado.xp).toBe(10);
  salvarProjeto(a,'aula-privada',{html:'rascunho privado A',css:'',js:''},[]);
  await act(async()=>flow.setEstado(e=>({...e,xp:50,aulasConcluidas:['aula-da-conta-a']})));
  await act(async()=>{await flow.enviar(catalogoIncluido.trilhas[0].modulos[0].aulas[0],{html:'projeto privado A',css:'',js:''});});
  await act(async()=>{await flow.sair();});await esperar(()=>expect(flow.carregando).toBe(false));
  expect(flow.perfilId).toBe(local);expect(flow.estado.xp).toBe(10);expect(flow.fila).toHaveLength(0);
  await act(async()=>{await flow.autenticar(sessao(b));});await esperar(()=>expect(flow.carregando).toBe(false));
  expect(flow.estado.xp).toBe(10);expect(flow.estado.aulasConcluidas).toEqual([]);expect(flow.fila).toHaveLength(0);
  expect(carregarProjeto(b,'aula-privada',{html:'inicial',css:'',js:''}).arquivos.html).toBe('inicial');
  expect(carregarProjeto(local,'aula-privada',{html:'inicial',css:'',js:''}).arquivos.html).toBe('inicial');
  expect(carregarProjeto(a,'aula-privada',{html:'inicial',css:'',js:''}).arquivos.html).toBe('rascunho privado A');
  expect((await lerEstado(a)).xp).toBe(50);expect(await listarFila(a)).toHaveLength(1);
 });
 it('marca 401 como sessão expirada sem apagar o perfil, progresso ou código',async()=>{
  const id=crypto.randomUUID();sessionStorage.setItem('flow-sessao',JSON.stringify(sessao(id)));
  await salvarEstado(id,{...estadoInicial(),xp:80});
  vi.spyOn(navigator,'onLine','get').mockReturnValue(true);
  vi.stubGlobal('fetch',async(url:string)=>url.endsWith('/catalogo')?new Response(JSON.stringify({catalogo:catalogoIncluido})):new Response('{}',{status:401}));
  await montar();await esperar(()=>expect(flow.sessaoExpirada).toBe(true));
  expect(flow.sessao?.usuario.id).toBe(id);expect(flow.perfilId).toBe(id);expect(flow.estado.xp).toBe(80);expect(flow.aviso).toContain('Sessão expirada');
  expect((await lerEstado(id)).xp).toBe(80);expect(sessionStorage.getItem('flow-sessao')).not.toBeNull();
 });
 it('recupera catálogo publicado e mantém a cópia após perda de conexão',async()=>{
  const remoto=structuredClone(catalogoIncluido);remoto.trilhas[0].titulo='Catálogo remoto publicado';
  vi.spyOn(navigator,'onLine','get').mockReturnValue(true);vi.stubGlobal('fetch',async()=>new Response(JSON.stringify({catalogo:remoto})));
  await montar();await esperar(()=>expect(flow.catalogo.trilhas[0].titulo).toBe('Catálogo remoto publicado'));
  vi.spyOn(navigator,'onLine','get').mockReturnValue(false);
  await act(async()=>{window.dispatchEvent(new Event('offline'));});
  await esperar(()=>expect(flow.catalogo.trilhas[0].titulo).toBe('Catálogo remoto publicado'));
  expect(flow.aulas.length).toBeGreaterThan(0);
 });
});
