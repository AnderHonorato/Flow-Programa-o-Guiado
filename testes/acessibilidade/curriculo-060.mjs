import { chromium } from '@playwright/test';
import axe from 'axe-core';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const ids = process.env.FLOW_QA_AMOSTRA
  ? ['html-tabelas', 'python-arquivos', 'projeto-calculadora']
  : ['fundamentos-algoritmos', 'html-tabelas', 'css-grid', 'js-escopo', 'dom-formularios', 'python-arquivos', 'frontend-estado', 'api-validacao', 'fullstack-sessao', 'projeto-calculadora'];
const catalogo = JSON.parse(await readFile(new URL('../../conteudos/catalogo.json', import.meta.url), 'utf8'));
const aulas = catalogo.trilhas.flatMap(t => t.modulos.flatMap(m => m.aulas));
const endereco = process.env.FLOW_QA_URL || 'http://127.0.0.1:4173';
const publico = new URL(endereco).hostname !== '127.0.0.1' && new URL(endereco).hostname !== 'localhost';
const destino = new URL(`../../docs/evidencias/curriculo-0.6.0/${publico ? 'publicado' : 'interface'}/`, import.meta.url).pathname;
await mkdir(destino, { recursive: true });
const proxy = publico && (process.env.HTTPS_PROXY || process.env.HTTP_PROXY);
const navegador = await chromium.launch({ headless: true, ...(proxy ? { proxy: { server: proxy } } : {}) });
const resultados = [];
try {
  for (const width of [390, 1440]) {
    for (const tema of ['claro', 'escuro']) {
      for (const id of ids) {
        const contexto = await navegador.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
        const pagina = await contexto.newPage();
        pagina.setDefaultTimeout(60000);
        const erros = [];
        pagina.on('pageerror', erro => erros.push(erro.message));
        await pagina.addInitScript(({ id, tema }) => {
          if (window !== window.top) return;
          localStorage.setItem('flow-nome', 'Aprendiz de demonstração');
          localStorage.setItem('flow-pagina', 'aula');
          localStorage.setItem('flow-aula', id);
          localStorage.setItem('flow-tema', tema);
        }, { id, tema });
        const aula = aulas.find(a => a.id === id);
        await pagina.goto(endereco);
        await pagina.getByRole('heading', { name: aula.titulo, exact: true }).waitFor();
        await pagina.locator('.experimento-saida').waitFor();
        await pagina.evaluate(axe.source);
        const auditoria = await pagina.evaluate(async () => window.axe.run(document, {
          iframes: false, runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] },
        }));
        const overflow = await pagina.evaluate(() => document.documentElement.scrollWidth > innerWidth);
        const modelo = await pagina.locator('.experimento-guiado h3').innerText();
        const resultado = await pagina.locator('.experimento-saida').innerText();
        const violacoes = auditoria.violations.map(v => ({ id: v.id, nos: v.nodes.map(n => ({ alvo: n.target, resumo: n.failureSummary })) }));
        // Amostras exportáveis; a auditoria cobre todas as quarenta telas.
        if (['html-tabelas', 'projeto-calculadora'].includes(id)) {
          await pagina.locator('.experimento-guiado').scrollIntoViewIfNeeded();
          await pagina.screenshot({ path: `${destino}${width}-${tema}-${id}.png` });
        }
        resultados.push({ id, width, tema, modelo, resultado, overflow, violacoes, erros });
        await contexto.close();
      }
    }
  }
} finally {
  await navegador.close();
  await writeFile(`${destino}interface.json`, JSON.stringify({ endereco, executadoEm: new Date().toISOString(), telas: resultados }, null, 2));
}
const falhas = resultados.filter(r => r.overflow || r.violacoes.length || r.erros.length || !r.resultado);
console.log(JSON.stringify({ telas: resultados.length, falhas }, null, 2));
if (falhas.length || resultados.length !== ids.length * 4) process.exitCode = 1;
