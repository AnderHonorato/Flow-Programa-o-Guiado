// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AudioProvider, useAudio, type AudioContexto } from './AudioProvider';
import { narradorNativo, plataformaNativa, type EventoNativo } from './nativo';
import { dividirTrechos, prepararTexto } from './texto';
vi.mock('./nativo', () => ({ plataformaNativa: vi.fn(() => false), narradorNativo: { vozes: vi.fn(), falar: vi.fn(), parar: vi.fn(), addListener: vi.fn() } }));
class FalaTeste {
  text: string; lang = ''; rate = 1; volume = 1; voice: unknown;
  onstart?: () => void; onresume?: () => void; onend?: () => void; onerror?: (evento: { error: string }) => void;
  constructor(texto: string) { this.text = texto; }
}
const br = { voiceURI: 'br', name: 'Brasil', lang: 'pt-BR', localService: false };
const en = { voiceURI: 'en', name: 'English', lang: 'en-US', localService: true };
const pt = { voiceURI: 'pt', name: 'Portugal', lang: 'pt-PT', localService: true };
let raiz: Root, elemento: HTMLDivElement, audio: AudioContexto, falas: FalaTeste[], lista: typeof br[];
let vozesMudaram: (() => void) | undefined;
const cancelar = vi.fn(), pausa = vi.fn(), retoma = vi.fn();
function Sonda() { audio = useAudio()!; return <p>{audio.estado}</p>; }
async function montar() { await act(async () => raiz.render(<AudioProvider><Sonda/></AudioProvider>)); }
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.useFakeTimers(); vi.clearAllMocks();
  vi.mocked(plataformaNativa).mockReturnValue(false);
  vi.mocked(narradorNativo.parar).mockResolvedValue();
  vi.mocked(narradorNativo.falar).mockResolvedValue();
  elemento = document.createElement('div'); document.body.append(elemento); raiz = createRoot(elemento);
  falas = []; lista = [pt, en, br]; vozesMudaram = undefined;
  vi.stubGlobal('SpeechSynthesisUtterance', FalaTeste);
  vi.stubGlobal('speechSynthesis', { getVoices: () => lista, addEventListener: (tipo: string, callback: () => void) => { if (tipo === 'voiceschanged') vozesMudaram = callback; }, removeEventListener: vi.fn(), cancel: cancelar, pause: pausa, resume: retoma, speak: (fala: FalaTeste) => falas.push(fala) });
});
afterEach(async () => { await act(async () => raiz.unmount()); elemento.remove(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('idiomas e sessão compartilhada do narrador', () => {
  it('começa silencioso em pt-BR e prefere voz brasileira online a Portugal ou inglês locais', async () => {
    await montar(); expect(falas).toHaveLength(0); expect(audio.idioma).toBe('pt-BR'); expect(audio.vozId).toBe('br');
    expect(audio.vozes.map(v => v.id)).toEqual(['br', 'en']);
    await act(async () => audio.ler({ blocos: ['HTML e CSS.'], origem: 'aula' }));
    expect(falas[0].voice).toBe(br); expect(falas[0].lang).toBe('pt-BR'); expect(falas[0].text).toContain('agá tê eme ele');
    expect(audio.estado).toBe('preparando');
    await act(async () => falas[0].onstart?.()); expect(audio.estado).toBe('falando');
  });
  it('não usa idioma do sistema nem voz estrangeira enquanto aguarda voiceschanged', async () => {
    lista = [pt, en, { ...br, voiceURI: 'es', lang: 'es-ES' }]; await montar();
    expect(audio.vozId).toBe('');
    await act(async () => audio.ler({ blocos: ['Um.'], origem: 'aula' })); expect(falas).toHaveLength(0); expect(audio.estado).toBe('erro');
    lista.push({ ...br, lang: 'pt_BR' }); await act(async () => vozesMudaram?.()); expect(audio.vozId).toBe('br');
    await act(async () => audio.ler({ blocos: ['Agora sim.'], origem: 'aula' })); expect(falas[0].lang).toBe('pt-BR');
  });
  it('permite inglês somente após escolha explícita e cancela a sessão ao mudar o idioma', async () => {
    await montar(); await act(async () => audio.ler({ blocos: ['HTML permanece em português.'], origem: 'aula' }));
    await act(async () => audio.definirIdioma('en')); expect(audio.estado).toBe('parada'); expect(audio.vozId).toBe('en');
    await act(async () => audio.ler({ blocos: ['HTML permanece em português.'], origem: 'assistente' }));
    expect(falas[1].lang).toBe('en-US'); expect(falas[1].text).toBe('HTML permanece em português.');
    await act(async () => falas[0].onstart?.()); expect(audio.estado).toBe('preparando');
  });
  it('só sinaliza falando após início real e respeita pausa, retomada, fim e parada', async () => {
    await montar(); const destacar = vi.fn();
    await act(async () => audio.ler({ blocos: ['Um.', 'Dois.'], origem: 'aula', aoDestacar: destacar }));
    expect(destacar).not.toHaveBeenCalled(); expect(audio.estado).toBe('preparando');
    await act(async () => falas[0].onstart?.()); expect(destacar).toHaveBeenCalledWith(0);
    await act(async () => audio.pausar()); expect(audio.estado).toBe('pausada'); expect(pausa).toHaveBeenCalledOnce();
    await act(async () => audio.retomar()); expect(audio.estado).toBe('falando'); expect(retoma).toHaveBeenCalledOnce();
    await act(async () => falas[0].onend?.()); expect(audio.estado).toBe('preparando');
    await act(async () => vi.advanceTimersByTime(350)); expect(falas[1].text).toBe('Dois.');
    await act(async () => falas[1].onstart?.()); expect(audio.indice).toBe(1);
    await act(async () => falas[1].onend?.()); expect(audio.estado).toBe('parada'); expect(audio.origem).toBeNull();
    await act(async () => audio.parar()); expect(audio.indice).toBe(-1); expect(audio.texto).toBe('');
  });
  it('um termo substitui a aula e eventos antigos nunca reiniciam o áudio anterior', async () => {
    await montar(); await act(async () => audio.ler({ blocos: ['Aula.', 'Não deve tocar.'], origem: 'aula' }));
    await act(async () => falas[0].onstart?.()); await act(async () => audio.ler({ blocos: ['Variável guarda um valor.'], origem: 'termo' }));
    expect(audio.origem).toBe('termo');
    await act(async () => { falas[0].onend?.(); falas[0].onerror?.({ error: 'synthesis-failed' }); vi.advanceTimersByTime(500); });
    expect(falas).toHaveLength(2); expect(audio.estado).toBe('preparando');
    await act(async () => falas[1].onstart?.()); expect(audio.estado).toBe('falando'); expect(audio.texto).toBe('Variável guarda um valor.');
  });
  it('pausar no intervalo impede o próximo parágrafo até retomar', async () => {
    await montar(); await act(async () => audio.ler({ blocos: ['Um.', 'Dois.'], origem: 'aula' }));
    await act(async () => { falas[0].onstart?.(); falas[0].onend?.(); });
    await act(async () => audio.pausar()); await act(async () => vi.advanceTimersByTime(1000)); expect(falas).toHaveLength(1);
    await act(async () => audio.retomar()); expect(falas[1].text).toBe('Dois.'); expect(audio.estado).toBe('preparando');
  });
  it('erro ou ausência de início real encerra a indicação de fala sem avançar a aula', async () => {
    await montar(); await act(async () => audio.ler({ blocos: ['Um.', 'Dois.'], origem: 'aula' }));
    await act(async () => { falas[0].onstart?.(); falas[0].onerror?.({ error: 'synthesis-failed' }); vi.advanceTimersByTime(500); });
    expect(audio.estado).toBe('erro'); expect(falas).toHaveLength(1);
    await act(async () => audio.ler({ blocos: ['Outro.'], origem: 'assistente' }));
    await act(async () => vi.advanceTimersByTime(15000)); expect(audio.estado).toBe('erro'); expect(audio.erro).toContain('não começou');
    await act(async () => falas[1].onstart?.()); expect(audio.estado).toBe('erro');
  });
  it('repetir invalida callbacks anteriores e aplica ajustes ao novo trecho', async () => {
    await montar(); await act(async () => audio.ler({ blocos: ['Um.', 'Dois.'], origem: 'aula', inicio: 1 }));
    await act(async () => { audio.definirVelocidade(1.5); audio.definirVolume(.3); });
    await act(async () => audio.repetir()); expect(falas[1].text).toBe('Dois.'); expect(falas[1].rate).toBe(1.5); expect(falas[1].volume).toBe(.3);
    await act(async () => falas[0].onend?.()); expect(audio.estado).toBe('preparando');
  });
});

describe('narração local Android', () => {
  it('usa eventos de início/fim do plugin e ignora finalização de uma fala cancelada', async () => {
    vi.mocked(plataformaNativa).mockReturnValue(true);
    vi.mocked(narradorNativo.vozes).mockResolvedValue({ vozes: [ { id: 'pt-pt', nome: 'Portugal', idioma: 'pt-PT', local: true }, { id: 'br', nome: 'Brasil', idioma: 'pt-BR', local: true }, { id: 'en', nome: 'English', idioma: 'en-GB', local: true } ] });
    const ouvintes: Record<string, (evento: EventoNativo) => void> = {};
    vi.mocked(narradorNativo.addListener).mockImplementation(async (tipo, callback) => { ouvintes[tipo] = callback; return { remove: vi.fn(async () => {}) }; });
    await montar(); expect(audio.modo).toBe('nativo'); expect(audio.vozes.map(v => v.id)).toEqual(['br', 'en']);
    await act(async () => audio.ler({ blocos: ['Parágrafo.'], origem: 'aula' }));
    const primeira = vi.mocked(narradorNativo.falar).mock.calls[0][0];
    expect(primeira.idioma).toBe('pt-BR'); expect(audio.estado).toBe('preparando');
    await act(async () => ouvintes.inicio({ id: primeira.id })); expect(audio.estado).toBe('falando');
    await act(async () => audio.pausar()); expect(audio.estado).toBe('pausada');
    await act(async () => ouvintes.fim({ id: primeira.id, cancelado: true })); expect(audio.estado).toBe('pausada');
    await act(async () => audio.retomar()); const segunda = vi.mocked(narradorNativo.falar).mock.calls[1][0];
    expect(segunda.id).not.toBe(primeira.id); expect(audio.estado).toBe('preparando');
    await act(async () => ouvintes.inicio({ id: segunda.id })); expect(audio.estado).toBe('falando');
    await act(async () => ouvintes.fim({ id: segunda.id })); expect(audio.estado).toBe('parada');
    await act(async () => audio.definirIdioma('en')); await act(async () => audio.ler({ blocos: ['Termo.'], origem: 'termo' }));
    expect(vi.mocked(narradorNativo.falar).mock.calls[2][0].idioma).toBe('en-GB');
  });
});

it('divide conteúdo longo abaixo do limite nativo sem perder índices e preserva texto inglês', () => {
  const trechos = dividirTrechos(['Ignorado.', 'Palavra. '.repeat(900)], 'pt-BR', 1);
  expect(trechos.length).toBeGreaterThan(1); expect(trechos.every(t => t.texto.length <= 3300 && t.indice === 1)).toBe(true);
  expect(prepararTexto('HTML `body` ```const segredo = 1```', 'en')).toBe('HTML body There is a code example to read in the laboratory.');
});
