import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const destino = join(raiz, 'docs/evidencias/android');
const adb = process.env.ANDROID_HOME ? join(process.env.ANDROID_HOME, 'platform-tools/adb') : 'adb';
const pacote = 'br.com.ander.flow';
const apk = resolve(process.argv[2] || join(raiz, 'artefatos/Flow-Programacao-Guiada-0.6.0-debug.apk'));
const evidencias = { inicio: new Date().toISOString(), pacote, verificacoes: [] };
const marcador = 'flowAndroidTeclado';
mkdirSync(destino, { recursive: true });
const comando = (...argumentos) => execFileSync(adb, ['-e', ...argumentos], { encoding: 'utf8', timeout: 120_000 }).trim();
const esperar = tempo => new Promise(concluir => setTimeout(concluir, tempo));

async function conectar() {
  const pid = comando('shell', 'pidof', pacote).split(' ')[0];
  assert(pid, 'O processo Android precisa estar aberto.');
  comando('forward', 'tcp:9223', `localabstract:webview_devtools_remote_${pid}`);
  let navegador;
  for (let tentativa = 0; tentativa < 30; tentativa++) {
    try {
      navegador = await chromium.connectOverCDP('http://127.0.0.1:9223', { timeout: 5_000 });
      break;
    } catch {
      await esperar(2_000);
    }
  }
  assert(navegador, 'Nao foi possivel conectar ao WebView de depuracao.');
  const pagina = navegador.contexts()[0].pages()[0];
  pagina.setDefaultTimeout(120_000);
  await pagina.waitForFunction(() => document.querySelector('#root')?.textContent?.length > 30, undefined, { timeout: 120_000 });
  return { navegador, pagina };
}

