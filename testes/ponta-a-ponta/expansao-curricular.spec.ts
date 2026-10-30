import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import type { ArquivosCodigo, Aula, Catalogo } from '../../contratos/tipos';

const novasAulas = [
  'fundamentos-algoritmos', 'html-tabelas', 'css-grid', 'js-escopo',
  'dom-formularios', 'python-arquivos', 'frontend-estado', 'api-validacao',
  'fullstack-sessao', 'projeto-calculadora',
] as const;

// As soluções existem apenas no processo de teste. Não criamos rota nem arquivo
// público com respostas, e nunca executamos código recebido de um aluno no Node.
let solucoesLocais: Record<string, ArquivosCodigo> | undefined;
function solucaoDaAula(id: string): ArquivosCodigo {
  if (!solucoesLocais) {
    const codigo = [
      'import json',
      'from conteudos.fontes.expansao_web import solucoes as web',
      'from conteudos.fontes.expansao_logica import solucoes as logica',
      'from conteudos.fontes.expansao_apps import solucoes as apps',
      'print(json.dumps({**web(), **logica(), **apps()}, ensure_ascii=False))',
    ].join('\n');
    solucoesLocais = JSON.parse(execFileSync('python3', ['-c', codigo], {
      cwd: process.cwd(), encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    }));
  }
  const solucao = solucoesLocais![id];
  if (!solucao) throw new Error(`Falta a solução editorial de QA para ${id}.`);
  return solucao;
}

function catalogoLocal(): Catalogo {
  return JSON.parse(readFileSync(resolve(process.cwd(), 'conteudos/catalogo.json'), 'utf8'));
}
const escaparExpressao = (texto: string) => texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function iniciar(page: Page) {
  await page.goto('/');
  await page.getByLabel('Como podemos chamar você?').fill('Aprendiz curricular');
  await page.getByRole('button', { name: 'Começar no meu dispositivo' }).click();
  await expect(page.getByRole('heading', { name: /Seu próximo passo/ })).toBeVisible();
}

async function abrirAula(page: Page, id: string): Promise<Aula> {
  const trilha = catalogoLocal().trilhas.find(t => t.modulos.some(m => m.aulas.some(a => a.id === id)));
  const aula = trilha?.modulos.flatMap(m => m.aulas).find(a => a.id === id);
  if (!trilha || !aula) throw new Error(`A aula ${id} precisa estar publicada no catálogo testado.`);
  const menu = page.getByRole('button', { name: 'Abrir navegação' });
  if (await menu.isVisible()) await menu.click();
  await page.getByRole('navigation', { name: 'Navegação principal', exact: true })
    .getByRole('button', { name: 'Trilhas', exact: true }).click();
  await page.getByRole('button', { name: new RegExp(escaparExpressao(trilha.titulo)) }).click();
  await page.getByRole('button', { name: aula.titulo, exact: true }).click();
  await expect(page.getByRole('heading', { name: aula.titulo, exact: true })).toBeVisible();
  return aula;
}

