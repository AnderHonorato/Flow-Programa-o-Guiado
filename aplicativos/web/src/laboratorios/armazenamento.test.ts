// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { carregarProjeto, salvarProjeto, vincularProjetos, exportarProjetos, importarProjetos } from './armazenamento';
const arquivos = { html: '<h1>Inicial</h1>', css: '', js: '' };
describe('projetos e versões locais', () => {
  beforeEach(() => localStorage.clear());
  it('isola edições por perfil e aula', () => { salvarProjeto('a','html',{...arquivos,html:'edição'},[]); expect(carregarProjeto('a','html',arquivos).arquivos.html).toBe('edição'); expect(carregarProjeto('b','html',arquivos).arquivos.html).toBe(arquivos.html); expect(carregarProjeto('a','css',arquivos).arquivos.html).toBe(arquivos.html); });
  it('recupera projeto corrompido sem apagar o conteúdo inicial', () => { localStorage.setItem('flow:laboratorio:v1:a:html','{'); expect(carregarProjeto('a','html',arquivos).arquivos).toEqual(arquivos); });
  it('vincula perfil sem apagar origem nem substituir conflito', () => { salvarProjeto('local','html',{...arquivos,html:'origem'},[]); salvarProjeto('conta','html',{...arquivos,html:'destino'},[]); vincularProjetos('local','conta'); expect(carregarProjeto('local','html',arquivos).arquivos.html).toBe('origem'); const conta = carregarProjeto('conta','html',arquivos); expect(conta.arquivos.html).toBe('destino'); expect(conta.snapshots[0].arquivos.html).toBe('origem'); });
  it('exporta e importa backup validado', () => { salvarProjeto('a','html',arquivos,[]); const backup = exportarProjetos('a'); expect(importarProjetos('b',backup)).toBe(1); expect(exportarProjetos('b')[0].arquivos).toEqual(arquivos); expect(() => importarProjetos('b',[{aulaId:'html',arquivos:{html:8}}])).toThrow(); });
  it('mantém no máximo 20 snapshots', () => { salvarProjeto('a','html',arquivos,Array.from({length:25},(_,i)=>({id:String(i),data:new Date().toISOString(),arquivos}))); expect(carregarProjeto('a','html',arquivos).snapshots).toHaveLength(20); });
  it('desfaz gravações anteriores quando a segunda aula falha durante a importação', () => {
    salvarProjeto('destino', 'a', { ...arquivos, html: 'meu trabalho' }, []);
    const antes = localStorage.getItem('flow:laboratorio:v1:destino:a');
    const original = Storage.prototype.setItem;
    let chamadas = 0;
    const espiao = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (chave, valor) {
      chamadas++;
      if (chamadas === 2) throw new DOMException('Sem espaço', 'QuotaExceededError');
      return original.call(this, chave, valor);
    });
    try {
      expect(() => importarProjetos('destino', [
        { aulaId: 'a', arquivos: { ...arquivos, html: 'backup' }, snapshots: [] },
        { aulaId: 'b', arquivos, snapshots: [] }
      ])).toThrow('Os projetos anteriores foram preservados');
      expect(localStorage.getItem('flow:laboratorio:v1:destino:a')).toBe(antes);
      expect(localStorage.getItem('flow:laboratorio:v1:destino:b')).toBeNull();
    } finally { espiao.mockRestore(); }
  });
  it('rejeita aulas duplicadas antes de alterar qualquer projeto', () => {
    const backup = { aulaId: 'html', arquivos, snapshots: [] };
    expect(() => importarProjetos('destino', [backup, backup])).toThrow('aulas duplicadas');
    expect(exportarProjetos('destino')).toEqual([]);
  });

});
