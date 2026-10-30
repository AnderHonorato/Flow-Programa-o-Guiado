import 'fake-indexeddb/auto';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {atualizarCatalogo,catalogoIncluido,lerCatalogoLocal,validarCatalogo} from './catalogo';
import {salvarRecursoLocal} from './armazenamento';
afterEach(()=>vi.unstubAllGlobals());
describe('catálogo publicado e fallback offline',()=>{
 it('valida o catálogo incluído e rejeita arquivos de aula ou questões corrompidos',()=>{
  expect(validarCatalogo(catalogoIncluido)).toBe(true);
  const copia=structuredClone(catalogoIncluido);copia.trilhas[0].modulos[0].aulas[0].arquivos=null as never;
  expect(validarCatalogo(copia)).toBe(false);
  expect(validarCatalogo({versao:1,trilhas:[{id:'incompleta'}]})).toBe(false);
 });
 it('salva a resposta pública para reabertura offline e isola outro perfil',async()=>{
  const perfil=crypto.randomUUID();const remoto=structuredClone(catalogoIncluido);remoto.trilhas[0].titulo='HTML publicado no CMS';
  const fetchRemoto=vi.fn(async()=>new Response(JSON.stringify({catalogo:remoto,versao:3})));vi.stubGlobal('fetch',fetchRemoto);
  expect((await atualizarCatalogo(perfil,'/api')).trilhas[0].titulo).toBe('HTML publicado no CMS');
  expect(fetchRemoto).toHaveBeenCalledWith('/api/catalogo',expect.objectContaining({credentials:'omit'}));
  vi.stubGlobal('fetch',async()=>{throw new Error('Sem internet');});
  await expect(atualizarCatalogo(perfil,'/api')).rejects.toThrow('Sem internet');
  expect((await lerCatalogoLocal(perfil)).trilhas[0].titulo).toBe('HTML publicado no CMS');
  expect(await lerCatalogoLocal(crypto.randomUUID())).toEqual(catalogoIncluido);
 });
 it('preserva a última cópia válida se o servidor devolver JSON inválido ou HTTP com erro',async()=>{
  const perfil=crypto.randomUUID();await salvarRecursoLocal(perfil,'catalogo:publicado',catalogoIncluido);
  vi.stubGlobal('fetch',async()=>new Response(JSON.stringify({catalogo:{versao:1,trilhas:null}})));
  await expect(atualizarCatalogo(perfil,'/api')).rejects.toThrow('inválido');
  expect(await lerCatalogoLocal(perfil)).toEqual(catalogoIncluido);
  vi.stubGlobal('fetch',async()=>new Response('',{status:503}));
  await expect(atualizarCatalogo(perfil,'/api')).rejects.toThrow('indisponível');
  expect(await lerCatalogoLocal(perfil)).toEqual(catalogoIncluido);
 });
 it('ignora cópia local malformada e não publica resposta após cancelamento de perfil',async()=>{
  const perfil=crypto.randomUUID();await salvarRecursoLocal(perfil,'catalogo:publicado',{invalido:true});
  expect(await lerCatalogoLocal(perfil)).toEqual(catalogoIncluido);
  const controle=new AbortController();vi.stubGlobal('fetch',async()=>{controle.abort();return new Response(JSON.stringify({catalogo:catalogoIncluido}));});
  await expect(atualizarCatalogo(perfil,'/api',controle.signal)).rejects.toThrow();
 });
});
