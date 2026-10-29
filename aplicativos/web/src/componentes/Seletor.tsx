import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import './seletor.css';

interface Opcao { valor: string; rotulo: string; desabilitado?: boolean }
interface Props {
  rotulo: string; opcoes: Opcao[]; valor?: string; valorInicial?: string;
  aoMudar?: (valor: string) => void; desabilitado?: boolean; id?: string; nome?: string;
}

/** Seletor com desenho do aplicativo e operação completa por teclado. */
export default function Seletor({ rotulo, opcoes, valor, valorInicial = '', aoMudar, desabilitado, id, nome }: Props) {
  const unico = useId();
  const campoId = id ?? `seletor-${unico}`;
  const listaId = `${campoId}-lista`;
  const [interno, definirInterno] = useState(valorInicial);
  const selecionado = valor ?? interno;
  const [aberto, abrir] = useState(false);
  const [ativo, ativar] = useState(0);
  const [posicao, posicionar] = useState<CSSProperties>({ position: 'fixed', visibility: 'hidden' });
  const botao = useRef<HTMLButtonElement>(null);
  const lista = useRef<HTMLDivElement>(null);
  const prefixo = useRef('');
  const ultimoToque = useRef(0);
  const indiceSelecionado = opcoes.findIndex(o => o.valor === selecionado);
  const rotuloAtual = opcoes[indiceSelecionado]?.rotulo ?? 'Escolher';
  const permitidos = opcoes.flatMap((o, i) => o.desabilitado ? [] : [i]);
  const indisponivel = desabilitado || !permitidos.length;

  function mostrar(indice = indiceSelecionado) {
    if (indisponivel) return;
    ativar(permitidos.includes(indice) ? indice : permitidos[0]); abrir(true);
  }
  function escolher(indice: number) {
    const opcao = opcoes[indice];
    if (!opcao || opcao.desabilitado) return;
    definirInterno(opcao.valor); aoMudar?.(opcao.valor); abrir(false);
    botao.current?.focus({ preventScroll: true });
  }
  function teclado(evento: KeyboardEvent<HTMLButtonElement>) {
    if (evento.key === 'Tab') { abrir(false); return; }
    if (evento.key === 'Escape') { abrir(false); evento.stopPropagation(); return; }
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(evento.key)) {
      evento.preventDefault();
      if (!aberto) { mostrar(evento.key === 'End' ? permitidos.at(-1) : indiceSelecionado); return; }
      const atual = permitidos.indexOf(ativo);
      ativar(evento.key === 'Home' ? permitidos[0] : evento.key === 'End' ? permitidos.at(-1)! : permitidos[(atual + (evento.key === 'ArrowDown' ? 1 : -1) + permitidos.length) % permitidos.length]);
    } else if (evento.key === 'Enter' || evento.key === ' ') {
      evento.preventDefault(); if (aberto) escolher(ativo); else mostrar();
    } else if (evento.key.length === 1 && !evento.altKey && !evento.ctrlKey && !evento.metaKey) {
      const agora = Date.now();
      prefixo.current = agora - ultimoToque.current > 650 ? evento.key : prefixo.current + evento.key;
      ultimoToque.current = agora;
      const normalizar = (texto: string) => texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
      const busca = normalizar(prefixo.current);
      const achado = permitidos.find(i => normalizar(opcoes[i].rotulo).startsWith(busca));
      if (achado !== undefined) { evento.preventDefault(); ativar(achado); if (!aberto) mostrar(achado); }
    }
  }
  useEffect(() => { if (indisponivel) abrir(false); }, [indisponivel]);
  useEffect(() => {
    if (!aberto) return;
    function fora(evento: PointerEvent) {
      if (evento.target instanceof Node && !lista.current?.contains(evento.target) && !botao.current?.contains(evento.target)) abrir(false);
    }
    function sair(evento: FocusEvent) { if (evento.target !== botao.current && !(evento.target instanceof Node && lista.current?.contains(evento.target))) abrir(false); }
    document.addEventListener('pointerdown', fora, true); document.addEventListener('focusin', sair);
    return () => { document.removeEventListener('pointerdown', fora, true); document.removeEventListener('focusin', sair); };
  }, [aberto]);
  useLayoutEffect(() => {
    if (!aberto) return;
    function atualizar() {
      const r = botao.current?.getBoundingClientRect(); if (!r) return;
      if (r.bottom < 0 || r.top > window.innerHeight) { abrir(false); return; }
      const altura = Math.max(88, Math.min(300, window.innerHeight - 24));
      const abaixo = innerHeight - r.bottom - 12;
      const acima = r.top - 12;
      const paraCima = abaixo < Math.min(altura, opcoes.length * 48 + 12) && acima > abaixo;
      const disponivel = Math.max(44, paraCima ? acima : abaixo);
      const largura = Math.min(Math.max(r.width, 190), innerWidth - 24);
      posicionar({ position: 'fixed', left: Math.max(12, Math.min(r.left, innerWidth - largura - 12)), width: largura, maxHeight: Math.min(altura, disponivel), ...(paraCima ? { bottom: innerHeight - r.top + 6 } : { top: r.bottom + 6 }) });
    }
    atualizar(); window.addEventListener('resize', atualizar); window.addEventListener('scroll', atualizar, true);
    return () => { window.removeEventListener('resize', atualizar); window.removeEventListener('scroll', atualizar, true); };
  }, [aberto, opcoes.length]);
  useEffect(() => {
    const menu = lista.current;
    const opcao = menu?.querySelector<HTMLElement>(`[data-indice="${ativo}"]`);
    if (!aberto || !menu || !opcao) return;
    // Rolar apenas o menu: scrollIntoView também pode deslocar a página hospedeira.
    if (opcao.offsetTop < menu.scrollTop) menu.scrollTop = opcao.offsetTop;
    else if (opcao.offsetTop + opcao.offsetHeight > menu.scrollTop + menu.clientHeight) menu.scrollTop = opcao.offsetTop + opcao.offsetHeight - menu.clientHeight;
  }, [ativo, aberto]);

  return <div className="flow-seletor">
    <span className="flow-seletor-rotulo" id={`${campoId}-rotulo`}>{rotulo}</span>
    <button ref={botao} id={campoId} type="button" role="combobox" className="flow-seletor-botao" aria-labelledby={`${campoId}-rotulo ${campoId}-valor`} aria-expanded={aberto} aria-haspopup="listbox" aria-controls={aberto ? listaId : undefined} aria-activedescendant={aberto && opcoes[ativo] ? `${listaId}-${ativo}` : undefined} disabled={indisponivel} onKeyDown={teclado} onClick={() => aberto ? abrir(false) : mostrar()}>
      <span id={`${campoId}-valor`}>{rotuloAtual}</span><svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><path d="m5 7 5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
    </button>
    {nome && <input type="hidden" name={nome} value={selecionado}/>}
    {aberto && createPortal(<div ref={lista} id={listaId} role="listbox" aria-labelledby={`${campoId}-rotulo`} className="flow-seletor-lista" style={posicao}>
      {opcoes.map((o, i) => <div key={o.valor} role="option" id={`${listaId}-${i}`} data-indice={i} aria-selected={o.valor === selecionado} aria-disabled={o.desabilitado || undefined} className={ativo === i ? 'flow-seletor-ativo' : ''} onPointerDown={e => e.preventDefault()} onPointerMove={() => { if (!o.desabilitado) ativar(i); }} onClick={() => escolher(i)}><span>{o.rotulo}</span>{o.valor === selecionado && <span aria-hidden="true">✓</span>}</div>)}
    </div>, document.body)}
  </div>;
}
