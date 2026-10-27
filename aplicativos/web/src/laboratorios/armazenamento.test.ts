// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { carregarProjeto, salvarProjeto, vincularProjetos, exportarProjetos, importarProjetos } from './armazenamento';
const arquivos = { html: '<h1>Inicial</h1>', css: '', js: '' };
describe('projetos e versões locais', () => {
  beforeEach(() => localStorage.clear());
  it('isola edições por perfil e aula', () => { salvarProjeto('a','html',{...arquivos,html:'edição'},[]); expect(carregarProjeto('a','html',arquivos).arquivos.html).toBe('edição'); expect(carregarProjeto('b','html',arquivos).arquivos.html).toBe(arquivos.html); expect(carregarProjeto('a','css',arquivos).arquivos.html).toBe(arquivos.html); });
  it('recupera projeto corrompido sem apagar o conteúdo inicial', () => { localStorage.setItem('flow:laboratorio:v1:a:html','{'); expect(carregarProjeto('a','html',arquivos).arquivos).toEqual(arquivos); });
  it('vincula perfil sem apagar origem nem substituir conflito', () => { salvarProjeto('local','html',{...arquivos,html:'origem'},[]); salvarProjeto('conta','html',{...arquivos,html:'destino'},[]); vincularProjetos('local','conta'); expect(carregarProjeto('local','html',arquivos).arquivos.html).toBe('origem'); const conta = carregarProjeto('conta','html',arquivos); expect(conta.arquivos.html).toBe('destino'); expect(conta.snapshots[0].arquivos.html).toBe('origem'); });
  it('exporta e importa backup validado', () => { salvarProjeto('a','html',arquivos,[]); const backup = exportarProjetos('a'); expect(importarProjetos('b',backup)).toBe(1); expect(exportarProjetos('b')[0].arquivos).toEqual(arquivos); expect(() => importarProjetos('b',[{aulaId:'html',arquivos:{html:8}}])).toThrow(); });
  it('mantém no máximo 20 snapshots', () => { salvarProjeto('a','html',arquivos,Array.from({length:25},(_,i)=>({id:String(i),data:new Date().toISOString(),arquivos}))); expect(carregarProjeto('a','html',arquivos).snapshots).toHaveLength(20); });
});
