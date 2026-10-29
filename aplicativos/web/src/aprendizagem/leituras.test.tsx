// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {guardarLeitura,enviarLeituras,useRegistroLeitura} from './useRegistroLeitura';
import {listarRecursosLocais} from '../offline/armazenamento';
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();vi.useRealTimers();});
describe('leituras reais e fila separada por perfil',()=>{
 it('persiste offline, deduplica envios concorrentes e conserva filas de outra conta',async()=>{
  const a=crypto.randomUUID(),b=crypto.randomUUID();await guardarLeitura(a,'html-primeira-pagina');await guardarLeitura(b,'css-estilos');
  const enviar=vi.fn(async()=>new Response(null,{status:204}));vi.stubGlobal('fetch',enviar);
  await Promise.all([enviarLeituras(a,'token-a'),enviarLeituras(a,'token-a')]);
  expect(enviar).toHaveBeenCalledTimes(1);expect((await listarRecursosLocais(a)).filter(r=>r.chave.startsWith('leitura-pendente'))).toHaveLength(0);expect((await listarRecursosLocais(b)).filter(r=>r.chave.startsWith('leitura-pendente'))).toHaveLength(1);
 });
 it('mantém o mesmo id após falha de rede e não envia uma sessão que já mudou',async()=>{
  const id=crypto.randomUUID();await guardarLeitura(id,'html-primeira-pagina');
  const enviar=vi.fn(async()=>{throw new TypeError('Sem conexão');});vi.stubGlobal('fetch',enviar);
  await expect(enviarLeituras(id,'token')).rejects.toThrow('Sem conexão');const fila=await listarRecursosLocais(id);expect(fila).toHaveLength(1);
  await enviarLeituras(id,'token',()=>false);expect(enviar).toHaveBeenCalledTimes(1);expect((await listarRecursosLocais(id))[0].conteudo).toEqual(fila[0].conteudo);
 });
 it('só registra depois de 20 segundos visíveis, uma vez por visita',async()=>{
  Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});vi.useFakeTimers({toFake:['setInterval','clearInterval','Date']});let oculta=false;vi.spyOn(document,'hidden','get').mockImplementation(()=>oculta);
  const perfil=crypto.randomUUID(),e=document.createElement('div');document.body.append(e);const raiz=createRoot(e);
  function Sonda(){useRegistroLeitura(perfil,'html-primeira-pagina',true);return null;}
  try{
   await act(async()=>raiz.render(<Sonda/>));await act(async()=>vi.advanceTimersByTime(19000));expect(await listarRecursosLocais(perfil)).toHaveLength(0);
   oculta=true;await act(async()=>vi.advanceTimersByTime(30000));expect(await listarRecursosLocais(perfil)).toHaveLength(0);
   oculta=false;await act(async()=>vi.advanceTimersByTime(1000));await vi.waitFor(async()=>expect(await listarRecursosLocais(perfil)).toHaveLength(1));
   await act(async()=>vi.advanceTimersByTime(60000));expect(await listarRecursosLocais(perfil)).toHaveLength(1);
  }finally{await act(async()=>raiz.unmount());e.remove();}
 });
});
