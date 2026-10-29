import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { Emblema } from './Emblema';
import { dataDaConquista, recompensas, type EstadoRecompensas, type RegistroConquista } from './historico';
import { niveis } from './regras';
import './recompensas.css';

type Premio = ReturnType<typeof recompensas>[number];
type PremioAnimado = { premio: Premio; registro: RegistroConquista };
function categoriaDaRecompensa(grau: number) {
  const categoria = Math.min(3, Math.max(0, Math.floor(grau / 2)));
  return { indice: categoria, nome: ['Inicial', 'Rara', 'Épica', 'Lendária'][categoria], particulas: 12 + categoria * 8 };
}
function CategoriaRecompensa({ grau }: { grau: number }) {
  const categoria = categoriaDaRecompensa(grau);
  return <span className={`recompensa-categoria recompensa-categoria--${categoria.indice}`}><span aria-hidden="true">{['◇', '✧', '✦', '✶'][categoria.indice]}</span>{categoria.nome}</span>;
}
const assinaturaDoHistorico = (estado: EstadoRecompensas) => recompensas(estado).map(m => `${m.id}:${m.obtido}:${estado.historicoConquistas?.[m.id]?.origem}:${estado.historicoConquistas?.[m.id]?.adquiridaEm}`).join('|');

function DataAquisicao({ registro, prefixo = true }: { registro?: RegistroConquista; prefixo?: boolean }) {
  if (!registro?.adquiridaEm) return <span className="recompensa-data-anterior">{dataDaConquista(registro)}</span>;
  return <span>{prefixo && 'Conquistado em '}<time dateTime={registro.adquiridaEm}>{dataDaConquista(registro)}</time></span>;
}

function PalcoRecompensa({ premio, animado = true }: { premio: Premio; animado?: boolean }) {
  const categoria = categoriaDaRecompensa(premio.grau);
  const total = categoria.particulas;
  return <div className={`recompensa-palco recompensa-palco--categoria-${categoria.indice} ${animado ? 'recompensa-palco--animado' : ''}`} data-grau={premio.grau} data-categoria={categoria.nome} data-tipo={premio.tipo} style={{ '--recompensa-cor': niveis[premio.grau]?.cor ?? '#a9e5ed', '--recompensa-camadas': categoria.indice + 1 } as CSSProperties} aria-hidden="true">
    <div className="recompensa-raios"/><div className="recompensa-aura"/><div className="recompensa-impulso"/>
    {Array.from({ length: categoria.indice }, (_, i) => <div key={`orbita-${i}`} className={`recompensa-orbita recompensa-orbita--${i + 1}`}><i/><i/></div>)}
    {categoria.indice >= 2 && <div className="recompensa-cristais">{Array.from({ length: categoria.indice === 3 ? 6 : 4 }, (_, i) => <span key={i} style={{ '--cristal': i, '--cristais-total': categoria.indice === 3 ? 6 : 4 } as CSSProperties}/>)}</div>}
    {Array.from({ length: total }, (_, i) => <i key={i} className="recompensa-particula" style={{ '--particula': i, '--angulo': `${i * 360 / total}deg`, '--distancia': `${66 + categoria.indice * 9 + i % 4 * 7}px` } as CSSProperties}/>)}
    <div className="recompensa-brasao"><Emblema grau={premio.grau} desenho={premio.desenho} tamanho={142}/></div>
    <span className="recompensa-pedestal"/>
  </div>;
}

