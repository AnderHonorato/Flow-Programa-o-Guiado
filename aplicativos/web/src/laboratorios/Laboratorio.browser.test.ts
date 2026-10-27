import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createServer, type ViteDevServer } from 'vite';
import { chromium, type Browser, type Page } from '@playwright/test';
import type { Aula } from '../../../../contratos/tipos';
const aula: Aula = { id: 'regressao-laboratorio', titulo: 'Título e parágrafo', objetivo: 'Criar conteúdo', preRequisitos: [], blocos: [], exemplos: [], questoes: [], desafio: 'Crie um título e um parágrafo.', variacao: '', resumo: '', pontosDificeis: [], pistas: [], arquivos: { html: '<h1>Olá</h1><p>Meu texto</p>', css: '', js: '' }, competencia: 'HTML', linguagem: 'html', rubrica: [], testes: [{ id: 'titulo', tipo: 'texto', descricao: 'Título presente', seletor: 'h1' }] };
let navegador: Browser;
let servidor: ViteDevServer | undefined;
let origem = process.env.FLOW_URL || '';
async function montar(licao = aula) {
  const pagina = await navegador.newPage();
  await pagina.goto(origem);
  await pagina.evaluate(async dados => {
    const reactUrl = '/node_modules/.vite/deps/react.js'; const domUrl = '/node_modules/.vite/deps/react-dom_client.js'; const labUrl = '/src/laboratorios/Laboratorio.tsx';
    const carregar = new Function('url', 'return import(url)');
    const [react, dom, laboratorio] = await Promise.all([carregar(reactUrl), carregar(domUrl), carregar(labUrl)]);
    document.body.innerHTML = '<div id="laboratorio-teste"></div>';
    localStorage.clear();
    const contexto = window as unknown as { resultados: boolean[] };
    contexto.resultados = [];
    dom.default.createRoot(document.getElementById('laboratorio-teste')).render(react.default.createElement(laboratorio.default, { aula: dados, perfilId: 'teste', aoTestar: (r: { aprovado: boolean }) => contexto.resultados.push(r.aprovado) }));
  }, licao);
  await pagina.getByRole('button', { name: 'Testar código', exact: false }).waitFor();
  return pagina;
}
async function ultimoResultado(pagina: Page) { return pagina.evaluate(() => (window as unknown as { resultados: boolean[] }).resultados.at(-1)); }
describe('laboratório React no Chromium', () => {
  beforeAll(async () => {
    if (!origem) {
      const raiz = fileURLToPath(new URL('../../', import.meta.url));
      servidor = await createServer({ root: raiz, configFile: fileURLToPath(new URL('../../vite.config.ts', import.meta.url)), server: { host: '127.0.0.1', port: 0, open: false } });
      await servidor.listen(); origem = servidor.resolvedUrls!.local[0];
    }
    navegador = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined), args: ['--no-sandbox', '--disable-gpu'] });
  }, 60000);
  afterAll(async () => { await navegador?.close(); await servidor?.close(); });
  it('preserva verificações após executar novamente e invalida ao editar ou restaurar', async () => {
    const pagina = await montar();
    await pagina.getByRole('button', { name: 'Testar código', exact: false }).click();
    await expect.poll(async () => ({ ultimo: await ultimoResultado(pagina), testes: await pagina.locator('.lab-testes').innerText(), estado: await pagina.locator('.lab-status').innerText() })).toMatchObject({ ultimo: true });
    // Supera o debounce para detectar a corrida entre Testar e a prévia automática.
    await pagina.waitForTimeout(650);
    expect(await pagina.locator('.lab-testes .lab-teste-ok').count()).toBe(2);
    await pagina.getByRole('button', { name: 'Executar', exact: true }).click();
    expect(await pagina.locator('.lab-testes .lab-teste-ok').count()).toBe(2);
    await pagina.getByRole('textbox', { name: 'Editor HTML' }).click();
    await pagina.keyboard.press('ControlOrMeta+A');
    await pagina.keyboard.insertText('<p>Sem título</p>');
    await expect.poll(() => ultimoResultado(pagina)).toBe(false);
    expect(await pagina.locator('.lab-testes .lab-teste-ok').count()).toBe(0);
    await pagina.getByRole('button', { name: 'Voltar ao início' }).click();
    await pagina.getByRole('button', { name: 'Testar código', exact: false }).click();
    await expect.poll(() => ultimoResultado(pagina)).toBe(true);
    await pagina.getByRole('button', { name: 'Voltar ao início' }).click();
    await expect.poll(() => ultimoResultado(pagina)).toBe(false);
    await pagina.close();
  });
  it('executa Python local real e mostra erro real sem aprovar o teste', async () => {
    const pagina = await montar({ ...aula, linguagem: 'python', arquivos: { html: '', css: '', js: '', python: 'print(sum([2, 3, 5]))' }, testes: [{ id: 'soma', descricao: 'Soma calculada em Python', tipo: 'python', esperado: '10' }] });
    await pagina.getByRole('button', { name: 'Testar código', exact: false }).click();
    await expect.poll(() => ultimoResultado(pagina), { timeout: 45000 }).toBe(true);
    expect(await pagina.locator('.lab-console-saida').innerText()).toContain('10');
    await pagina.getByRole('textbox', { name: 'Editor PYTHON' }).click();
    await pagina.keyboard.press('ControlOrMeta+A');
    await pagina.keyboard.insertText('raise ValueError("falha real")');
    await expect.poll(() => ultimoResultado(pagina)).toBe(false);
    await pagina.getByRole('button', { name: 'Testar código', exact: false }).click();
    await expect.poll(() => pagina.locator('.lab-console-saida').innerText(), { timeout: 45000 }).toContain('ValueError: falha real');
    expect(await ultimoResultado(pagina)).toBe(false);
    await pagina.close();
  }, 60000);
  it('impede que Python recupere APIs de dados e novos contextos pela ponte JS ou pelos protótipos', async () => {
    const codigo = `import js
assert js.indexedDB is None
print("indexedDB=" + js.eval("typeof indexedDB"))
print(js.eval("""(() => {
  const nomes = ['indexedDB', 'caches', 'navigator', 'cookieStore', 'sharedStorage', 'openDatabase', 'requestFileSystem', 'webkitRequestFileSystem', 'Worker', 'SharedWorker', 'BroadcastChannel', 'fetch', 'XMLHttpRequest', 'WebSocket', 'WebTransport', 'EventSource', 'importScripts'];
  for (const nome of nomes) {
    if (globalThis[nome] !== undefined) throw new Error('API acessível: ' + nome);
    for (let alvo = globalThis; alvo; alvo = Object.getPrototypeOf(alvo)) {
      const descritor = Object.getOwnPropertyDescriptor(alvo, nome);
      if (descritor && (descritor.get || descritor.set || descritor.value !== undefined || descritor.configurable || descritor.writable)) {
        throw new Error('API recuperável no protótipo: ' + nome);
      }
    }
  }
  return 'APIs bloqueadas';
})()"""))
print(sum([2, 3, 5]))`;
    const pagina = await montar({ ...aula, linguagem: 'python', arquivos: { html: '', css: '', js: '', python: codigo }, testes: [{ id: 'privacidade', descricao: 'Sem acesso aos dados de outros perfis', tipo: 'python', esperado: 'APIs bloqueadas' }] });
    await pagina.getByRole('button', { name: 'Testar código', exact: false }).click();
    await expect.poll(() => pagina.locator('.lab-status').innerText(), { timeout: 45000 }).toContain('Execução Python concluída.');
    const saida = await pagina.locator('.lab-console-saida').innerText();
    expect(saida).toContain('indexedDB=undefined');
    expect(saida).toContain('APIs bloqueadas');
    expect(saida).toContain('10');
    expect(await ultimoResultado(pagina)).toBe(true);
    await pagina.close();
  }, 60000);
  it('mantém contraste mínimo de 4.5 no realce do código nos dois temas', async () => {
    const pagina = await montar({ ...aula, arquivos: { ...aula.arquivos, html: '<!-- comentário -->\n<h1 class="titulo">Olá</h1>' } });
    for (const tema of ['claro', 'escuro']) {
      await pagina.evaluate(valor => { document.documentElement.dataset.tema = valor; }, tema);
      const contrastes = await pagina.locator('.cm-content span').evaluateAll(elementos => {
        const luminancia = (cor: string) => {
          const rgb = (cor.match(/[\d.]+/g) || []).slice(0, 3).map(Number).map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
          return .2126 * rgb[0] + .7152 * rgb[1] + .0722 * rgb[2];
        };
        return elementos.map(elemento => {
          const estilo = getComputedStyle(elemento);
          const fundo = getComputedStyle(elemento.closest('.cm-editor')!).backgroundColor;
          const valores = [luminancia(estilo.color), luminancia(fundo)].sort((a, b) => a - b);
          return { texto: elemento.textContent, contraste: (valores[1] + .05) / (valores[0] + .05) };
        });
      });
      expect(contrastes.length).toBeGreaterThan(0);
      for (const amostra of contrastes) expect(amostra.contraste, `${tema}: ${amostra.texto}`).toBeGreaterThanOrEqual(4.5);
    }
    await pagina.close();
  });
  it('só envia código ao executor após consentimento e clique explícito', async () => {
    const pagina = await montar({ ...aula, linguagem: 'api' });
    const pedidos: unknown[] = [];
    await pagina.route('**/api/execucoes', async rota => {
      pedidos.push(rota.request().postDataJSON());
      expect(rota.request().headers().authorization).toBe('Bearer sessao-de-teste');
      await rota.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ detail: 'Executor remoto não está configurado.' }) });
    });
    await pagina.evaluate(() => sessionStorage.setItem('flow-sessao', JSON.stringify({ token: 'sessao-de-teste', usuario: { id: 'teste' } })));
    expect(pedidos).toHaveLength(0);
    await pagina.getByRole('checkbox', { name: /Permitir envio deste código/ }).check();
    expect(pedidos).toHaveLength(0);
    await pagina.getByRole('button', { name: 'Executar no servidor isolado' }).click();
    await expect.poll(() => pagina.locator('.lab-executor-saida').innerText()).toContain('Executor remoto não está configurado.');
    expect(pedidos).toEqual([{ linguagem: 'node', codigo: '' }]);
    await pagina.close();
  });
});
