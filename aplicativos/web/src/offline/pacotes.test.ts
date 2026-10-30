import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { baixarPacote, listarPacotes, removerPacote,pacotePython } from './pacotes';
import {runtimePacotes} from './configuracao-pwa';

afterEach(() => vi.unstubAllGlobals());
function prepararCache() {
  const armazens = new Map<string, Map<string, Response>>();
  vi.stubGlobal('location', { origin: 'https://flow.test' });
  vi.stubGlobal('caches', {
    open: async (nome: string) => {
      const mapa = armazens.get(nome) ?? new Map(); armazens.set(nome, mapa);
      return { put: async (url: string, resposta: Response) => { mapa.set(url, resposta); },match:async(requisicao:Request|string)=>{
        const pedido=typeof requisicao==='string'?new Request(requisicao):requisicao;
        const resposta=mapa.get(pedido.url);
        // Cache.put recebeu uma URL, portanto sua chave não tinha Origin.
        if(resposta?.headers.get('Vary')?.toLowerCase()==='origin'&&pedido.headers.has('Origin'))return undefined;
        return resposta?.clone();
      }};
    },
    delete: async (nome: string) => armazens.delete(nome),
    keys: async () => [...armazens.keys()],
  });
  return armazens;
}

describe('pacotes offline', () => {
  it('serve o runtime instalado ao import de worker com Origin e resposta Vary Origin',async()=>{
    prepararCache();const perfil=crypto.randomUUID();
    vi.stubGlobal('fetch',async()=>new Response('módulo local',{headers:{Vary:'Origin'}}));
    await baixarPacote(perfil,pacotePython);
    vi.stubGlobal('fetch',async()=>{throw new Error('Sem rede');});
    const pedido=new Request('https://flow.test/pyodide/pyodide.mjs',{headers:{Origin:'https://flow.test'}});
    expect(await (await runtimePacotes.handler({request:pedido})).text()).toBe('módulo local');
    await expect(runtimePacotes.handler({request:new Request(pedido,{headers:{Authorization:'Bearer ficticio'}})})).rejects.toThrow('Sem rede');
  });
  it('publica o pacote somente após todos os recursos baixarem e permite liberar o espaço', async () => {
    const cachesLocais = prepararCache(), perfil = crypto.randomUUID();
    vi.stubGlobal('fetch', async () => new Response('conteúdo local'));
    await baixarPacote(perfil, { id: 'html', titulo: 'HTML', aulas: [], recursos: ['/assets/aula.js'] });
    const lista = await listarPacotes(perfil);
    expect(lista).toHaveLength(1);
    expect(lista[0].bytes).toBeGreaterThan(0);
    expect(cachesLocais.size).toBe(1);
    await removerPacote(perfil, 'html');
    expect(await listarPacotes(perfil)).toEqual([]);
    expect(cachesLocais.size).toBe(0);
  });

  it('não perde o pacote anterior quando uma atualização falha', async () => {
    const cachesLocais = prepararCache(), perfil = crypto.randomUUID();
    vi.stubGlobal('fetch', async () => new Response('versão anterior'));
    await baixarPacote(perfil, { id: 'html', titulo: 'HTML', aulas: [], recursos: ['/assets/um.js'] });
    vi.stubGlobal('fetch', async () => new Response('', { status: 503 }));
    await expect(baixarPacote(perfil, { id: 'html', titulo: 'HTML novo', aulas: [], recursos: ['/assets/dois.js'] })).rejects.toThrow();
    expect((await listarPacotes(perfil))[0].titulo).toBe('HTML');
    expect(cachesLocais.size).toBe(1);
  });

  it('rejeita cache de API autenticada e de origem externa', async () => {
    prepararCache(); const perfil = crypto.randomUUID();
    await expect(baixarPacote(perfil, { id: 'invalido', titulo: 'Inválido', aulas: [], recursos: ['/api/eu'] })).rejects.toThrow();
    await expect(baixarPacote(perfil, { id: 'externo', titulo: 'Externo', aulas: [], recursos: ['https://outro.test/dados.js'] })).rejects.toThrow();
    expect(await listarPacotes(perfil)).toEqual([]);
  });

  it('reabre os seis arquivos Python sem rede e mantém metadados separados por perfil',async()=>{
    prepararCache();const perfil=crypto.randomUUID();const progresso=vi.fn();
    vi.stubGlobal('fetch',async()=>new Response('arquivo Python local'));
    await baixarPacote(perfil,pacotePython,progresso);
    expect(progresso).toHaveBeenLastCalledWith(6,6);
    vi.stubGlobal('fetch',async()=>{throw new Error('Sem rede');});
    const salvo=(await listarPacotes(perfil))[0];
    expect(salvo.recursos).toHaveLength(6);expect(await listarPacotes(crypto.randomUUID())).toHaveLength(0);
    for(const url of salvo.recursos!){expect(await (await runtimePacotes.handler({request:new Request(url)})).text()).toBe('arquivo Python local');}
    const autenticada=new Request(salvo.recursos![0],{headers:{Authorization:'Bearer segredo'}});
    await expect(runtimePacotes.handler({request:autenticada})).rejects.toThrow('Sem rede');
    await expect(runtimePacotes.handler({request:new Request(salvo.recursos![0],{cache:'no-cache'})})).rejects.toThrow('Sem rede');
    await removerPacote(perfil,pacotePython.id);
    await expect(runtimePacotes.handler({request:new Request(salvo.recursos![0])})).rejects.toThrow('Sem rede');
  });
});
