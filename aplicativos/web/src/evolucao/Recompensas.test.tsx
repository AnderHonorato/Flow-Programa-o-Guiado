// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CelebracaoRecompensas, ColecaoEmblemas } from './Recompensas';
import { registrarHistorico, type EstadoRecompensas } from './historico';

let elemento: HTMLDivElement;
let raiz: ReturnType<typeof createRoot>;
const instante = '2026-10-29T12:30:00.000Z';
const vazio: EstadoRecompensas = { aulasConcluidas: [], respostas: {} };
const novo = (aulas: number, acertos = 1): EstadoRecompensas => {
  const estado = { aulasConcluidas: Array.from({ length: aulas }, (_, i) => `aula-${i}`), respostas: Object.fromEntries(Array.from({ length: acertos }, (_, i) => [`questao-${i}`, true])) };
  return { ...estado, historicoConquistas: registrarHistorico(vazio, estado, instante) };
};
const botao = (nome: string) => [...document.querySelectorAll<HTMLButtonElement>('button')].find(b => (b.getAttribute('aria-label') ?? b.textContent ?? '').includes(nome))!;
const titulo = () => elemento.querySelector('h2')?.textContent;
const render = async (estado: EstadoRecompensas, perfilId = 'perfil-a', pronto = true) => {
  await act(async () => raiz.render(<CelebracaoRecompensas estado={estado} perfilId={perfilId} pronto={pronto}/>));
};

beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(instante);
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  elemento = document.createElement('div'); document.body.append(elemento); raiz = createRoot(elemento);
});
afterEach(async () => {
  await act(async () => raiz.unmount()); elemento.remove(); vi.restoreAllMocks(); vi.useRealTimers();
});

describe('revelação de recompensas', () => {
  it('revela todos os emblemas e níveis de uma ação, com descrição e aquisição', async () => {
    await render(vazio);
    const estado = novo(1); const salvo = JSON.stringify(estado);
    await render(estado);
    expect(titulo()).toBe('Primeira conexão');
    expect(elemento.textContent).toContain('Acertar uma questão após enviar a avaliação.');
    expect(elemento.querySelector('time')?.dateTime).toBe(instante);
    expect(elemento.textContent).toContain('3 recompensas para celebrar');
    await act(async () => botao('Fechar celebração atual').click());
    expect(titulo()).toBe('Primeira criação');
    expect(elemento.textContent).toContain('Registrar a competência de uma aula.');
    await act(async () => botao('Próxima recompensa').click());
    expect(titulo()).toBe('Explorador');
    await act(async () => botao('Continuar').click());
    expect(elemento.querySelector('aside')).toBeNull();
    expect(JSON.stringify(estado)).toBe(salvo);
    await render({ ...estado });
    expect(elemento.querySelector('aside')).toBeNull();
  });

  it('mantém a fila quando chega outra conquista durante a primeira animação', async () => {
    await render(vazio); await render(novo(1));
    expect(titulo()).toBe('Primeira conexão');
    await render(novo(3));
    expect(titulo()).toBe('Primeira conexão');
    expect(elemento.textContent).toContain('5 recompensas para celebrar');
    const nomes: (string | null | undefined)[] = [];
    while (elemento.querySelector('aside')) {
      nomes.push(titulo()); await act(async () => botao('Fechar celebração atual').click());
    }
    expect(nomes).toEqual(['Primeira conexão', 'Primeira criação', 'Explorador', 'Base sólida', 'Construtor']);
  });

  it('não celebra hidratação, histórico anterior ou prêmios antigos recebidos pela rede', async () => {
    await render(novo(1)); expect(elemento.querySelector('aside')).toBeNull();
    await render(novo(3), 'perfil-b'); expect(elemento.querySelector('aside')).toBeNull();
    await render(vazio, 'perfil-c');
    const historico = novo(1);
    for (const r of Object.values(historico.historicoConquistas!)) { r.origem = 'historico'; delete r.adquiridaEm; }
    await render(historico, 'perfil-c'); expect(elemento.querySelector('aside')).toBeNull();
    await render(vazio, 'perfil-d');
    const remoto = novo(1);
    for (const r of Object.values(remoto.historicoConquistas!)) r.adquiridaEm = '2026-10-27T12:30:00.000Z';
    await render(remoto, 'perfil-d'); expect(elemento.querySelector('aside')).toBeNull();
  });

  it('aguarda os metadados de aquisição sem perder a conquista', async () => {
    await render(vazio);
    const estado = novo(0);
    await render({ ...estado, historicoConquistas: undefined });
    expect(elemento.querySelector('aside')).toBeNull();
    await render(estado); expect(titulo()).toBe('Primeira conexão');
  });

  it('pausa o fechamento enquanto a pessoa usa os controles por teclado', async () => {
    await render(vazio); await render(novo(0));
    await act(async () => botao('Fechar celebração atual').focus());
    await act(async () => vi.advanceTimersByTime(60000));
    expect(titulo()).toBe('Primeira conexão');
    await act(async () => { elemento.querySelector('aside')!.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: document.body })); });
    await act(async () => vi.advanceTimersByTime(18000));
    expect(elemento.querySelector('aside')).toBeNull();
  });
});

