import { test, expect, type Page } from '@playwright/test';

async function iniciar(page: Page, nome = 'Ana') {
  await page.goto('/');
  await page.getByLabel('Como podemos chamar você?').fill(nome);
  await page.getByRole('button', { name: 'Começar no meu dispositivo' }).click();
  await expect(page.getByRole('heading', { name: /Seu próximo passo/ })).toBeVisible();
}
async function navegar(page: Page, nome: string) {
  const menu = page.getByRole('button', { name: 'Abrir navegação' });
  if (await menu.isVisible()) await menu.click();
  await page.getByRole('navigation',{name:'Navegação principal',exact:true}).getByRole('button', { name: nome, exact: true }).click();
}
async function abrirHtml(page: Page) {
  await navegar(page, 'Trilhas');
  await page.getByRole('button', { name: /HTML: conteúdo com significado/ }).click();
  await page.getByRole('button', { name: 'HTML 1: Minha primeira página' }).click();
  await expect(page.getByRole('heading', { name: 'HTML 1: Minha primeira página' })).toBeVisible();
}
async function fecharRecompensas(page:Page){
 for(let i=0;i<14;i++){const fechar=page.getByRole('button',{name:'Fechar celebração atual',exact:true});if(!await fechar.isVisible())break;await fechar.click();}
}
async function prepararLaboratorio(page: Page) {
  const proxima = page.getByRole('button', { name: /Próxima etapa/ });
  if (await proxima.isVisible()) {
    await proxima.click(); await proxima.click();
    await page.getByLabel('Entendi o objetivo e sei qual resultado vou procurar.').check();
    await page.getByRole('button', { name: /Começar a construir/ }).click();
  }
}
async function editar(page: Page, arquivo: 'HTML' | 'CSS' | 'JS', codigo: string) {
  const abas = page.getByRole('navigation', { name: 'Painéis do laboratório' });
  if (await abas.isVisible()) await abas.getByRole('button', { name: 'Código', exact: true }).click();
  await page.getByRole('tab', { name: { HTML: 'index.html', CSS: 'style.css', JS: 'script.js' }[arquivo], exact: true }).click();
  const editor = page.getByRole('textbox', { name: `Editor ${arquivo}` });
  await editor.click();
  await editor.press('ControlOrMeta+A');
  await page.keyboard.insertText(codigo);
  await expect(editor).toHaveText(codigo);
}
async function visualizar(page: Page) {
  const abas = page.getByRole('navigation', { name: 'Painéis do laboratório' });
  if (await abas.isVisible()) await abas.getByRole('button', { name: 'Visualização', exact: true }).click();
}
const documento = (titulo: string) => `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Biblioteca QA</title></head><body><h1>${titulo}</h1><p>Encontro de leitura sábado às dez horas.</p></body></html>`;

test('início recomenda a aula HTML inicial', async ({ page }) => {
  await iniciar(page);
  await page.getByRole('button', { name: 'Continuar aprendendo' }).click();
  await expect(page.getByRole('heading', { name: 'HTML 1: Minha primeira página' })).toBeVisible();
});

