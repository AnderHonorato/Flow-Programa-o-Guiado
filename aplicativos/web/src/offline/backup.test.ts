// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { exportarPerfil, importarPerfil, lerEstado, salvarEstado, vincularPerfil } from './armazenamento';
import { carregarProjeto, salvarProjeto } from '../laboratorios/armazenamento';

describe('backup de progresso e código', () => {
  it('inclui rascunhos e versões do laboratório e mantém o trabalho mais recente ao restaurar', async () => {
    const origem = crypto.randomUUID(), destino = crypto.randomUUID();
    salvarProjeto(origem, 'html-1', { html: 'antes', css: '', js: '' }, []);
    const backup = await exportarPerfil(origem);
    salvarProjeto(destino, 'html-1', { html: 'mais recente', css: '', js: '' }, []);
    await importarPerfil(destino, backup);
    const projeto = carregarProjeto(destino, 'html-1', { html: '', css: '', js: '' });
    expect(projeto.arquivos.html).toBe('mais recente');
    expect(projeto.snapshots.some(s => s.arquivos.html === 'antes')).toBe(true);
  });

  it('vincula o código local à conta sem remover o perfil de origem', async () => {
    const origem = crypto.randomUUID(), destino = crypto.randomUUID();
    salvarProjeto(origem, 'html-1', { html: 'meu título', css: '', js: '' }, []);
    await vincularPerfil(origem, destino);
    expect(carregarProjeto(destino, 'html-1', { html: '', css: '', js: '' }).arquivos.html).toBe('meu título');
    expect(carregarProjeto(origem, 'html-1', { html: '', css: '', js: '' }).arquivos.html).toBe('meu título');
  });

  it('rejeita projetos corrompidos antes de alterar o progresso do destino', async () => {
    const origem = crypto.randomUUID(), destino = crypto.randomUUID();
    await salvarEstado(origem, { aulasConcluidas: ['html-1'], respostas: {}, revisoes: {}, xp: 0, ultimaAula: '' });
    const backup = JSON.parse(await exportarPerfil(origem));
    backup.projetos = [{ aulaId: 'html-1', arquivos: { html: 5 }, snapshots: [] }];
    await expect(importarPerfil(destino, JSON.stringify(backup))).rejects.toThrow();
    expect((await lerEstado(destino)).aulasConcluidas).toEqual([]);
  });
});
