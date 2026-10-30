// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { parse } from 'acorn';
import type { Aula } from '../../../../contratos/tipos';
import { catalogoIncluido } from '../offline/catalogo';
import ExemplosGuiados, { ExperimentoGuiado } from './ExemplosGuiados';
import PreparacaoDesafio from './PreparacaoDesafio';
import { calcularExperimento, modeloDaAula, valoresIniciais } from './modeloExperimento';
import { planoDaMissao } from './planoDaMissao';

const aulas = catalogoIncluido.trilhas.flatMap(t => t.modulos.flatMap(m => m.aulas));
const aula = (id: string) => aulas.find(a => a.id === id)!;
let raiz: Root;
let elemento: HTMLDivElement;
beforeEach(() => { Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true }); elemento = document.createElement('div'); document.body.append(elemento); raiz = createRoot(elemento); });
afterEach(async () => { await act(async () => raiz.unmount()); elemento.remove(); });
const botao = (texto: string) => [...elemento.querySelectorAll('button')].find(b => b.textContent?.includes(texto))!;

it('cobre cada aula publicada com modelo ligado ao conteúdo e código correspondente', () => {
  expect(aulas).toHaveLength(30);
  const titulos = new Set<string>();
  for (const a of aulas) {
    const modelo = modeloDaAula(a);
    titulos.add(modelo.titulo);
    const resultado = calcularExperimento(a, valoresIniciais(modelo));
    expect(planoDaMissao(a)).toHaveLength(4);
    expect(planoDaMissao(a).every(p => p.orientacao.length > 30)).toBe(true);
    expect(resultado.codigo.length).toBeGreaterThan(20);
    expect(resultado.resultado).toBeTruthy();
    expect(resultado.explicacao).toBeTruthy();
    for (const c of modelo.controles.filter(c => c.tipo === 'numero')) {
      expect(calcularExperimento(a, { [c.id]: 'NaN' }).resultado).not.toContain('NaN');
      expect(calcularExperimento(a, { [c.id]: 'Infinity' }).resultado).not.toContain('Infinity');
    }
  }
  expect(titulos.size).toBe(30);
});

it('calcula condições de fronteira, tipos e dados ausentes sem avaliar código arbitrário', () => {
  expect(calcularExperimento(aula('js-funcoes'), { idade: '12' }).resultado).toBe('0');
  expect(calcularExperimento(aula('js-funcoes'), { idade: '13' }).resultado).toBe('15');
  expect(calcularExperimento(aula('js-valores'), { quantidade: '3' }).resultado).toBe('Antes: 123 (texto)\nDepois: 15 (número)');
  expect(calcularExperimento(aula('python-dicionarios'), { local: 'ausente', vagas: '0' }).resultado).toBe('A definir\nTrue\n0');
  expect(calcularExperimento(aula('python-funcoes'), { atraso: '-2' }).resultado).toContain('Devolução: 2');
  expect(calcularExperimento(aula('fullstack-contratos'), { entrada: 'zero' }).resultado).toContain('Aceito');
  expect(calcularExperimento(aula('fullstack-contratos'), { entrada: 'texto' }).resultado).toContain('Rejeitado');
  expect(calcularExperimento(aula('css-box-model'), { padding: '16', modelo: 'content-box' }).resultado).toContain('236px');
  expect(calcularExperimento(aula('css-box-model'), { padding: '16', modelo: 'border-box' }).resultado).toContain('200px');
  expect(calcularExperimento(aula('js-assincrono'), { status: '503' }).resultado).toBe('HTTP 503\nCarregamento encerrado');
});

it('os modelos JavaScript são programas válidos no contexto de script usado pelo laboratório', () => {
  for (const a of aulas.filter(a => ['javascript', 'dom', 'api'].includes(a.linguagem))) {
    const codigo = calcularExperimento(a, valoresIniciais(modeloDaAula(a))).codigo;
    expect(() => parse(codigo, { ecmaVersion: 2022, sourceType: 'script' }), a.id).not.toThrow();
  }
});

