// @vitest-environment jsdom
import {afterEach,describe,expect,it,vi} from 'vitest';
import {ErroApi,requisitar} from './api';
afterEach(()=>vi.unstubAllGlobals());
describe('notificações de acesso verificadas no servidor',()=>{
 it('mostra motivo/prazo ao titular e notifica a sessão que foi efetivamente usada',async()=>{
  const eventos:unknown[]=[];const ouvir=(e:Event)=>eventos.push((e as CustomEvent).detail);window.addEventListener('flow:sessao-invalidada',ouvir);
  vi.stubGlobal('fetch',async()=>new Response(JSON.stringify({detail:{codigo:'CONTA_BANIDA',mensagem:'Sua conta foi banida.',motivo:'Uso indevido do serviço',ate:'2026-11-01T12:00:00Z'}}),{status:403}));
  try{await expect(requisitar('/eu','sessao-qa')).rejects.toThrow('Uso indevido');expect(eventos).toEqual([expect.objectContaining({token:'sessao-qa',codigo:'CONTA_BANIDA',motivo:'Uso indevido do serviço'})]);}
  finally{window.removeEventListener('flow:sessao-invalidada',ouvir);}
 });
 it('não derruba uma conta por erro de permissão comum nem por login de outra pessoa',async()=>{
  const ouvir=vi.fn();window.addEventListener('flow:sessao-invalidada',ouvir);
  try{
   vi.stubGlobal('fetch',async()=>new Response(JSON.stringify({detail:'Ação exclusiva da administração.'}),{status:403}));await expect(requisitar('/admin/usuarios','token')).rejects.toBeInstanceOf(ErroApi);
   vi.stubGlobal('fetch',async()=>new Response(JSON.stringify({detail:{codigo:'CONTA_BANIDA',mensagem:'Conta banida.',motivo:'Motivo de teste'}}),{status:403}));await expect(requisitar('/sessao',undefined,{method:'POST'})).rejects.toThrow('Motivo de teste');expect(ouvir).not.toHaveBeenCalled();
  }finally{window.removeEventListener('flow:sessao-invalidada',ouvir);}
 });
});
