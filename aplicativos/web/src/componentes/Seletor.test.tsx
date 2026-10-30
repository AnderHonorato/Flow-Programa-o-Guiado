// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Seletor from './Seletor';
let raiz: Root; let elemento: HTMLDivElement;
beforeEach(() => { Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true }); elemento = document.createElement('div'); document.body.append(elemento); raiz = createRoot(elemento); });
afterEach(async () => { await act(async () => raiz.unmount()); elemento.remove(); });
const opcoes = [{ valor: '', rotulo: 'Escolher', desabilitado: true }, { valor: 'pt', rotulo: 'Português Brasil' }, { valor: 'en', rotulo: 'Inglês' }];
const tecla = async (key: string) => { await act(async () => elemento.querySelector('button')!.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))); };
describe('seletor desenhado do Flow', () => {
  it('navega sem confirmar, pula indisponíveis e confirma por teclado mantendo o foco', async () => {
    const mudar = vi.fn();
    await act(async () => raiz.render(<Seletor rotulo="Idioma" valor="pt" opcoes={opcoes} aoMudar={mudar}/>));
    elemento.querySelector('button')!.focus(); await tecla('ArrowDown'); await tecla('End');
    expect(mudar).not.toHaveBeenCalled();
    expect(document.querySelector('[role=listbox] [aria-selected=true]')?.textContent).toContain('Português');
    await tecla('Enter'); expect(mudar).toHaveBeenCalledWith('en');
    expect(document.activeElement).toBe(elemento.querySelector('button')); expect(document.querySelector('[role=listbox]')).toBeNull();
  });
  it('fecha por Escape e Tab sem alterar e encontra opções por texto', async () => {
    const mudar = vi.fn(); await act(async () => raiz.render(<Seletor rotulo="Idioma" valor="pt" opcoes={opcoes} aoMudar={mudar}/>));
    await tecla('i'); expect(elemento.querySelector('button')?.getAttribute('aria-activedescendant')).toMatch(/-2$/);
    await tecla('Escape'); expect(mudar).not.toHaveBeenCalled(); expect(document.querySelector('[role=listbox]')).toBeNull();
    await tecla('Enter'); await tecla('Tab'); expect(document.querySelector('[role=listbox]')).toBeNull();
  });
  it('mantém valores de formulário e fecha ao tocar fora', async () => {
    await act(async () => raiz.render(<form><Seletor rotulo="Decisão" nome="status" valorInicial="pt" opcoes={opcoes}/></form>));
    await act(async () => elemento.querySelector('button')!.click());
    await act(async () => document.querySelector<HTMLElement>('[role=option][data-indice="2"]')!.click());
    expect(new FormData(elemento.querySelector('form')!).get('status')).toBe('en');
    await act(async () => elemento.querySelector('button')!.click());
    await act(async () => document.body.dispatchEvent(new Event('pointerdown', { bubbles: true })));
    expect(document.querySelector('[role=listbox]')).toBeNull();
  });
  it('não abre quando não há opções disponíveis', async () => {
    await act(async () => raiz.render(<Seletor rotulo="Versões" opcoes={[opcoes[0]]}/>));
    expect(elemento.querySelector('button')?.disabled).toBe(true);
  });
});
