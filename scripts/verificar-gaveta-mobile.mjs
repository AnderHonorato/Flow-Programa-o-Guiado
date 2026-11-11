import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const navegador = await chromium.launch({headless:true});
try {
  const pagina = await navegador.newPage({viewport:{width:390,height:844}});
  await pagina.addInitScript(() => localStorage.setItem('flow-nome','Teste local'));
  await pagina.goto('http://127.0.0.1:4178',{waitUntil:'domcontentloaded'});
  const abrir = pagina.getByRole('button',{name:'Abrir navegação'});
  await abrir.click();
  const gaveta = pagina.getByRole('dialog',{name:'Menu de navegação'});
  await gaveta.waitFor();
  assert.equal(await pagina.locator('.corpo').getAttribute('inert'),'');
  assert.equal(await gaveta.getAttribute('aria-modal'),'true');
  await gaveta.getByRole('button',{name:'Fechar menu de navegação'}).click();
  assert.equal(await pagina.locator('.corpo').getAttribute('inert'),null);
  console.log('PASSOU: menu modal, conteúdo protegido e fechamento por toque');
} finally { await navegador.close(); }
