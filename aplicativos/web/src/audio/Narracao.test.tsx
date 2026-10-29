// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Narracao from './Narracao';

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false }, registerPlugin: () => ({}) }));

let raiz: Root;
let elemento: HTMLDivElement;
class FalaTeste {
  text: string; lang = ''; rate = 1; volume = 1; voice: unknown;
  onstart?: () => void; onend?: () => void; onerror?: (evento: { error: string }) => void;
  constructor(texto: string) { this.text = texto; }
}
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  elemento = document.createElement('div'); document.body.append(elemento);
  raiz = createRoot(elemento);
});
afterEach(async () => {
  await act(async () => raiz.unmount());
  elemento.remove(); vi.unstubAllGlobals(); vi.useRealTimers();
});
const botao = (texto: string) => [...elemento.querySelectorAll('button')].find(b => b.textContent?.includes(texto))!;

describe('narração da aula', () => {
  it('explica indisponibilidade sem iniciar reprodução automática', async () => {
    vi.stubGlobal('speechSynthesis', undefined);
    await act(async () => raiz.render(<Narracao blocos={['Primeiro parágrafo.']} />));
    expect(elemento.textContent).toContain('Narração indisponível');
    expect(elemento.textContent).toContain('Primeiro parágrafo.');
    expect(botao('Ouvir aula').disabled).toBe(true);
  });

  it('ouve, pausa, retoma e repete o trecho com uma voz local instalada', async () => {
    const falas: FalaTeste[] = [];
    let pausas = 0, retomadas = 0;
    vi.stubGlobal('SpeechSynthesisUtterance', FalaTeste);
    vi.stubGlobal('speechSynthesis', {
      getVoices: () => [{ voiceURI: 'pt-local', name: 'Português local', lang: 'pt-BR', localService: true }],
      addEventListener: () => {}, removeEventListener: () => {}, cancel: () => {},
      speak: (fala: FalaTeste) => { falas.push(fala); fala.onstart?.(); },
      pause: () => { pausas++; }, resume: () => { retomadas++; },
    });
    const destacados: number[] = [];
    await act(async () => raiz.render(<Narracao blocos={['Primeiro.', 'Segundo.']} aoDestacar={i => destacados.push(i)} />));
    expect(falas).toHaveLength(0);
    await act(async () => botao('Ouvir aula').click());
    expect(falas[0].text).toBe('Primeiro.');
    expect(destacados).toEqual([0]);
    await act(async () => botao('Pausar').click());
    expect(botao('Retomar')).toBeTruthy();
    await act(async () => botao('Retomar').click());
    expect(pausas).toBe(1); expect(retomadas).toBe(1);
    await act(async () => botao('Repetir trecho').click());
    expect(falas).toHaveLength(2);
    expect(falas[1].text).toBe('Primeiro.');
    expect(elemento.textContent).toContain('Voz local instalada');
  });

  it('começa pelo parágrafo escolhido e avança após uma pausa significativa', async () => {
    vi.useFakeTimers();
    const falas: FalaTeste[] = [];
    vi.stubGlobal('SpeechSynthesisUtterance', FalaTeste);
    vi.stubGlobal('speechSynthesis', {
      getVoices: () => [{ voiceURI: 'pt-br', name: 'Brasil', lang: 'pt-BR', localService: true }], addEventListener: () => {}, removeEventListener: () => {},
      cancel: () => {}, pause: () => {}, resume: () => {},
      speak: (fala: FalaTeste) => { falas.push(fala); fala.onstart?.(); },
    });
    await act(async () => raiz.render(<Narracao blocos={['Um.', 'Dois.', 'Três.']} />));
    await act(async () => elemento.querySelector<HTMLButtonElement>('[aria-label="Ler a partir do parágrafo 2"]')!.click());
    expect(falas[0].text).toBe('Dois.');
    await act(async () => { falas[0].onend?.(); vi.advanceTimersByTime(500); });
    expect(falas[1].text).toBe('Três.');
  });
});
