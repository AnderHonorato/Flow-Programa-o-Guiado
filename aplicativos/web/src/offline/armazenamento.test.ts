import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  lerEstado, salvarEstado, enfileirarTentativa, listarFila, sincronizarFila,
  vincularPerfil, exportarPerfil, importarPerfil, lerSincronizacao,
} from './armazenamento';

const estado = (aula = '') => ({ aulasConcluidas: aula ? [aula] : [], respostas: {}, revisoes: {}, xp: 0, ultimaAula: aula });
const tentativa = (id = 't-1') => ({ id, aulaId: 'html-1', arquivos: { html: '<h1>Olá</h1>', css: '', js: '' }, criadaEm: '2026-10-25T12:00:00.000Z', status: 'aguardando_sincronizacao' as const });
const perfil = () => crypto.randomUUID();
afterEach(() => vi.unstubAllGlobals());

describe('persistência por perfil', () => {
  it('isola o progresso e a fila entre usuários do mesmo dispositivo', async () => {
    const a = perfil(), b = perfil();
    await salvarEstado(a, estado('html-1'));
    await enfileirarTentativa(a, tentativa());
    expect((await lerEstado(a)).aulasConcluidas).toEqual(['html-1']);
    expect((await lerEstado(b)).aulasConcluidas).toEqual([]);
    expect(await listarFila(b)).toEqual([]);
  });

  it('deduplica reenvio e rejeita substituição do código usando o mesmo identificador', async () => {
    const p = perfil();
    await enfileirarTentativa(p, tentativa());
    await enfileirarTentativa(p, tentativa());
    await expect(enfileirarTentativa(p, { ...tentativa(), arquivos: { html: 'outro', css: '', js: '' } })).rejects.toThrow();
    expect(await listarFila(p)).toHaveLength(1);
    expect((await listarFila(p))[0].arquivos.html).toBe('<h1>Olá</h1>');
  });

  it('preserva os dois perfis e todos os trabalhos ao vincular uma conta', async () => {
    const local = perfil(), conta = perfil();
    await salvarEstado(local, { ...estado('html-1'), respostas: { q1: true }, xp: 110 });
    await salvarEstado(conta, { ...estado('css-1'), respostas: { q1: false, q2: true }, xp: 110 });
    await enfileirarTentativa(local, tentativa());
    await vincularPerfil(local, conta);
    expect((await lerEstado(conta)).aulasConcluidas.sort()).toEqual(['css-1', 'html-1']);
    expect((await lerEstado(conta)).respostas).toEqual({ q1: true, q2: true });
    expect(await listarFila(conta)).toHaveLength(1);
    expect((await lerEstado(local)).aulasConcluidas).toEqual(['html-1']);
  });

  it('restaura um backup sem sobrescrever trabalhos recentes e rejeita dados inválidos antes de gravar', async () => {
    const origem = perfil(), destino = perfil();
    await salvarEstado(origem, estado('html-1'));
    await enfileirarTentativa(origem, tentativa());
    const backup = await exportarPerfil(origem);
    await salvarEstado(destino, estado('css-1'));
    await importarPerfil(destino, backup);
    expect((await lerEstado(destino)).aulasConcluidas.sort()).toEqual(['css-1', 'html-1']);
    expect(await listarFila(destino)).toHaveLength(1);
    await expect(importarPerfil(destino, '{"versao":1,"estado":{"xp":-1}}')).rejects.toThrow();
    expect(await listarFila(destino)).toHaveLength(1);
  });
});

