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
let renders:{perfilId:string;carregando:boolean;avaliacoes:Flow['estado']['avaliacoes']}[]=[];
function Hospedeiro(){flow=useFlow();renders.push({perfilId:flow.perfilId,carregando:flow.carregando,avaliacoes:flow.estado.avaliacoes});return null;}
function sessao(id:string):Sessao{return {token:`token-${id}`,usuario:{id,nome:`Pessoa ${id}`,email:`${id}@flow.test`,papel:'aluno'}};}
async function esperar(verificar:()=>void){for(let i=0;i<500;i++){await act(async()=>{await new Promise(r=>setTimeout(r,10));});try{verificar();return;}catch(e){if(i===499)throw e;}}}
async function montar(){await act(async()=>raiz.render(<Hospedeiro/>));await esperar(()=>expect(flow.carregando).toBe(false));}
beforeEach(()=>{
 Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});localStorage.clear();sessionStorage.clear();
 renders=[];
 vi.spyOn(navigator,'onLine','get').mockReturnValue(false);
 elemento=document.createElement('div');document.body.append(elemento);raiz=createRoot(elemento);
 vi.stubGlobal('fetch',async()=>new Response('{}'));
});
afterEach(async()=>{await act(async()=>raiz.unmount());elemento.remove();vi.unstubAllGlobals();vi.restoreAllMocks();});
describe('perfis, sessão e sincronização do hook',()=>{
 it('vincula somente o perfil local original e preserva os dados separados de A e B',async()=>{
  const local=crypto.randomUUID(),a=crypto.randomUUID(),b=crypto.randomUUID();localStorage.setItem('flow-id-local',local);
  await salvarEstado(local,{...estadoInicial(),respostas:{'q-local':true},xp:10});await montar();
  await act(async()=>{await flow.autenticar(sessao(a));});await esperar(()=>expect(flow.carregando).toBe(false));
  expect(flow.estado.xp).toBe(10);
  salvarProjeto(a,'aula-privada',{html:'rascunho privado A',css:'',js:''},[]);
  await act(async()=>flow.setEstado(e=>({...e,xp:110,aulasConcluidas:['aula-da-conta-a']})));
  await act(async()=>{await flow.enviar(catalogoIncluido.trilhas[0].modulos[0].aulas[0],{html:'projeto privado A',css:'',js:''});});
  await act(async()=>{await flow.sair();});await esperar(()=>expect(flow.carregando).toBe(false));
  expect(flow.perfilId).toBe(local);expect(flow.estado.xp).toBe(10);expect(flow.fila).toHaveLength(0);
  await act(async()=>{await flow.autenticar(sessao(b));});await esperar(()=>expect(flow.carregando).toBe(false));
  expect(flow.estado.xp).toBe(10);expect(flow.estado.aulasConcluidas).toEqual([]);expect(flow.fila).toHaveLength(0);
  expect(carregarProjeto(b,'aula-privada',{html:'inicial',css:'',js:''}).arquivos.html).toBe('inicial');
  expect(carregarProjeto(local,'aula-privada',{html:'inicial',css:'',js:''}).arquivos.html).toBe('inicial');
  expect(carregarProjeto(a,'aula-privada',{html:'inicial',css:'',js:''}).arquivos.html).toBe('rascunho privado A');
  expect((await lerEstado(a)).xp).toBe(110);expect(await listarFila(a)).toHaveLength(1);
 });
 it('marca 401 como sessão expirada sem apagar o perfil, progresso ou código',async()=>{
  const id=crypto.randomUUID();sessionStorage.setItem('flow-sessao',JSON.stringify(sessao(id)));
  await salvarEstado(id,{...estadoInicial(),respostas:Object.fromEntries(Array.from({length:8},(_,i)=>[`q-${i}`,true])),xp:80});
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

describe('respostas definitivas e recompensas do hook',()=>{
 const aula=catalogoIncluido.trilhas.flatMap(t=>t.modulos.flatMap(m=>m.aulas)).find(a=>a.id==='html-primeira-pagina')!;
 it('trava o primeiro toque sem revelar resultado nem conceder XP antes do envio completo',async()=>{
  await montar();const q1=aula.questoes[0],q2=aula.questoes[1];
  const errada=q1.alternativas.findIndex(a=>!a.correta),certa=q1.alternativas.findIndex(a=>a.correta);
  await act(async()=>{flow.escolherResposta(aula,q1.id,errada);flow.escolherResposta(aula,q1.id,certa);flow.enviarAvaliacao(aula);flow.revisarAvaliacao(aula);});
  expect(flow.estado.avaliacoes?.[aula.id].escolhas[q1.id]).toBe(errada);
  expect(flow.estado.avaliacoes?.[aula.id].enviadaEm).toBeUndefined();
  expect(flow.estado.avaliacoes?.[aula.id].revisada).toBeUndefined();
  expect(flow.estado.respostas).toEqual({});expect(flow.estado.xp).toBe(0);
  await act(async()=>flow.escolherResposta(aula,q2.id,q2.alternativas.findIndex(a=>a.correta)));
  expect(flow.estado.respostas).toEqual({});expect(flow.estado.xp).toBe(0);
  await act(async()=>{flow.enviarAvaliacao(aula);flow.enviarAvaliacao(aula);});
  expect(flow.estado.respostas[`${aula.id}:${q1.id}`]).toBe(false);
  expect(flow.estado.respostas[`${aula.id}:${q2.id}`]).toBe(true);
  expect(flow.estado.xp).toBe(10);
  const enviadaEm=flow.estado.avaliacoes?.[aula.id].enviadaEm;
  await act(async()=>{flow.escolherResposta(aula,q1.id,certa);flow.enviarAvaliacao(aula);});
  expect(flow.estado.avaliacoes?.[aula.id].escolhas[q1.id]).toBe(errada);
  expect(flow.estado.avaliacoes?.[aula.id].enviadaEm).toBe(enviadaEm);
  expect(flow.estado.xp).toBe(10);
 });
 it('preserva escolhas após desmontar e reabrir e só conclui depois de revisar a correção',async()=>{
  await montar();const perfil=flow.perfilId;
  await act(async()=>{for(const q of aula.questoes)flow.escolherResposta(aula,q.id,q.alternativas.findIndex(a=>a.correta));flow.enviarAvaliacao(aula);});
  expect(flow.estado.xp).toBe(20);
  await act(async()=>expect(flow.concluir(aula)).toBe(false));
  await esperar(()=>expect((flow.estado.avaliacoes?.[aula.id].enviadaEm)).toBeTruthy());
  await esperar(()=>expect(flow.carregando).toBe(false));
  await act(async()=>{await new Promise(r=>setTimeout(r,20));});
  await act(async()=>raiz.unmount());raiz=createRoot(elemento);
  await montar();expect(flow.perfilId).toBe(perfil);
  expect(flow.estado.avaliacoes?.[aula.id].enviadaEm).toBeTruthy();
  expect(Object.keys(flow.estado.avaliacoes?.[aula.id].escolhas??{})).toHaveLength(2);
  await act(async()=>flow.revisarAvaliacao(aula));
  await act(async()=>{expect(flow.concluir(aula)).toBe(true);expect(flow.concluir(aula)).toBe(true);});
  expect(flow.estado.aulasConcluidas).toEqual([aula.id]);expect(flow.estado.xp).toBe(120);
  await act(async()=>flow.enviarAvaliacao(aula));expect(flow.estado.xp).toBe(120);
 });
 it('usa escolhas e XP canônicos do servidor ao resolver avaliações divergentes',async()=>{
  const perfil=crypto.randomUUID();sessionStorage.setItem('flow-sessao',JSON.stringify(sessao(perfil)));
  const [q1,q2]=aula.questoes;
  const corretas=Object.fromEntries(aula.questoes.map(q=>[q.id,q.alternativas.findIndex(a=>a.correta)]));
  const errada=q1.alternativas.findIndex(a=>!a.correta);
  const local={...estadoInicial(),respostas:{[`${aula.id}:${q1.id}`]:true,[`${aula.id}:${q2.id}`]:true},xp:20,
   avaliacoes:{[aula.id]:{escolhas:corretas,correcao:structuredClone(aula.questoes),enviadaEm:'2026-10-28T13:00:00.000Z'}}};
  const remoto={...local,respostas:{[`${aula.id}:${q1.id}`]:false,[`${aula.id}:${q2.id}`]:true},xp:10,
   avaliacoes:{[aula.id]:{escolhas:{...corretas,[q1.id]:errada},correcao:structuredClone(aula.questoes),enviadaEm:'2026-10-28T12:00:00.000Z'}}};
  await salvarEstado(perfil,local);await montar();
  vi.spyOn(navigator,'onLine','get').mockReturnValue(true);
  vi.stubGlobal('fetch',async(url:string)=>new Response(JSON.stringify(url.endsWith('/progresso')?{estado:remoto}:[])));
  await act(async()=>{await flow.sincronizar();});
  expect(flow.estado.avaliacoes?.[aula.id].escolhas[q1.id]).toBe(errada);
  expect(flow.estado.avaliacoes?.[aula.id].enviadaEm).toBe('2026-10-28T12:00:00.000Z');
  expect(flow.estado.respostas[`${aula.id}:${q1.id}`]).toBe(false);
  expect(flow.estado.xp).toBe(10);expect((await lerEstado(perfil)).xp).toBe(10);
 });
 it('não transfere uma avaliação privada da conta A ao perfil local ou à conta B',async()=>{
  const a=crypto.randomUUID(),b=crypto.randomUUID();sessionStorage.setItem('flow-sessao',JSON.stringify(sessao(a)));
  await montar();
  await act(async()=>{flow.escolherResposta(aula,aula.questoes[0].id,0);});
  const callbacksA={escolher:flow.escolherResposta,enviar:flow.enviarAvaliacao,revisar:flow.revisarAvaliacao};
  await act(async()=>{await flow.sair();});await esperar(()=>expect(flow.carregando).toBe(false));
  expect(flow.estado.avaliacoes?.[aula.id]).toBeUndefined();
  await act(async()=>{await flow.autenticar(sessao(b));});await esperar(()=>expect(flow.carregando).toBe(false));
  await act(async()=>{callbacksA.escolher(aula,aula.questoes[1].id,0);callbacksA.enviar(aula);callbacksA.revisar(aula);});
  expect(flow.estado.avaliacoes?.[aula.id]).toBeUndefined();
  expect((await lerEstado(a)).avaliacoes?.[aula.id].escolhas[aula.questoes[0].id]).toBe(0);
  expect(renders.filter(r=>r.perfilId!==a&&!r.carregando).some(r=>r.avaliacoes?.[aula.id]!==undefined)).toBe(false);
 });
});

it('salva o avatar confirmado, preserva progresso e não permite callback de outra conta',async()=>{
 await montar();const local=flow.perfilId;
 const avatar={tipo:'desenho' as const,valor:'pixel-mago',atualizadoEm:'2026-10-29T12:00:00Z'};
 await act(async()=>{await flow.definirAvatar(avatar);});
 expect(flow.estado.avatar).toEqual(avatar);expect((await lerEstado(local)).avatar).toEqual(avatar);
 const callback=flow.definirAvatar;
 const id=crypto.randomUUID();await act(async()=>{await flow.autenticar(sessao(id));});await esperar(()=>expect(flow.carregando).toBe(false));
 expect(flow.estado.avatar).toEqual(avatar);
 await expect(callback({...avatar,valor:'games-ninja'})).rejects.toThrow('perfil');
 expect(flow.estado.avatar?.valor).toBe('pixel-mago');
 await act(async()=>{await flow.definirAvatar({...avatar,valor:'games-piloto',atualizadoEm:'2026-10-29T12:01:00Z'});});
 expect((await lerEstado(local)).avatar?.valor).toBe('pixel-mago');
 expect((await lerEstado(id)).avatar?.valor).toBe('games-piloto');
});
it('carimba novas conquistas uma vez e mantém as antigas sem data original',async()=>{
 const perfil=crypto.randomUUID();localStorage.setItem('flow-id-local',perfil);
 await salvarEstado(perfil,{...estadoInicial(),aulasConcluidas:['legado'],xp:100});await montar();
 expect(flow.estado.historicoConquistas?.['primeira-criacao']?.origem).toBe('historico');
 expect(flow.estado.historicoConquistas?.['primeira-criacao']?.adquiridaEm).toBeUndefined();
 const aula=catalogoIncluido.trilhas[0].modulos[0].aulas[0];
 await act(async()=>{for(const q of aula.questoes)flow.escolherResposta(aula,q.id,q.alternativas.findIndex(a=>a.correta));flow.enviarAvaliacao(aula);});
 const data=flow.estado.historicoConquistas?.['primeira-conexao']?.adquiridaEm;expect(data).toBeTruthy();
 await act(async()=>flow.enviarAvaliacao(aula));expect(flow.estado.historicoConquistas?.['primeira-conexao']?.adquiridaEm).toBe(data);
});
it('derruba a conta banida com motivo sem apagar dados e ignora notificações de outra sessão',async()=>{
 const id=crypto.randomUUID(),s=sessao(id);sessionStorage.setItem('flow-sessao',JSON.stringify(s));await salvarEstado(id,{...estadoInicial(),xp:100,aulasConcluidas:['aprendizado-salvo']});await montar();
 await act(async()=>window.dispatchEvent(new CustomEvent('flow:sessao-invalidada',{detail:{token:'outra-sessao',codigo:'CONTA_BANIDA',mensagem:'Conta banida.',motivo:'Não deve afetar'}})));
 expect(flow.sessao?.token).toBe(s.token);
 await act(async()=>window.dispatchEvent(new CustomEvent('flow:sessao-invalidada',{detail:{token:s.token,codigo:'CONTA_BANIDA',mensagem:'Conta banida.',motivo:'Motivo informado pela administração',ate:'2026-11-01T12:00:00Z'}})));
 await esperar(()=>expect(flow.carregando).toBe(false));expect(flow.sessao).toBeNull();expect(sessionStorage.getItem('flow-sessao')).toBeNull();expect(flow.perfilId).not.toBe(id);expect(flow.estado.aulasConcluidas).toEqual([]);expect(flow.aviso).toContain('Motivo informado');expect((await lerEstado(id)).aulasConcluidas).toContain('aprendizado-salvo');
});
