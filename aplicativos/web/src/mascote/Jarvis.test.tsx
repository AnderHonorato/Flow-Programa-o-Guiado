// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Jarvis, { JarvisProvider } from './Jarvis';

const { ambienteAudio } = vi.hoisted(() => ({ ambienteAudio: { atual: null as null | Record<string, unknown> } }));
vi.mock('../audio/AudioProvider', () => ({ useAudio: () => ambienteAudio.atual }));

let raiz: Root;
let elemento: HTMLDivElement;
const buscarBotao = (nome: string) => document.querySelector<HTMLButtonElement>(`button[aria-label="${nome}"]`)!;
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  localStorage.clear(); ambienteAudio.atual = null;
  elemento = document.createElement('div'); document.body.append(elemento);
  raiz = createRoot(elemento);
});
afterEach(async () => {
  await act(async () => raiz.unmount());
  elemento.remove(); vi.useRealTimers(); localStorage.clear();
});

describe('presença de J.A.R.V.I.S', () => {
  it('mantém um único personagem e vincula qualquer balão à presença dele', async () => {
    await act(async () => raiz.render(<JarvisProvider><Jarvis mensagem="Bem-vindo à missão."/><Jarvis estado="explicando" mensagem="Entenda a estrutura antes de responder."/></JarvisProvider>));
    expect(document.querySelectorAll('[aria-label="Assistente J.A.R.V.I.S"]')).toHaveLength(1);
    expect(document.querySelectorAll('.jarvis-balao')).toHaveLength(1);
    const assistente = document.querySelector('.jarvis-dock')!;
    expect(assistente.querySelector('svg[role="img"]')).not.toBeNull();
    expect(assistente.querySelector('[role="status"]')?.textContent).toBe('Entenda a estrutura antes de responder.');
    expect(elemento.querySelector('[role="status"]')).toBeNull();
    await act(async () => buscarBotao('Minimizar J.A.R.V.I.S').click());
    expect(document.querySelector('.jarvis-balao')).toBeNull();
    expect(document.querySelector('[role="status"]')).toBeNull();
    expect(buscarBotao('Mostrar J.A.R.V.I.S')).not.toBeNull();
    await act(async () => buscarBotao('Mostrar J.A.R.V.I.S').click());
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
    await act(async () => buscarBotao('Silenciar dicas de J.A.R.V.I.S').click());
    expect(document.querySelector('.jarvis-balao')).toBeNull();
    expect(localStorage.getItem('flow.jarvis.silenciado')).toBe('sim');
    expect(document.querySelector('.jarvis-nucleo')).not.toBeNull();
    await act(async () => buscarBotao('Ativar dicas de J.A.R.V.I.S').click());
    expect(document.querySelector('[role="status"]')?.textContent).toBe('Vamos aprender.');
  });

  it('recolhe a dica automaticamente e mantém acesso por teclado ao assistente', async () => {
    vi.useFakeTimers();
    await act(async () => raiz.render(<JarvisProvider><Jarvis mensagem="Explore o exemplo."/></JarvisProvider>));
    await act(async () => vi.advanceTimersByTime(12000));
    expect(document.querySelector('.jarvis-balao')).toBeNull();
    await act(async () => buscarBotao('Conversar com J.A.R.V.I.S').click());
    const ativador = buscarBotao('Recolher balão de J.A.R.V.I.S');
    expect(ativador.getAttribute('aria-expanded')).toBe('true');
    expect(document.getElementById(ativador.getAttribute('aria-controls')!)?.textContent).toContain('Explore o exemplo.');
    await act(async () => ativador.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(document.querySelector('.jarvis-balao')).toBeNull();
    expect(document.activeElement).toBe(buscarBotao('Conversar com J.A.R.V.I.S'));
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
    expect(buscarBotao('Mostrar J.A.R.V.I.S')).not.toBeNull();
  });
});

function selecionar(elemento: Element, inicio = 0, fim?: number) {
  const texto = elemento.firstChild!;
  const intervalo = document.createRange(); intervalo.setStart(texto, inicio); intervalo.setEnd(texto, fim ?? texto.textContent!.length);
  window.getSelection()!.removeAllRanges(); window.getSelection()!.addRange(intervalo);
  document.dispatchEvent(new Event('selectionchange'));
}
async function esperarSelecao() { await act(async () => vi.advanceTimersByTime(250)); }
async function renderizar(conteudo: React.ReactNode) { await act(async () => raiz.render(<JarvisProvider>{conteudo}<Jarvis mensagem="Explore a aula."/></JarvisProvider>)); }

describe('interações e explicações locais', () => {
  it('corrige a grafia em toda a presença, inclusive nomes acessíveis', async () => {
    await renderizar(<p>Conteúdo</p>);
    expect(document.querySelector('.jarvis-identidade strong')?.textContent).toBe('J.A.R.V.I.S');
    expect(document.body.innerHTML).not.toContain('J.A.R.V.IS');
    expect(buscarBotao('Pausar animações de J.A.R.V.I.S')).toBeTruthy();
  });
  it('reage a ações declaradas, preserva foco e reduz rajadas de cliques', async () => {
    vi.useFakeTimers();
    await renderizar(<><button data-jarvis-reacao="surpreso" data-jarvis-mensagem="Luzes ajustadas!">Tema</button><button data-jarvis-reacao="alegre" data-jarvis-mensagem="Nova pista!">Pista</button></>);
    const tema = elemento.querySelector<HTMLButtonElement>('button')!;
    await act(async () => { tema.focus(); tema.click(); });
    expect(document.querySelector('.jarvis-dock')?.getAttribute('data-estado')).toBe('surpreso');
    expect(document.querySelector('.jarvis-mensagem')?.textContent).toBe('Luzes ajustadas!');
    expect(document.activeElement).toBe(tema);
    await act(async () => elemento.querySelectorAll<HTMLButtonElement>('button')[1].click());
    expect(document.querySelector('.jarvis-mensagem')?.textContent).toBe('Luzes ajustadas!');
    await act(async () => vi.advanceTimersByTime(800));
    await act(async () => elemento.querySelectorAll<HTMLButtonElement>('button')[1].click());
    expect(document.querySelector('.jarvis-mensagem')?.textContent).toBe('Nova pista!');
  });
  it('explica palavra selecionada sem iniciar áudio e descarta seleção externa', async () => {
    vi.useFakeTimers(); const ler = vi.fn();
    ambienteAudio.atual = { estado: 'parada', volume: 1, modo: 'web', vozId: 'br', ler };
    await renderizar(<><article data-jarvis-conteudo><p>HTML organiza conteúdo.</p></article><p className="fora">CSS</p></>);
    selecionar(elemento.querySelector('article p')!, 0, 4); await esperarSelecao();
    expect(document.querySelector('.jarvis-termo strong')?.textContent).toBe('HTML');
    expect(document.querySelector('.jarvis-mensagem')?.textContent).toContain('estrutura de uma casa');
    expect(ler).not.toHaveBeenCalled();
    await act(async () => [...document.querySelectorAll<HTMLButtonElement>('.jarvis-audio button')][0].click());
    expect(ler).toHaveBeenCalledWith(expect.objectContaining({ origem: 'termo', blocos: [expect.stringContaining('HTML organiza')] }));
    selecionar(elemento.querySelector('.fora')!); await esperarSelecao();
    expect(document.querySelector('.jarvis-balao')).toBeNull();
    expect(document.querySelector('.jarvis-nucleo')).toBeTruthy();
  });
  it('recusa conteúdo de editor, questões e seleções entre regiões', async () => {
    vi.useFakeTimers();
    await renderizar(<><article data-jarvis-conteudo><p>HTML</p><div className="cm-editor"><p>segredo</p></div><fieldset><p>resposta</p></fieldset></article><article data-jarvis-conteudo><p>CSS</p></article></>);
    selecionar(elemento.querySelector('.cm-editor p')!); await esperarSelecao();
    expect(document.querySelector('.jarvis-termo')).toBeNull();
    selecionar(elemento.querySelector('fieldset p')!); await esperarSelecao();
    expect(document.querySelector('.jarvis-termo')).toBeNull();
    const intervalo = document.createRange(); intervalo.setStart(elemento.querySelector('article p')!.firstChild!, 0); intervalo.setEnd(elemento.querySelectorAll('article')[1].querySelector('p')!.firstChild!, 3);
    window.getSelection()!.removeAllRanges(); window.getSelection()!.addRange(intervalo);
    document.dispatchEvent(new Event('selectionchange')); await esperarSelecao();
    expect(document.querySelector('.jarvis-termo')).toBeNull();
  });
  it('não inventa definição de termo desconhecido e oferece consulta por teclado', async () => {
    await renderizar(<p>Conteúdo</p>);
    await act(async () => buscarBotao('Interagir com J.A.R.V.I.S').click());
    const explorar = [...document.querySelectorAll<HTMLButtonElement>('.jarvis-acoes button')].find(b => b.textContent?.includes('Explorar termo'))!;
    await act(async () => explorar.click());
    const entrada = document.querySelector<HTMLInputElement>('.jarvis-consulta input')!;
    expect(document.activeElement).toBe(entrada);
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(entrada, 'coisa misteriosa');
      entrada.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => document.querySelector('.jarvis-consulta')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    expect(document.querySelector('.jarvis-mensagem')?.textContent).toContain('ainda não tem uma definição no meu glossário local');
    expect(document.querySelector('.jarvis-termo strong')?.textContent).toBe('coisa misteriosa');
  });
  it('brinca com piadas e braveza sem ofender ou disparar leitura', async () => {
    const ler = vi.fn(); ambienteAudio.atual = { estado: 'parada', volume: 1, modo: 'web', vozId: 'br', ler };
    await renderizar(<p>Conteúdo</p>);
    await act(async () => buscarBotao('Interagir com J.A.R.V.I.S').click());
    await act(async () => [...document.querySelectorAll<HTMLButtonElement>('.jarvis-acoes button')].find(b => b.textContent?.includes('Uma piada'))!.click());
    expect(document.querySelector('.jarvis-dock')?.getAttribute('data-estado')).toBe('brincalhao');
    expect(document.querySelector('.jarvis-mensagem')?.textContent).toContain('subir de nível');
    await act(async () => [...document.querySelectorAll<HTMLButtonElement>('.jarvis-acoes button')].find(b => b.textContent?.includes('Fingir braveza'))!.click());
    expect(document.querySelector('.jarvis-dock')?.getAttribute('data-estado')).toBe('bravo');
    expect(document.querySelector('.jarvis-mensagem')?.textContent).toContain('É só brincadeira');
    expect(ler).not.toHaveBeenCalled();
  });
  it('respeita silêncio e minimização nas reações automáticas', async () => {
    vi.useFakeTimers(); localStorage.setItem('flow.jarvis.silenciado', 'sim');
    await renderizar(<article data-jarvis-conteudo><p>HTML</p><button data-jarvis-reacao="surpreso">Tema</button></article>);
    await act(async () => elemento.querySelector<HTMLButtonElement>('button')!.click());
    selecionar(elemento.querySelector('p')!); await esperarSelecao();
    expect(document.querySelector('.jarvis-balao')).toBeNull();
    expect(document.querySelector('.jarvis-dock')?.getAttribute('data-estado')).toBe('curioso');
  });
  it('não anuncia dicas por cima de um diálogo modal', async () => {
    await renderizar(<div role="dialog" aria-modal="true"><button data-jarvis-reacao="surpreso">Salvar</button></div>);
    expect((document.querySelector('.jarvis-dock') as HTMLElement).hidden).toBe(true);
    await act(async () => elemento.querySelector<HTMLButtonElement>('button')!.click());
    expect(document.querySelector('.jarvis-dock')?.getAttribute('data-estado')).toBe('curioso');
  });
});

describe('sincronia visual com o narrador', () => {
  it('vibra apenas durante fala confirmada e mantém o indicador junto ao núcleo', async () => {
    ambienteAudio.atual = { estado: 'preparando', volume: 1, modo: 'web', vozId: 'br' };
    await renderizar(<p>Conteúdo</p>);
    expect(document.querySelector('.jarvis-dock--falando')).toBeNull();
    expect(document.querySelector('.jarvis-presenca .jarvis-fala-status')?.textContent).toBe('Preparando voz...');
    ambienteAudio.atual = { ...ambienteAudio.atual, estado: 'falando' }; await renderizar(<p>Conteúdo</p>);
    expect(document.querySelector('.jarvis-dock--falando')).toBeTruthy();
    expect(document.querySelector('.jarvis-fala-status')?.textContent).toBe('Falando...');
    await act(async () => buscarBotao('Minimizar J.A.R.V.I.S').click());
    expect(document.querySelector('.jarvis-balao')).toBeNull();
    expect(document.querySelector('.jarvis-presenca .jarvis-fala-status')?.textContent).toBe('Falando...');
    ambienteAudio.atual = { ...ambienteAudio.atual, estado: 'pausada' }; await renderizar(<p>Conteúdo</p>);
    expect(document.querySelector('.jarvis-dock--falando')).toBeNull();
    expect(document.querySelector('.jarvis-fala-status')?.textContent).toBe('Leitura pausada');
    ambienteAudio.atual = { ...ambienteAudio.atual, estado: 'parada' }; await renderizar(<p>Conteúdo</p>);
    expect(document.querySelector('.jarvis-fala-status')).toBeNull();
  });
  it('indica volume zero sem fingir voz audível', async () => {
    ambienteAudio.atual = { estado: 'falando', volume: 0, modo: 'web', vozId: 'br' };
    await renderizar(<p>Conteúdo</p>);
    expect(document.querySelector('.jarvis-dock--falando')).toBeNull();
    expect(document.querySelector('.jarvis-fala-status')?.textContent).toContain('volume zero');
  });
  it('reação durante aula em áudio não interrompe nem reinicia a narração', async () => {
    const parar = vi.fn(), ler = vi.fn(); ambienteAudio.atual = { estado: 'falando', volume: 1, modo: 'web', vozId: 'br', parar, ler };
    await renderizar(<button data-jarvis-reacao="surpreso" data-jarvis-mensagem="Experimento alterado!">Experimento</button>);
    await act(async () => elemento.querySelector<HTMLButtonElement>('button')!.click());
    expect(document.querySelector('.jarvis-dock--falando')).toBeTruthy();
    expect(document.querySelector('.jarvis-mensagem')?.textContent).toBe('Experimento alterado!');
    expect(ler).not.toHaveBeenCalled(); expect(parar).not.toHaveBeenCalled();
  });
});
