// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import BoasVindas from './BoasVindas';
import VerificacaoEntrada from './VerificacaoEntrada';

let raiz: Root; let elemento: HTMLDivElement;
beforeEach(() => { Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true }); elemento = document.createElement('div'); document.body.append(elemento); raiz = createRoot(elemento); });
afterEach(async () => { await act(async () => raiz.unmount()); elemento.remove(); });
const botao = (texto: string) => [...elemento.querySelectorAll('button')].find(e => e.textContent?.includes(texto))!;

describe('entrada visual do Flow', () => {
  it('permite começar localmente com nome e abrir uma conta sem navegação fictícia', async () => {
    const iniciar = vi.fn(), entrar = vi.fn();
    await act(async () => raiz.render(<BoasVindas aoIniciar={iniciar} aoEntrar={entrar} nomeInicial="Lia"/>));
    const label = elemento.querySelector('label')!; const campo = document.getElementById(label.htmlFor) as HTMLInputElement;
    expect(label.textContent).toBe('Como podemos chamar você?'); expect(campo.value).toBe('Lia');
    await act(async () => elemento.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    expect(iniciar).toHaveBeenCalledWith('Lia');
    await act(async () => botao('Entrar na minha conta').click()); expect(entrar).toHaveBeenCalledOnce();
    expect(elemento.querySelectorAll('h1')).toHaveLength(1);
    expect(elemento.querySelector('.entrada-flow-universo')?.getAttribute('aria-hidden')).toBe('true');
  });
  it('não inicia um perfil só de espaços e preserva os nomes de ações da interface anterior', async () => {
    const iniciar = vi.fn();
    await act(async () => raiz.render(<BoasVindas aoIniciar={iniciar} aoEntrar={() => {}} nomeInicial="   "/>));
    await act(async () => elemento.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    expect(iniciar).not.toHaveBeenCalled(); expect(botao('Começar no meu dispositivo')).toBeTruthy();
  });
});

describe('verificação de entrada controlada por etapas reais', () => {
  it('só apresenta conclusão das operações que o chamador já confirmou', async () => {
    await act(async () => raiz.render(<VerificacaoEntrada etapa="credenciais"/>));
    expect(elemento.querySelector('[role=status]')?.textContent).toBe('Conferindo acesso');
    expect(elemento.querySelectorAll('.concluida')).toHaveLength(0);
    expect(elemento.querySelector('[aria-current=step]')?.textContent).toContain('Conferindo acesso');
    await act(async () => raiz.render(<VerificacaoEntrada etapa="perfil"/>));
    expect(elemento.querySelectorAll('.concluida')).toHaveLength(2);
    expect(elemento.querySelector('[role=status]')?.textContent).toBe('Abrindo seu progresso');
    await act(async () => raiz.render(<VerificacaoEntrada etapa="pronto"/>));
    expect(elemento.querySelectorAll('.concluida')).toHaveLength(3);
    expect(elemento.querySelector('[aria-busy]')?.getAttribute('aria-busy')).toBe('false');
    expect(elemento.querySelector('[aria-current=step]')).toBeNull();
  });
  it('interrompe o estado ocupado e informa uma falha sem alegar uma análise de segurança concluída', async () => {
    await act(async () => raiz.render(<VerificacaoEntrada etapa="sessao" erro="A sessão foi revogada."/>));
    expect(elemento.querySelector('[role=alert]')?.textContent).toBe('A sessão foi revogada.');
    expect(elemento.querySelector('[aria-busy]')?.getAttribute('aria-busy')).toBe('false');
    expect(elemento.textContent).toContain('Interrompido');
    expect(elemento.querySelectorAll('.concluida')).toHaveLength(1);
    expect(elemento.textContent).not.toMatch(/100%|escaneando|roubo/i);
  });
});
