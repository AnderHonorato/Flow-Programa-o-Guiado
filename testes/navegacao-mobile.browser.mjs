import { chromium } from 'playwright';
import { createServer } from 'vite';
import assert from 'node:assert/strict';

const servidor = await createServer({
  configFile: 'aplicativos/web/vite.config.ts',
  root: 'aplicativos/web',
  server: { host: '127.0.0.1', port: 0, strictPort: false },
});
let navegador;
try {
  await servidor.listen();
  const endereco = servidor.resolvedUrls.local[0];
  navegador = await chromium.launch({ headless: true });
  const pagina = await navegador.newPage({ viewport: { width: 390, height: 844 } });
  await pagina.addInitScript(() => localStorage.setItem('flow-nome', 'Teste de navegacao'));
  await pagina.goto(endereco);
  const barra = pagina.getByRole('navigation', { name: 'Atalhos do aplicativo' });
  await barra.getByRole('button', { name: 'Trilhas' }).click();
  await pagina.waitForFunction(() => history.state?.flowPagina === 'trilhas');
  await barra.getByRole('button', { name: 'Praticar' }).click();
  await pagina.waitForFunction(() => history.state?.flowPagina === 'codigo');
  await pagina.goBack();
  await pagina.waitForFunction(() => history.state?.flowPagina === 'trilhas');
  assert.equal(await barra.getByRole('button', { name: 'Trilhas' }).getAttribute('aria-current'), 'page');
  await pagina.goForward();
  await pagina.waitForFunction(() => history.state?.flowPagina === 'codigo');
  assert.equal(await barra.getByRole('button', { name: 'Praticar' }).getAttribute('aria-current'), 'page');
  console.log('APROVADO: toque, voltar e avancar restauram a tela e selecao');
} finally {
  await navegador?.close();
  await servidor.close();
}