it('mantém texto livre inerte e a prévia sem scripts, rede ou origem compartilhada', async () => {
  const resultado = calcularExperimento(aula('html-primeira-pagina'), { conteudo: '<script>alert(1)</script><img src=x onerror=alert(2)>', tag: 'script' });
  const doc = new DOMParser().parseFromString(resultado.documento!, 'text/html');
  expect(doc.querySelector('script,img')).toBeNull();
  expect(doc.querySelector('h1')?.textContent).toContain('<script>');
  expect(doc.querySelector('[http-equiv="Content-Security-Policy"]')?.getAttribute('content')).toContain("default-src 'none'");
  await act(async () => raiz.render(<ExperimentoGuiado aula={aula('html-primeira-pagina')} />));
  expect(elemento.querySelector('iframe')?.getAttribute('sandbox')).toBe('');
});

it('avança a explicação editorial por linha antes de concluir os exemplos', async () => {
  const concluir = vi.fn();
  const a = aula('html-primeira-pagina');
  await act(async () => raiz.render(<ExemplosGuiados aula={a} aoConcluir={concluir} />));
  expect(botao('Passo anterior').disabled).toBe(true);
  expect(elemento.querySelector('.exemplo-raciocinio')?.textContent).toContain(a.exemplos[0].explicacao[0]);
  expect(elemento.querySelector('.exemplo-linha--ativa')?.textContent).toContain('<!doctype html>');
  await act(async () => botao('Próximo passo').click());
  expect(elemento.querySelector('.exemplo-raciocinio')?.textContent).toContain(a.exemplos[0].explicacao[1]);
  expect(concluir).not.toHaveBeenCalled();
  for (let i = 0; i < 100 && ![...elemento.querySelectorAll('button')].some(b => b.textContent?.includes('Entendi os exemplos')); i++) {
    await act(async () => (botao('Próximo passo') || botao('Explorar próximo exemplo')).click());
  }
  await act(async () => botao('Entendi os exemplos').click());
  expect(concluir).toHaveBeenCalledOnce();
});

it('permite experimentar eventos e reiniciar o estado sem premiar cliques', async () => {
  await act(async () => raiz.render(<ExperimentoGuiado aula={aula('dom-eventos')} />));
  await act(async () => botao('Adicionar interessado').click());
  await act(async () => botao('Adicionar interessado').click());
  expect(elemento.querySelector('output')?.textContent).toBe('2 interessados');
  await act(async () => botao('Reiniciar contagem').click());
  expect(elemento.querySelector('output')?.textContent).toBe('0 interessados');
});

it('ensina missão, plano e critérios antes de permitir iniciar o editor', async () => {
  const iniciar = vi.fn(), rever = vi.fn();
  const a = aula('python-funcoes');
  await act(async () => raiz.render(<PreparacaoDesafio aula={a} aoRever={rever} aoIniciar={iniciar} />));
  expect(elemento.textContent).toContain(a.desafio);
  expect(botao('Começar a construir')).toBeUndefined();
  await act(async () => botao('Rever a explicação').click());
  expect(rever).toHaveBeenCalledOnce();
  await act(async () => botao('Próxima etapa').click());
  expect(elemento.textContent).toContain('Devolva depois do laço');
  await act(async () => botao('Próxima etapa').click());
  expect(elemento.textContent).toContain(a.testes![0].descricao);
  expect(botao('Começar a construir').disabled).toBe(true);
  await act(async () => elemento.querySelector<HTMLInputElement>('input[type=checkbox]')!.click());
  await act(async () => botao('Começar a construir').click());
  expect(iniciar).toHaveBeenCalledOnce();
});

it('trocar de aula limpa o experimento e o preparo anterior', async () => {
  const props = { aoRever: () => {}, aoIniciar: () => {} };
  await act(async () => raiz.render(<PreparacaoDesafio aula={aula('python-funcoes')} {...props} />));
  await act(async () => botao('Próxima etapa').click());
  await act(async () => raiz.render(<PreparacaoDesafio aula={aula('html-primeira-pagina')} {...props} />));
  expect(elemento.querySelector('.preparacao-etapas .atual')?.textContent).toContain('Entender a missão');
  expect(elemento.textContent).toContain(aula('html-primeira-pagina').desafio);
});