function FichaEmblema({ premio, registro, aoFechar }: { premio: Premio; registro?: RegistroConquista; aoFechar: () => void }) {
  const tituloId = useId();
  const descricaoId = useId();
  const camada = useRef<HTMLDivElement>(null);
  const titulo = useRef<HTMLHeadingElement>(null);
  const [replay, setReplay] = useState(0);
  useEffect(() => {
    const anterior = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const fundo = camada.current;
    const irmaos = [...document.body.children].filter(e => e !== fundo);
    const inertes = irmaos.map(e => [e, e.hasAttribute('inert')] as const);
    for (const [elemento] of inertes) elemento.setAttribute('inert', '');
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    titulo.current?.focus();
    return () => {
      for (const [elemento, eraInerte] of inertes) if (!eraInerte) elemento.removeAttribute('inert');
      document.body.style.overflow = overflow;
      anterior?.focus();
    };
  }, []);
  function teclado(evento: KeyboardEvent<HTMLDivElement>) {
    if (evento.key === 'Escape') { evento.preventDefault(); evento.stopPropagation(); aoFechar(); }
    if (evento.key !== 'Tab') return;
    const botoes = [...(camada.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [])];
    const primeiro = botoes[0], ultimo = botoes.at(-1);
    if (!primeiro || !ultimo) return;
    const ativo = document.activeElement;
    if (evento.shiftKey && (ativo === primeiro || ativo === titulo.current)) { evento.preventDefault(); ultimo.focus(); }
    else if (!evento.shiftKey && (ativo === ultimo || ativo === titulo.current)) { evento.preventDefault(); primeiro.focus(); }
  }
  return createPortal(<div ref={camada} className="recompensa-modal-fundo" onKeyDown={teclado} onClick={e => { if (e.target === e.currentTarget) aoFechar(); }}>
    <section className="recompensa-ficha" role="dialog" aria-modal="true" aria-labelledby={tituloId} aria-describedby={descricaoId}>
      <button type="button" className="recompensa-fechar" onClick={aoFechar} aria-label="Fechar detalhes do emblema">×</button>
      <span className="recompensa-sobretitulo">{premio.obtido ? 'SUA CONQUISTA' : 'SEU PRÓXIMO HORIZONTE'}</span>
      <CategoriaRecompensa grau={premio.grau}/>
      <div key={replay}><PalcoRecompensa premio={premio} animado={premio.obtido}/></div>
      <h2 id={tituloId} ref={titulo} tabIndex={-1}>{premio.nome}</h2>
      <p id={descricaoId}>{premio.descricao}</p>
      <div className="recompensa-ficha-dados"><strong>{premio.obtido ? 'Emblema conquistado' : 'Emblema ainda bloqueado'}</strong>{premio.obtido ? <DataAquisicao registro={registro}/> : <span>{'atual' in premio ? `${premio.atual} de ${premio.meta} · continue construindo seu progresso.` : 'Continue acumulando experiência para desbloquear.'}</span>}</div>
      {premio.obtido && <button type="button" className="botao secundario recompensa-replay" onClick={() => setReplay(n => n + 1)}>Rever animação <span aria-hidden="true">↻</span></button>}
      {replay > 0 && <p className="recompensa-replay-status" role="status">Revelação de {premio.nome} reapresentada.</p>}
      <button type="button" className="botao primario recompensa-ficha-voltar" onClick={aoFechar}>Voltar à coleção</button>
    </section>
  </div>, document.body);
}

/** A descrição, o critério e a data são consultáveis mesmo depois da celebração. */
export function ColecaoEmblemas({ estado }: { estado: EstadoRecompensas }) {
  const tituloId = useId();
  const medalhas = recompensas(estado).filter(m => m.tipo === 'emblema');
  const [aberta, setAberta] = useState<string>();
  const premio = medalhas.find(m => m.id === aberta);
  return <section className="recompensas-colecao" aria-labelledby={tituloId}>
    <div className="recompensas-colecao-cabecalho"><div><span className="recompensa-sobretitulo">MARCAS DA SUA JORNADA</span><h3 id={tituloId}>Emblemas de conquista</h3><p>Cada desenho conta uma parte do que você aprendeu. Toque para conhecer a conquista.</p></div><span className="recompensas-total">{medalhas.filter(m => m.obtido).length} de {medalhas.length}</span></div>
    <div className="recompensas-grade">{medalhas.map((m, i) => <button type="button" key={m.id} className={`recompensa-cartao ${m.obtido ? 'recompensa-cartao--obtido' : ''}`} onClick={() => setAberta(m.id)} aria-label={`Ver detalhes de ${m.nome}`}>
      <span className="recompensa-cartao-numero" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
      <Emblema grau={m.grau} desenho={m.desenho} tamanho={104} bloqueado={!m.obtido}/><CategoriaRecompensa grau={m.grau}/><strong>{m.nome}</strong><span className="recompensa-cartao-descricao">{m.descricao}</span>
      <span className="recompensa-cartao-estado">{m.obtido ? <><span aria-hidden="true">✓</span> Conquistado</> : `${m.atual} de ${m.meta}`}</span>
      {m.obtido ? <span className="recompensa-cartao-data"><DataAquisicao registro={estado.historicoConquistas?.[m.id]} prefixo={false}/></span> : <progress max={m.meta} value={m.atual} aria-label={`Progresso de ${m.nome}`}/>}
      <span className="recompensa-cartao-detalhes">Ver detalhes <span aria-hidden="true">↗</span></span>
    </button>)}</div>
    {premio && <FichaEmblema key={premio.id} premio={premio} registro={estado.historicoConquistas?.[premio.id]} aoFechar={() => setAberta(undefined)}/>}
  </section>;
}