test('perfil local edita HTML/CSS/JS reais, aprende e preserva fila offline e progresso', async ({ page, context }) => {
  test.setTimeout(90000);
  await iniciar(page);
  await abrirHtml(page);
  await expect(page.getByRole('button', { name: /Ouvir aula/ })).toBeVisible();
  await page.getByRole('button', { name: 'Ir para o laboratório' }).click();
  await prepararLaboratorio(page);
  await expect(page.getByRole('button', { name: 'Registrar competência' })).toBeDisabled();
  await editar(page, 'HTML', documento('Biblioteca da Ana'));
  await visualizar(page);
  const previa = page.frameLocator('.laboratorio iframe');
  await expect(previa.getByRole('heading', { name: 'Biblioteca da Ana' })).toBeVisible();
  await expect(page.locator('.laboratorio iframe')).toHaveAttribute('sandbox', 'allow-scripts allow-forms');
  await editar(page, 'CSS', 'h1 { color: rgb(120, 30, 50); }');
  await visualizar(page);
  await expect(previa.locator('h1')).toHaveCSS('color', 'rgb(120, 30, 50)');
  await editar(page, 'JS', 'document.body.dataset.executado = "sim"; console.log("JS executado de verdade");');
  await expect(previa.locator('body')).toHaveAttribute('data-executado', 'sim');
  await editar(page, 'HTML', documento('Minha biblioteca'));
  await expect(previa.locator('h1')).toHaveText('Minha biblioteca');
  await page.getByRole('tab', { name: 'Fixar', exact: true }).click();
  const questoes = page.locator('fieldset.questao');
  await questoes.nth(0).getByRole('button', { name: 'A h1', exact: true }).click();
  await questoes.nth(1).getByRole('button', { name: 'A h1 e p são filhos de body.', exact: true }).click();
  await page.getByRole('button', { name: 'Enviar avaliação', exact: true }).click();
  await expect(page.locator('.avaliacao-nota')).toContainText('100');
  await fecharRecompensas(page);
  await page.getByRole('button', { name: /Li a correção/ }).click();
  await prepararLaboratorio(page);
  await expect(page.locator('.lab-status')).toContainText('Prévia atualizada.');
  await page.getByRole('button', { name: /Testar código/ }).click();
  await expect.poll(() => page.locator('.lab-teste-ok').count()).toBeGreaterThanOrEqual(4);
  await expect(page.locator('.lab-teste-revisar')).toHaveCount(0);
  await page.getByRole('button', { name: 'Registrar competência' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Competência registrada!' })).toBeVisible();
  await fecharRecompensas(page);
  // Repetir registro não duplica XP; aprovação do professor continua separada.
  await page.getByRole('button', { name: 'Registrar competência' }).click();
  await context.setOffline(true);
  await page.getByRole('button', { name: 'Enviar desafio' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Aguardando sincronização' })).toBeVisible();
  await navegar(page, 'Projetos');
  await expect(page.getByText('Aguardando sincronização', { exact: true })).toBeVisible();
  await expect(page.getByText('Pendente de validação', { exact: true })).toHaveCount(0);
  await context.setOffline(false);
  await page.reload();
  await expect(page.getByText('Aguardando sincronização', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Continuar trabalhando' }).click();
  await page.getByRole('button', { name: 'Ir para o laboratório' }).click();
  await prepararLaboratorio(page);
  await visualizar(page);
  await expect(previa.locator('h1')).toHaveText('Minha biblioteca');
  await expect(previa.locator('h1')).toHaveCSS('color', 'rgb(120, 30, 50)');
  await expect(previa.locator('body')).toHaveAttribute('data-executado', 'sim');
  await navegar(page, 'Início');
  await expect(page.getByRole('region', { name: 'Seu progresso' }).getByText('120', { exact: false })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Seu progresso' }).getByText('1 aulas compreendidas')).toBeVisible();
});

test('catálogo explicita produção editorial e tema persiste após recarregar', async ({ page }) => {
  await iniciar(page, 'Bia');
  await navegar(page, 'Trilhas');
  await page.getByRole('button', { name: /HTML: conteúdo com significado/ }).click();
  await expect(page.getByText('Em produção editorial').first()).toBeVisible();
  await page.getByRole('button', { name: 'Ativar tema claro' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-tema', 'claro');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-tema', 'claro');
});

test('produção instala cache e reabre aula sem internet', async ({ page, context }) => {
  test.setTimeout(60000);
  const sw = await page.request.get('/sw.js');
  test.skip(!sw.ok() || !(await sw.text()).includes('precache'), 'Requer build de produção com service worker, não servidor Vite DEV.');
  await iniciar(page);
  await abrirHtml(page);
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload();
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'HTML 1: Minha primeira página' })).toBeVisible();
  await expect(page.getByText('Sem internet · modo offline')).toBeVisible();
  await page.getByRole('button', { name: 'Ir para o laboratório' }).click();
  await prepararLaboratorio(page);
  await editar(page, 'HTML', documento('Minha biblioteca offline'));
  await visualizar(page);
  await expect(page.frameLocator('.laboratorio iframe').locator('h1')).toHaveText('Minha biblioteca offline');
  await expect(page.locator('.lab-status')).toContainText('Salvo neste dispositivo');
  // Fecha a aba inteira e abre outra, preservando apenas os dados do navegador.
  await expect.poll(() => page.evaluate(() => Object.values(localStorage).some(valor => valor.includes('Minha biblioteca offline')))).toBe(true);
  const url = page.url();
  await page.close();
  const reaberta = await context.newPage();
  await reaberta.goto(url);
  await expect(reaberta.getByRole('heading', { name: 'HTML 1: Minha primeira página' })).toBeVisible();
  await reaberta.getByRole('button', { name: 'Ir para o laboratório' }).click();
  await prepararLaboratorio(reaberta);
  await visualizar(reaberta);
  await expect(reaberta.frameLocator('.laboratorio iframe').locator('h1')).toHaveText('Minha biblioteca offline');
});

test('conta real entra, sai, recupera sessão e recebe bloqueio administrativo', async ({ page }) => {
  test.setTimeout(60000);
  await iniciar(page, 'Conta QA');
  const email = `qa-${crypto.randomUUID()}@example.com`;
  const senha = `Senha-QA-${crypto.randomUUID()}`;
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await page.getByRole('button', { name: 'Quero criar uma conta' }).click();
  await page.getByLabel('E-mail', { exact: true }).fill(email);
  await page.getByLabel('Senha', { exact: true }).fill(senha);
  await page.getByRole('button', { name: 'Criar minha conta' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const token = await page.evaluate(() => JSON.parse(sessionStorage.getItem('flow-sessao') || 'null')?.token);
  expect(token).toBeTruthy();
  const bloqueio = await page.request.get('/api/admin/tentativas', { headers: { Authorization: `Bearer ${token}` } });
  expect(bloqueio.status()).toBe(403);
  const menu = page.getByRole('button', { name: 'Abrir navegação' });
  if (await menu.isVisible()) await menu.click();
  await page.getByRole('button', { name: /Conta QA Conta conectada/ }).click();
  await page.getByRole('button', { name: 'Sair da conta' }).click();
  await expect(page.getByRole('button', { name: 'Vincular a uma conta' })).toBeVisible();
  const sessaoAntiga = await page.request.get('/api/eu', { headers: { Authorization: `Bearer ${token}` } });
  expect(sessaoAntiga.status()).toBe(401);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await page.getByLabel('E-mail', { exact: true }).fill(email);
  await page.getByLabel('Senha', { exact: true }).fill(senha);
  await page.getByRole('button', { name: 'Entrar na minha conta' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.reload();
  await expect(page.getByText(email, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Meus certificados internos' }).click();
  await expect(page.getByText('Ainda não há aulas com aprovação administrativa registrada.', { exact: false })).toBeVisible();
  await expect(page.locator('.certificado')).toHaveCount(0);
});


test('avaliação trava primeira escolha, retoma e só revela nota e correção ao enviar', async ({ page }) => {
  await iniciar(page); await abrirHtml(page);
  await page.getByRole('tab', { name: 'Fixar', exact: true }).click();
  let questoes = page.locator('fieldset.questao');
  await questoes.nth(0).getByRole('button', { name: 'B title', exact: true }).click();
  for (const botao of await questoes.nth(0).getByRole('button').all()) await expect(botao).toBeDisabled();
  await expect(page.locator('.avaliacao-resultado')).toHaveCount(0);
  await expect(page.locator('.alternativa.correta,.alternativa.incorreta')).toHaveCount(0);
  await expect(page.getByRole('button', {name:'Enviar avaliação',exact:true})).toBeDisabled();
  await expect.poll(() => page.evaluate(async () => {
    const request = indexedDB.open('flow-programacao-guiada');
    const db = await new Promise<IDBDatabase>((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
    const read = db.transaction('estados').objectStore('estados').get(localStorage.getItem('flow-id-local')!);
    const estado = await new Promise<any>((resolve)=>{read.onsuccess=()=>resolve(read.result);});db.close();
    return Object.values(estado?.avaliacoes?.['html-primeira-pagina']?.escolhas||{})[0];
  })).toBe(1);
  await page.reload(); await page.getByRole('tab',{name:'Fixar',exact:true}).click();
  questoes = page.locator('fieldset.questao');
  await expect(questoes.nth(0).getByRole('button',{name:'B title',exact:true})).toHaveAttribute('aria-pressed','true');
  await expect(questoes.nth(0).getByRole('button',{name:'A h1',exact:true})).toBeDisabled();
  await questoes.nth(1).getByRole('button',{name:'A h1 e p são filhos de body.',exact:true}).click();
  await page.getByRole('button',{name:'Enviar avaliação',exact:true}).click();
  await expect(page.locator('.avaliacao-nota')).toContainText('50');
  await fecharRecompensas(page);
  await expect(page.locator('.correcao-item.revisar')).toContainText('O que deveria ter feito');
  await expect(page.locator('.correcao-item.revisar')).toContainText('Escolher: h1');
  await expect(page.locator('.correcao-item.acerto')).toHaveCount(1);
  await expect(page.getByRole('button',{name:'Enviar avaliação',exact:true})).toHaveCount(0);
  await page.reload();await page.getByRole('tab',{name:'Fixar',exact:true}).click();
  await expect(page.locator('.avaliacao-nota')).toContainText('50');
  await fecharRecompensas(page);
  for(const botao of await page.locator('.alternativa').all())await expect(botao).toBeDisabled();
});
