// @vitest-environment jsdom
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { chromium, type Browser, type Page } from '@playwright/test';
import { criarDocumento } from './sandbox';
let navegador: Browser;
let servidor: Server;
let origem: string;
async function abrir(codigo: string, html = '<h1 id="titulo">Minha biblioteca</h1>', testes = [{ id: 'titulo', tipo: 'texto', descricao: 'Título presente', seletor: 'h1', esperado: 'Minha biblioteca', propriedade: '' }]) {
  const pagina = await navegador.newPage();
  await pagina.goto(origem);
  await pagina.evaluate(() => { const destino = window as unknown as { mensagens: unknown[] }; destino.mensagens = []; addEventListener('message', evento => destino.mensagens.push(evento.data)); });
  const documento = criarDocumento({ html: `<!doctype html><html lang="pt-BR"><head><title>Biblioteca</title></head><body>${html}</body></html>`, css: 'h1{color:rgb(10, 20, 30)}', js: codigo }, 'segredo', testes);
  await pagina.locator('iframe').evaluate((quadro: HTMLIFrameElement, fonte) => { quadro.srcdoc = fonte; }, documento);
  await expect.poll(() => mensagens(pagina, 'pronto')).not.toHaveLength(0);
  return pagina;
}
async function mensagens(pagina: Page, tipo: string) { return pagina.evaluate(alvo => (window as unknown as { mensagens: { tipo: string; texto?: string; dados?: unknown }[] }).mensagens.filter(item => item.tipo === alvo), tipo); }
describe('execução real do iframe Chromium', () => {
  beforeAll(async () => {
    servidor = createServer((_, resposta) => { resposta.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); resposta.end('<!doctype html><html><head><title>Flow sandbox</title></head><body><iframe title="teste" sandbox="allow-scripts"></iframe></body></html>'); });
    await new Promise<void>(resolver => servidor.listen(0, '127.0.0.1', resolver));
    origem = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;
    navegador = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined), args: ['--no-sandbox', '--disable-gpu'], headless: true }); });
  afterAll(async () => { await navegador?.close(); if (servidor) await new Promise<void>(resolver => servidor.close(() => resolver())); });
  it('executa JS real, impede acesso ao pai e entrega testes do DOM', async () => {
    const pagina = await abrir('console.log(2+3);try{parent.document.body.innerHTML="ataque"}catch(e){console.log("origem isolada")}');
    expect((await mensagens(pagina, 'console')).map(item => item.texto)).toEqual(['5', 'origem isolada']);
    await pagina.locator('iframe').evaluate((quadro: HTMLIFrameElement) => quadro.contentWindow?.postMessage({ token: 'segredo', acao: 'testar' }, '*'));
    await expect.poll(() => mensagens(pagina, 'testes')).not.toHaveLength(0);
    expect((await mensagens(pagina, 'testes'))[0].dados).toMatchObject([{ aprovado: true }]);
    expect(await pagina.locator('iframe').count()).toBe(1);
    await pagina.close();
  });
  it('bloqueia fetch e imagens externas pela CSP e remove script HTML', async () => {
    const pagina = await abrir('fetch("https://egress.invalid/dado").catch(()=>console.log("rede bloqueada"));', '<h1>Minha biblioteca</h1><img src="https://egress.invalid/imagem"><script>console.log("bypass")</script>');
    await expect.poll(async () => (await mensagens(pagina, 'console')).map(item => item.texto)).toContain('rede bloqueada');
    expect((await mensagens(pagina, 'console')).some(item => item.texto === 'bypass')).toBe(false);
    await pagina.close();
  });
  it('interrompe laço infinito com erro acionável', async () => {
    const pagina = await abrir('while(true){}');
    expect((await mensagens(pagina, 'erro')).some(item => item.texto?.includes('limite de tempo'))).toBe(true);
    await pagina.close();
  });
  it('mantém eventos funcionais depois de o usuário aguardar', async () => {
    const pagina = await abrir('document.querySelector("button").addEventListener("click",()=>console.log("clicou"));', '<h1>Minha biblioteca</h1><button>Acionar</button>');
    await new Promise(resolver => setTimeout(resolver, 1400));
    await pagina.frameLocator('iframe').getByRole('button').click();
    expect((await mensagens(pagina, 'console')).some(item => item.texto === 'clicou')).toBe(true);
    await pagina.close();
  });
  it('verifica arrays JSON e exige a propriedade declarada no relatório', async () => {
    const testes = [{ id: 'nomes', descricao: 'Nomes das abertas', tipo: 'javascript', esperado: '["Leitura","Escrita"]', propriedade: 'json:nomes', seletor: '' }];
    const pagina = await abrir('console.log({outra:["Leitura","Escrita"]});', undefined, testes);
    await pagina.locator('iframe').evaluate((quadro: HTMLIFrameElement) => quadro.contentWindow?.postMessage({ token: 'segredo', acao: 'testar' }, '*'));
    await expect.poll(() => mensagens(pagina, 'testes')).not.toHaveLength(0);
    expect((await mensagens(pagina, 'testes'))[0].dados).toMatchObject([{ aprovado: false }]);
    await pagina.close();
    const correta = await abrir('const oficinas=[{nome:"Leitura",aberta:true},{nome:"Desenho",aberta:false},{nome:"Escrita",aberta:true}];console.log({nomes:oficinas.filter(o=>o.aberta).map(o=>o.nome)});', undefined, testes);
    await correta.locator('iframe').evaluate((quadro: HTMLIFrameElement) => quadro.contentWindow?.postMessage({ token: 'segredo', acao: 'testar' }, '*'));
    await expect.poll(() => mensagens(correta, 'testes')).not.toHaveLength(0);
    expect((await mensagens(correta, 'testes'))[0].dados).toMatchObject([{ aprovado: true }]);
    await correta.close();
  });
});
