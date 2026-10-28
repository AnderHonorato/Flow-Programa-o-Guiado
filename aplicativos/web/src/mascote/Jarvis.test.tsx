// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Jarvis, { JarvisProvider } from './Jarvis';

let raiz: Root;
let elemento: HTMLDivElement;
const buscarBotao = (nome: string) => document.querySelector<HTMLButtonElement>(`button[aria-label="${nome}"]`)!;
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  localStorage.clear();
  elemento = document.createElement('div'); document.body.append(elemento);
  raiz = createRoot(elemento);
});
afterEach(async () => {
  await act(async () => raiz.unmount());
  elemento.remove(); vi.useRealTimers(); localStorage.clear();
});

describe('presença de J.A.R.V.IS.', () => {
  it('mantém um único personagem e vincula qualquer balão à presença dele', async () => {
    await act(async () => raiz.render(<JarvisProvider><Jarvis mensagem="Bem-vindo à missão."/><Jarvis estado="explicando" mensagem="Entenda a estrutura antes de responder."/></JarvisProvider>));
    expect(document.querySelectorAll('[aria-label="Assistente J.A.R.V.IS."]')).toHaveLength(1);
    expect(document.querySelectorAll('.jarvis-balao')).toHaveLength(1);
    const assistente = document.querySelector('.jarvis-dock')!;
    expect(assistente.querySelector('svg[role="img"]')).not.toBeNull();
    expect(assistente.querySelector('[role="status"]')?.textContent).toBe('Entenda a estrutura antes de responder.');
    expect(elemento.querySelector('[role="status"]')).toBeNull();
    await act(async () => buscarBotao('Minimizar J.A.R.V.IS.').click());
    expect(document.querySelector('.jarvis-balao')).toBeNull();
    expect(document.querySelector('[role="status"]')).toBeNull();
    expect(buscarBotao('Mostrar J.A.R.V.IS.')).not.toBeNull();
    await act(async () => buscarBotao('Mostrar J.A.R.V.IS.').click());
    expect(document.querySelector('[role="status"]')?.textContent).toBe('Entenda a estrutura antes de responder.');
  });

  it('desativa fontes fora da etapa e não conserva a dica ao sair da tela', async () => {
    const tela = (laboratorio: boolean) => <JarvisProvider><Jarvis ativo={!laboratorio} mensagem="Leia primeiro o exemplo."/><Jarvis ativo={laboratorio} mensagem="Agora escreva a solução no editor."/></JarvisProvider>;
    await act(async () => raiz.render(tela(false)));
    expect(document.querySelector('[role="status"]')?.textContent).toBe('Leia primeiro o exemplo.');
    await act(async () => raiz.render(tela(true)));
    expect(document.querySelector('[role="status"]')?.textContent).toBe('Agora escreva a solução no editor.');
    await act(async () => raiz.render(<JarvisProvider><p>Outra tela</p></JarvisProvider>));
    expect(document.querySelector('.jarvis-balao')).toBeNull();
  });

  it('silencia as dicas sem deixar um balão vazio e permite reativar pelo núcleo', async () => {
    await act(async () => raiz.render(<JarvisProvider><Jarvis mensagem="Vamos aprender."/></JarvisProvider>));
    await act(async () => buscarBotao('Silenciar dicas de J.A.R.V.IS.').click());
    expect(document.querySelector('.jarvis-balao')).toBeNull();
    expect(localStorage.getItem('flow.jarvis.silenciado')).toBe('sim');
    expect(document.querySelector('.jarvis-nucleo')).not.toBeNull();
    await act(async () => buscarBotao('Ativar dicas de J.A.R.V.IS.').click());
    expect(document.querySelector('[role="status"]')?.textContent).toBe('Vamos aprender.');
  });

  it('recolhe a dica automaticamente e mantém acesso por teclado ao assistente', async () => {
    vi.useFakeTimers();
    await act(async () => raiz.render(<JarvisProvider><Jarvis mensagem="Explore o exemplo."/></JarvisProvider>));
    await act(async () => vi.advanceTimersByTime(12000));
    expect(document.querySelector('.jarvis-balao')).toBeNull();
    await act(async () => buscarBotao('Conversar com J.A.R.V.IS.').click());
    const ativador = buscarBotao('Recolher balão de J.A.R.V.IS.');
    expect(ativador.getAttribute('aria-expanded')).toBe('true');
    expect(document.getElementById(ativador.getAttribute('aria-controls')!)?.textContent).toContain('Explore o exemplo.');
    await act(async () => ativador.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(document.querySelector('.jarvis-balao')).toBeNull();
    expect(document.activeElement).toBe(buscarBotao('Conversar com J.A.R.V.IS.'));
  });

  it('recolhe o balão ao estudar fora dele, preservando o personagem no canto', async () => {
    await act(async () => raiz.render(<JarvisProvider><button>Responder questão</button><Jarvis mensagem="Leia o exemplo."/></JarvisProvider>));
    expect(document.querySelector('.jarvis-balao')).not.toBeNull();
    await act(async () => elemento.querySelector('button')!.dispatchEvent(new Event('pointerdown', { bubbles: true })));
    expect(document.querySelector('.jarvis-balao')).toBeNull();
    expect(document.querySelector('.jarvis-nucleo')).not.toBeNull();
  });

  it('respeita a preferência de minimizar ao iniciar uma nova sessão', async () => {
    localStorage.setItem('flow.jarvis.minimizado', 'sim');
    await act(async () => raiz.render(<JarvisProvider><Jarvis mensagem="Esta dica não deve abrir sozinha."/></JarvisProvider>));
    expect(document.querySelector('.jarvis-balao')).toBeNull();
    expect(buscarBotao('Mostrar J.A.R.V.IS.')).not.toBeNull();
  });
});