describe('coleção e ficha de emblemas', () => {
  it('mostra descrição/data e permite rever a revelação sem mudar aquisição nem pontos', async () => {
    const estado = novo(1); const antes = JSON.stringify(estado);
    await act(async () => raiz.render(<ColecaoEmblemas estado={estado}/>));
    const abrir = botao('Ver detalhes de Primeira conexão'); abrir.focus();
    await act(async () => abrir.click());
    const ficha = document.querySelector('[role="dialog"]')!;
    expect(ficha.textContent).toContain('Acertar uma questão após enviar a avaliação.');
    expect(ficha.querySelector('time')?.dateTime).toBe(instante);
    expect(elemento.hasAttribute('inert')).toBe(true);
    await act(async () => botao('Rever animação').click());
    expect(ficha.textContent).toContain('Revelação de Primeira conexão reapresentada.');
    expect(JSON.stringify(estado)).toBe(antes);
    await act(async () => ficha.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(abrir); expect(elemento.hasAttribute('inert')).toBe(false);
  });

  it('explica a falta da data antiga e o requisito de um emblema bloqueado', async () => {
    const estado: EstadoRecompensas = { aulasConcluidas: ['antiga'], respostas: {} };
    await act(async () => raiz.render(<ColecaoEmblemas estado={estado}/>));
    expect(elemento.textContent).toContain('Conquistado anteriormente · data original indisponível');
    await act(async () => botao('Ver detalhes de Universo em expansão').click());
    const ficha = document.querySelector('[role="dialog"]')!;
    expect(ficha.textContent).toContain('Registrar competências em vinte aulas diferentes.');
    expect(ficha.textContent).toContain('Emblema ainda bloqueado');
    expect(ficha.querySelector('time')).toBeNull();
    expect(ficha.textContent).not.toContain('Rever animação');
  });
});


describe('revelações que evoluem com a conquista', () => {
  it('acrescenta camadas e raridade nos graus maiores sem animar conquistas bloqueadas', async () => {
    await act(async () => raiz.render(<ColecaoEmblemas estado={vazio}/>));
    await act(async () => botao('Ver detalhes de Primeira conexão').click());
    let palco = document.querySelector('.recompensa-palco')!;
    expect(palco.getAttribute('data-categoria')).toBe('Inicial');
    expect(palco.querySelectorAll('.recompensa-particula')).toHaveLength(12);
    expect(palco.querySelectorAll('.recompensa-orbita')).toHaveLength(0);
    await act(async () => botao('Fechar detalhes do emblema').click());
    await act(async () => botao('Ver detalhes de Base sólida').click());
    palco = document.querySelector('.recompensa-palco')!;
    expect(palco.getAttribute('data-categoria')).toBe('Rara');
    expect(palco.querySelectorAll('.recompensa-orbita')).toHaveLength(1);
    await act(async () => botao('Fechar detalhes do emblema').click());
    await act(async () => botao('Ver detalhes de Universo em expansão').click());
    palco = document.querySelector('.recompensa-palco')!;
    expect(palco.getAttribute('data-grau')).toBe('7');
    expect(palco.getAttribute('data-categoria')).toBe('Lendária');
    expect(palco.querySelectorAll('.recompensa-particula')).toHaveLength(36);
    expect(palco.querySelectorAll('.recompensa-orbita')).toHaveLength(3);
    expect(palco.querySelectorAll('.recompensa-cristais>span')).toHaveLength(6);
    expect(palco.classList.contains('recompensa-palco--animado')).toBe(false);
    expect(document.querySelector('[role=dialog]')?.textContent).toContain('Emblema ainda bloqueado');
  });
});