/** Uma ação pode liberar vários prêmios; cada um recebe sua própria revelação. */
export function CelebracaoRecompensas({ estado, perfilId, pronto = true, aoVerColecao }: { estado: EstadoRecompensas; perfilId: string; pronto?: boolean; aoVerColecao?: () => void }) {
  const vistos = useRef<{ perfilId: string; ids: Set<string>; inicio: number } | undefined>(undefined);
  const [fila, setFila] = useState<{ perfilId: string; itens: PremioAnimado[] }>({ perfilId, itens: [] });
  const [ponteiroDentro, setPonteiroDentro] = useState(false);
  const [focoDentro, setFocoDentro] = useState(false);
  const pausado = ponteiroDentro || focoDentro;
  const [visivel, setVisivel] = useState(() => !document.hidden);
  const assinatura = assinaturaDoHistorico(estado);
  const atual = pronto && fila.perfilId === perfilId ? fila.itens[0] : undefined;
  const painel = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!pronto) { vistos.current = undefined; setFila({ perfilId, itens: [] }); return; }
    const obtidos = recompensas(estado).filter(m => m.obtido);
    if (vistos.current?.perfilId !== perfilId) {
      vistos.current = { perfilId, ids: new Set(obtidos.map(m => m.id)), inicio: Date.now() - 1000 };
      setFila({ perfilId, itens: [] }); setPonteiroDentro(false); setFocoDentro(false); return;
    }
    const novos: PremioAnimado[] = [];
    for (const premio of obtidos) {
      if (vistos.current.ids.has(premio.id)) continue;
      const registro = estado.historicoConquistas?.[premio.id];
      if (!registro) continue;
      vistos.current.ids.add(premio.id);
      // Ao entrar em outro dispositivo, uma sincronização de prêmios antigos
      // atualiza a coleção sem interromper a aula com novas notificações.
      if (registro.origem === 'conquista' && registro.adquiridaEm && Date.parse(registro.adquiridaEm) >= vistos.current.inicio) novos.push({ premio, registro });
    }
    if (novos.length) setFila(anterior => ({ perfilId, itens: [...(anterior.perfilId === perfilId ? anterior.itens : []), ...novos] }));
  }, [perfilId, pronto, assinatura]);
  useEffect(() => {
    const mudar = () => setVisivel(!document.hidden);
    document.addEventListener('visibilitychange', mudar);
    return () => document.removeEventListener('visibilitychange', mudar);
  }, []);
  useEffect(() => {
    if (!atual || pausado || !visivel) return;
    const timer = window.setTimeout(() => setFila(f => ({ ...f, itens: f.itens.slice(1) })), 18000);
    return () => window.clearTimeout(timer);
  }, [atual?.premio.id, pausado, visivel]);
  if (!atual) return null;
  const avancar = () => setFila(f => ({ ...f, itens: f.itens.slice(1) }));
  return <aside ref={painel} className="recompensa-celebracao" aria-label="Recompensa de evolução" onMouseEnter={() => setPonteiroDentro(true)} onMouseLeave={() => setPonteiroDentro(false)} onFocusCapture={() => setFocoDentro(true)} onBlurCapture={e => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocoDentro(false); }}>
    <div className="recompensa-celebracao-topo"><span className="recompensa-sobretitulo">{atual.premio.tipo === 'nivel' ? 'NOVO NÍVEL ALCANÇADO' : 'NOVO EMBLEMA CONQUISTADO'}</span><button type="button" className="recompensa-fechar" onClick={avancar} aria-label="Fechar celebração atual">×</button></div>
    <CategoriaRecompensa grau={atual.premio.grau}/>
    <div key={atual.premio.id} className="recompensa-revelacao"><PalcoRecompensa premio={atual.premio}/><div role="status" aria-live="polite" aria-atomic="true"><h2>{atual.premio.nome}</h2><p>{atual.premio.descricao}</p><div className="recompensa-data"><DataAquisicao registro={atual.registro}/></div></div></div>
    <div className="recompensa-celebracao-acoes">{aoVerColecao && <button type="button" className="botao secundario" onClick={() => { setFila({ perfilId, itens: [] }); aoVerColecao(); }}>Ver coleção</button>}<button type="button" className="botao primario" onClick={avancar}>{fila.itens.length > 1 ? `Próxima recompensa (${fila.itens.length - 1})` : 'Continuar'}</button></div>
    <span className="recompensa-fila-status">{fila.itens.length > 1 ? `${fila.itens.length} recompensas para celebrar` : 'Sua nova conquista já está na coleção'}</span>
  </aside>;
}