try {
  console.log('Instalando APK no emulador conectado.');
  evidencias.instalacao = comando('install', '-r', apk);
  assert(evidencias.instalacao.includes('Success'));
  comando('shell', 'am', 'start', '-n', `${pacote}/.MainActivity`);
  let { navegador, pagina } = await conectar();
  evidencias.webview = await pagina.evaluate(() => navigator.userAgent);
  if (await pagina.locator('#nome').count()) {
    await pagina.locator('#nome').fill('Teste Android');
    await pagina.getByRole('button', { name: 'Começar no meu dispositivo' }).click();
  }
  if (!(await pagina.getByRole('button', { name: 'Continuar aprendendo' }).count())) {
    await pagina.evaluate(() => localStorage.setItem('flow-pagina', 'inicio'));
    await pagina.reload();
  }
  await pagina.getByRole('button', { name: 'Continuar aprendendo' }).click({ timeout: 120_000 });
  await pagina.getByRole('heading', { name: /Minha primeira página/i }).first().waitFor({ timeout: 120_000 });
  evidencias.verificacoes.push('APK instalado e aula inicial aberta no WebView Android real.');
  await pagina.screenshot({ path: join(destino, 'android-aula.png'), fullPage: true });
  await esperar(3_000);
  try {
    evidencias.vozes = await pagina.evaluate(async () => Promise.race([
      window.Capacitor.Plugins.NarradorNativo.vozes(),
      new Promise((_, rejeitar) => setTimeout(() => rejeitar(new Error('O mecanismo TTS nao respondeu em 20 segundos.')), 20_000)),
    ]));
    evidencias.tts = evidencias.vozes.vozes.some(voz => voz.local && /^pt-BR$/i.test(voz.idioma))
      ? 'Voz local em portugues detectada; audicao fisica ainda requer aparelho e pessoa.'
      : 'Sem voz local em portugues neste emulador; fallback de indisponibilidade deve ser usado.';
  } catch (erro) {
    evidencias.vozIndisponivel = String(erro);
  }
  console.log('Verificando editor, teclado Android e rotacao.');
  await pagina.getByRole('button', { name: 'Ir para o laboratório' }).click();
  if(await pagina.getByRole('button',{name:/Próxima etapa/}).isVisible()){await pagina.getByRole('button',{name:/Próxima etapa/}).click();await pagina.getByRole('button',{name:/Próxima etapa/}).click();await pagina.getByLabel('Entendi o objetivo e sei qual resultado vou procurar.').check();await pagina.getByRole('button',{name:/Começar a construir/}).click();}
  const previa = await pagina.locator('iframe').elementHandle();
  const quadro = await previa.contentFrame();
  assert(quadro, 'A previa precisa de um frame isolado.');
  evidencias.ponteIsolada = await quadro.evaluate(() => typeof window.androidBridge === 'undefined');
  assert(evidencias.ponteIsolada, 'Codigo do aluno nao pode acessar a ponte Android.');
  const editor = pagina.getByLabel('Editor HTML', { exact: true });
  await editor.scrollIntoViewIfNeeded();
  await editor.click();
  const caixa = await editor.boundingBox();
  assert(caixa, 'O editor deve estar visivel.');
  // O toque e a digitacao passam pelo Android, incluindo o IME do emulador.
  comando('shell', 'input', 'tap', String(Math.round(caixa.x + 30)), String(Math.round(caixa.y + 20)));
  await esperar(3_000);
  evidencias.teclado = comando('shell', 'dumpsys', 'input_method');
  writeFileSync(join(destino, 'android-teclado.txt'), evidencias.teclado);
  evidencias.tecladoVisivel = /mInputShown=true|isInputViewShown\(\)=true|mIsInputViewShown=true/.test(evidencias.teclado);
  delete evidencias.teclado;
  comando('shell', 'input', 'text', marcador);
  await pagina.waitForFunction(texto => document.querySelector('.cm-content')?.textContent.includes(texto), marcador);
  await pagina.screenshot({ path: join(destino, 'android-editor-teclado.png'), fullPage: true });
  writeFileSync(join(destino, 'android-tela-teclado.png'), execFileSync(adb, ['-e', 'exec-out', 'screencap', '-p'], { timeout: 120_000 }));
  comando('shell', 'input', 'keyevent', '4');
  comando('shell', 'settings', 'put', 'system', 'accelerometer_rotation', '0');
  comando('shell', 'settings', 'put', 'system', 'user_rotation', '1');
  await pagina.waitForFunction(() => innerWidth > innerHeight, undefined, { timeout: 30_000 });
  assert((await editor.textContent()).includes(marcador), 'A rotacao deve preservar o codigo.');
  await pagina.screenshot({ path: join(destino, 'android-editor-paisagem.png'), fullPage: true });
  comando('shell', 'settings', 'put', 'system', 'user_rotation', '0');
  await esperar(2_000);
  evidencias.verificacoes.push('Entrada pelo Android alterou o editor e o codigo permaneceu ao girar a tela.');
  await navegador.close();
  comando('shell', 'svc', 'wifi', 'disable');
  comando('shell', 'svc', 'data', 'disable');
  comando('shell', 'am', 'force-stop', pacote);
  comando('shell', 'am', 'start', '-n', `${pacote}/.MainActivity`);
  ({ navegador, pagina } = await conectar());
  await pagina.getByRole('heading', { name: /Minha primeira página/i }).first().waitFor({ timeout: 120_000 });
  assert.equal(await pagina.locator('#nome').count(), 0, 'O perfil deve persistir ao reiniciar.');
  await pagina.getByRole('button', { name: 'Ir para o laboratório' }).click();
  if(await pagina.getByRole('button',{name:/Próxima etapa/}).isVisible()){await pagina.getByRole('button',{name:/Próxima etapa/}).click();await pagina.getByRole('button',{name:/Próxima etapa/}).click();await pagina.getByLabel('Entendi o objetivo e sei qual resultado vou procurar.').check();await pagina.getByRole('button',{name:/Começar a construir/}).click();}
  await pagina.waitForFunction(texto => document.querySelector('.cm-content')?.textContent.includes(texto), marcador);
  evidencias.verificacoes.push('Rascunho do laboratorio persistiu apos encerrar e reabrir offline.');
  const semRede = await pagina.evaluate(() => !navigator.onLine);
  assert(semRede, 'A verificacao offline exige navigator.onLine=false.');
  evidencias.verificacoes.push('Aplicativo fechado e reaberto sem Wi-Fi/dados: perfil e aula persistiram.');
  await pagina.screenshot({ path: join(destino, 'android-aula-offline.png'), fullPage: true });
  writeFileSync(join(destino, 'android-tela-offline.png'), execFileSync(adb, ['-e', 'exec-out', 'screencap', '-p']));
  await navegador.close();
  evidencias.resultado = 'aprovado';
  console.log(evidencias.verificacoes.join('\n'));
} catch (erro) {
  evidencias.resultado = 'falhou';
  evidencias.erro = String(erro);
  process.exitCode = 1;
  console.error(erro);
} finally {
  evidencias.fim = new Date().toISOString();
  writeFileSync(join(destino, 'verificacao-android.json'), JSON.stringify(evidencias, null, 2));
}