describe('fila de sincronização', () => {
  it('compartilha a execução do mesmo token e usa a nova sessão após uma reautenticação concorrente',async()=>{
    const p=perfil();let liberar!:(resposta:Response)=>void;
    const antiga=new Promise<Response>(resolver=>{liberar=resolver;});
    const tokens:string[]=[];
    vi.stubGlobal('fetch',async(url:string,op?:RequestInit)=>{
      const token=(op?.headers as Record<string,string>).Authorization;tokens.push(token);
      if(token==='Bearer antigo')return antiga;
      return url.endsWith('/tentativas')?Response.json([]):Response.json({estado:estado()});
    });
    const primeira=sincronizarFila(p,'antigo','/api');
    expect(sincronizarFila(p,'antigo','/api')).toBe(primeira);
    const renovada=sincronizarFila(p,'novo','/api');liberar(new Response('{}',{status:401}));
    await Promise.all([primeira,renovada]);
    expect(tokens).toEqual(['Bearer antigo','Bearer novo','Bearer novo']);
    expect((await lerSincronizacao(p)).sessaoExpirada).toBe(false);
    expect((await lerSincronizacao(p)).estado).toBe('sincronizado');
  });
  it('mantém aguardando sincronização e o código após falha de rede', async () => {
    const p = perfil();
    await enfileirarTentativa(p, tentativa());
    vi.stubGlobal('fetch', async () => { throw new Error('Sem rede'); });
    expect(await sincronizarFila(p, 'token', '/api')).toEqual({ enviadas: 0, pendentes: 1 });
    expect((await listarFila(p))[0].status).toBe('aguardando_sincronizacao');
    expect((await lerSincronizacao(p)).erro).toContain('Sem rede');
  });

  it('reutiliza o id após erro e só avança com confirmação válida do servidor', async () => {
    const p = perfil(), recebidas = new Set<string>();
    await enfileirarTentativa(p, tentativa());
    let primeira = true;
    vi.stubGlobal('fetch', async (url: string, op?: RequestInit) => {
      if (op?.method === 'POST') {
        const corpo = JSON.parse(op.body as string);
        recebidas.add(corpo.id);
        if (primeira) { primeira = false; throw new Error('Resposta perdida'); }
        return Response.json({ ...corpo, status: 'pendente_validacao' });
      }
      if (url.endsWith('/tentativas')) return Response.json([]);
      return Response.json({ estado: estado(), versao: 1, conflitos: [], eventosRecebidos: [] });
    });
    await sincronizarFila(p, 'token', '/api');
    expect(await sincronizarFila(p, 'token', '/api')).toEqual({ enviadas: 1, pendentes: 0 });
    await sincronizarFila(p, 'token', '/api');
    expect(recebidas.size).toBe(1);
    expect((await listarFila(p))[0].status).toBe('pendente_validacao');
  });

  it('não aceita aprovação inventada por resposta inválida ou erro HTTP', async () => {
    const p = perfil();
    await enfileirarTentativa(p, tentativa());
    vi.stubGlobal('fetch', async () => Response.json({ status: 'aprovada' }, { status: 500 }));
    await sincronizarFila(p, 'token', '/api');
    expect((await listarFila(p))[0].status).toBe('aguardando_sincronizacao');
  });

  it('atualiza feedback remoto e combina o progresso recuperado sem perder aulas locais', async () => {
    const p = perfil();
    await salvarEstado(p, estado('html-1'));
    await enfileirarTentativa(p, tentativa());
    vi.stubGlobal('fetch', async (url: string, op?: RequestInit) => {
      if (op?.method === 'POST') return Response.json({ ...tentativa(), status: 'pendente_validacao' });
      if (url.endsWith('/tentativas')) return Response.json([{ ...tentativa(), status: 'revisar', feedback: { dica: 'Adicione um parágrafo' } }]);
      return Response.json({ estado: estado('css-1'), versao: 2 });
    });
    await sincronizarFila(p, 'token', '/api');
    expect((await listarFila(p))[0].status).toBe('revisar');
    expect((await listarFila(p))[0].feedback).toEqual({ dica: 'Adicione um parágrafo' });
    expect((await lerEstado(p)).aulasConcluidas.sort()).toEqual(['css-1', 'html-1']);
  });
});