async function prepararLaboratorio(page: Page) {
  await page.getByRole('button', { name: 'Ir para o laboratório', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Uma missão clara. Um passo por vez.' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: /^Editor / })).toHaveCount(0);
  await page.getByRole('button', { name: /Próxima etapa/ }).click();
  await expect(page.locator('.preparacao-plano > li')).toHaveCount(4);
  await page.getByRole('button', { name: /Próxima etapa/ }).click();
  const construir = page.getByRole('button', { name: /Começar a construir/ });
  await expect(construir).toBeDisabled();
  await page.getByLabel('Entendi o objetivo e sei qual resultado vou procurar.').check();
  await construir.click();
}

async function editar(page: Page, arquivo: keyof ArquivosCodigo, codigo: string) {
  const paineis = page.getByRole('navigation', { name: 'Painéis do laboratório' });
  if (await paineis.isVisible()) await paineis.getByRole('button', { name: 'Código', exact: true }).click();
  const nome = { html: 'index.html', css: 'style.css', js: 'script.js', python: 'main.py' }[arquivo];
  await page.getByRole('tab', { name: nome, exact: true }).click();
  const editor = page.getByRole('textbox', { name: `Editor ${arquivo.toUpperCase()}`, exact: true });
  await editor.click();
  await editor.press('ControlOrMeta+A');
  await page.keyboard.insertText(codigo);
  // CodeMirror usa um div por linha; textContent concatena esses divs sem \n.
  await expect(editor).toHaveText(codigo, { useInnerText: true });
}

async function visualizar(page: Page) {
  const paineis = page.getByRole('navigation', { name: 'Painéis do laboratório' });
  if (await paineis.isVisible()) await paineis.getByRole('button', { name: 'Visualização', exact: true }).click();
}

for (const id of novasAulas) {
  test(`aula ${id}: ensino, código inicial incompleto e solução executável`, async ({ page }) => {
    test.setTimeout(id === 'python-arquivos' ? 120000 : 60000);
    await iniciar(page);
    const aula = await abrirAula(page, id);
    expect(aula.testes?.length, `${id} precisa de verificações autorais`).toBeGreaterThan(0);
    await expect(page.getByRole('button', { name: /Ouvir aula/ })).toBeVisible();
    await expect(page.locator('.exemplo-raciocinio')).toContainText(aula.exemplos[0].explicacao[0]);
    await page.getByRole('button', { name: /Próximo passo/ }).click();
    await expect(page.locator('.exemplo-raciocinio')).toContainText(aula.exemplos[0].explicacao[1]);
    await page.getByRole('group', { name: 'Exemplos da aula' })
      .getByRole('button', { name: `2. ${aula.exemplos[1].titulo}`, exact: true }).click();
    await expect(page.locator('.exemplo-raciocinio')).toContainText(aula.exemplos[1].explicacao[0]);
    await expect(page.locator('.experimento-saida')).not.toBeEmpty();
    await prepararLaboratorio(page);

    await page.getByRole('button', { name: 'Testar código', exact: true }).click();
    await expect.poll(() => page.locator('.lab-teste-revisar').count(), {
      timeout: id === 'python-arquivos' ? 60000 : 10000,
      message: 'O ponto de partida não deve aprovar uma missão ainda não implementada.',
    }).toBeGreaterThan(0);
    await expect(page.getByRole('button', { name: 'Registrar competência', exact: true })).toBeDisabled();

    const solucao = solucaoDaAula(id);
    if (aula.linguagem === 'python') await editar(page, 'python', solucao.python || '');
    else {
      for (const arquivo of ['html', 'css', 'js'] as const) {
        await editar(page, arquivo, solucao[arquivo] ?? '');
      }
    }
    await page.getByRole('button', { name: 'Testar código', exact: true }).click();
    const quantidade = aula.testes!.length + (aula.linguagem === 'python' ? 0 : 1);
    await expect(page.locator('.lab-teste-ok')).toHaveCount(quantidade, {
      timeout: aula.linguagem === 'python' ? 60000 : 10000,
    });
    await expect(page.locator('.lab-teste-revisar')).toHaveCount(0);
  });
}

test('formulário isolado permite foco, checkbox e submit sem navegar ou enviar dados', async ({ page }) => {
  await iniciar(page);
  await abrirAula(page, 'dom-formularios');
  await prepararLaboratorio(page);
  await editar(page, 'html', '<form id="ensaio" action="https://example.org/nao-enviar" method="post"><label for="nome-ensaio">Nome do ensaio</label><input id="nome-ensaio" name="nome" required><label><input name="aviso" type="checkbox">Quero o aviso</label><button type="submit">Conferir inscrição</button></form><output id="resultado-ensaio" aria-live="polite"></output>');
  await editar(page, 'css', 'body { padding: 8px; } label { display: block; margin-block: 8px; } input,button { font: inherit; max-width: 100%; }');
  await editar(page, 'js', 'const formulario = document.querySelector("#ensaio"); formulario.addEventListener("submit", evento => { evento.preventDefault(); const dados = new FormData(formulario); document.querySelector("#resultado-ensaio").textContent = dados.get("nome").trim() + (dados.has("aviso") ? ": com aviso" : ": sem aviso"); });');
  await expect(page.locator('.lab-status')).toContainText('Prévia atualizada.');
  await visualizar(page);
  const previa = page.frameLocator('.laboratorio iframe');
  const redeExterna: string[] = [];
  page.on('request', pedido => { if (pedido.url().startsWith('https://example.org/nao-enviar')) redeExterna.push(pedido.url()); });
  const enderecoApp = page.url();
  await previa.getByText('Nome do ensaio', { exact: true }).click();
  await expect(previa.getByLabel('Nome do ensaio', { exact: true })).toBeFocused();
  await previa.getByLabel('Nome do ensaio', { exact: true }).fill('  Lia  ');
  await previa.getByText('Quero o aviso', { exact: true }).click();
  await expect(previa.getByRole('checkbox', { name: 'Quero o aviso' })).toBeChecked();
  await previa.getByRole('button', { name: 'Conferir inscrição', exact: true }).click();
  await expect(previa.locator('#resultado-ensaio')).toHaveText('Lia: com aviso');
  await previa.getByRole('checkbox', { name: 'Quero o aviso' }).uncheck();
  await previa.getByLabel('Nome do ensaio', { exact: true }).press('Enter');
  await expect(previa.locator('#resultado-ensaio')).toHaveText('Lia: sem aviso');
  await expect(page.locator('.laboratorio iframe')).toHaveAttribute('sandbox', 'allow-scripts allow-forms');
  // submit() pula o evento submit. A CSP precisa barrar também esse caminho.
  await previa.locator('form').evaluate(formulario => {
    addEventListener('securitypolicyviolation', evento => {
      if (evento.effectiveDirective === 'form-action') document.body.dataset.envioBloqueado = evento.effectiveDirective;
    });
    (formulario as HTMLFormElement).action = 'https://example.org/nao-enviar';
    HTMLFormElement.prototype.submit.call(formulario);
  });
  await expect(previa.locator('body')).toHaveAttribute('data-envio-bloqueado', 'form-action');
  expect(page.url()).toBe(enderecoApp);
  expect(redeExterna).toEqual([]);
});

test('arquivos Python executam em WebAssembly após fechar e reabrir sem internet', async ({ page, context }) => {
  test.setTimeout(120000);
  await iniciar(page);
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload();
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  const menu = page.getByRole('button', { name: 'Abrir navegação' });
  if (await menu.isVisible()) await menu.click();
  await page.getByRole('button', { name: /Aprendiz curricular Perfil local/ }).click();
  const pacote = page.locator('.lista-dados > div').filter({
    has: page.getByText('Python local · Pyodide 0.29.3', { exact: true }),
  });
  await pacote.getByRole('button', { name: 'Baixar pacote', exact: true }).click();
  await expect(pacote.getByText(/MB · baixado/)).toBeVisible({ timeout: 45000 });
  const recursos = await page.evaluate(async () => {
    const arquivos: string[] = [];
    for (const nome of await caches.keys()) {
      if (!nome.startsWith('flow-pacote-')) continue;
      arquivos.push(...(await (await caches.open(nome)).keys()).map(r => new URL(r.url).pathname));
    }
    return arquivos.filter(url => url.startsWith('/pyodide/'));
  });
  expect(recursos.sort()).toEqual([
    '/pyodide/pyodide-lock.json', '/pyodide/pyodide.asm.js', '/pyodide/pyodide.asm.wasm',
    '/pyodide/pyodide.js', '/pyodide/pyodide.mjs', '/pyodide/python_stdlib.zip',
  ].sort());
  const aula = await abrirAula(page, 'python-arquivos');
  await prepararLaboratorio(page);
  const codigo = solucaoDaAula(aula.id).python!;
  await editar(page, 'python', codigo);
  // O inicial também importa TemporaryDirectory. Espere a versão completa ser
  // persistida, pois fechar antes do debounce de autosave descarta a última edição.
  await expect.poll(() => page.evaluate(({ id, codigo }) => {
    const perfil = localStorage.getItem('flow-id-local') || '';
    const chave = `flow:laboratorio:v1:${encodeURIComponent(perfil)}:${encodeURIComponent(id)}`;
    const salvo = JSON.parse(localStorage.getItem(chave) || 'null');
    return salvo?.arquivos?.python === codigo;
  }, { id: aula.id, codigo })).toBe(true);

  // Limpa o cache HTTP e fecha a aba para não reaproveitar runtime ou worker em memória.
  // CacheStorage do pacote e precache do aplicativo são os únicos recursos offline.
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.clearBrowserCache');
  await cdp.detach();
  const endereco = page.url();
  await context.setOffline(true);
  await page.close();
  const reaberta = await context.newPage();
  await reaberta.goto(endereco);
  await expect(reaberta.getByText('Sem internet · modo offline')).toBeVisible();
  await expect(reaberta.getByRole('heading', { name: aula.titulo, exact: true })).toBeVisible();
  await prepararLaboratorio(reaberta);
  await expect(reaberta.getByRole('textbox', { name: 'Editor PYTHON', exact: true }))
    .toHaveText(codigo, { useInnerText: true });
  await reaberta.getByRole('button', { name: 'Testar código', exact: true }).click();
  await expect(reaberta.locator('.lab-teste-ok')).toHaveCount(3, { timeout: 60000 });
  await expect(reaberta.locator('.lab-teste-revisar')).toHaveCount(0);
  await expect(reaberta.locator('.lab-status')).toContainText('Execução Python concluída.');
});
