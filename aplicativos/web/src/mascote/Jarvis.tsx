import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icone } from '../componentes/Icone';
import { useAudio } from '../audio/AudioProvider';
import { explicarTermo, type ExplicacaoTermo } from './glossario';
import './Jarvis.css';

export type EstadoJarvis = 'curioso' | 'alegre' | 'explicando' | 'pensando' | 'concentrado' | 'orgulhoso' | 'surpreso' | 'preocupado' | 'comemorando' | 'descansando' | 'apoiando' | 'brincalhao' | 'bravo';
const falas: Record<EstadoJarvis, string> = {
  curioso: 'Uma ideia de cada vez. Vamos experimentar?',
  alegre: 'Boa! Você conectou a ideia ao resultado.',
  explicando: 'Vamos entender o exemplo antes de construir sua solução.',
  pensando: 'Analisando seu raciocínio. Cada resposta revela o próximo passo.',
  concentrado: 'Compare o resultado com o objetivo do desafio.',
  orgulhoso: 'Sua evolução ganha forma a cada descoberta.',
  surpreso: 'Um resultado novo! Vamos entender o que mudou?',
  preocupado: 'Vamos olhar a mensagem de erro com calma.',
  comemorando: 'Missão cumprida! Uma nova conquista faz parte da sua jornada.',
  descansando: 'Seu trabalho está aqui. Volte no seu ritmo.',
  apoiando: 'Um erro é uma pista. Veja a explicação e revise uma parte de cada vez.',
  brincalhao: 'Meu código de humor acabou de compilar. Prepare o sorriso!',
  bravo: 'Ativando sobrancelhas de mentirinha. Com você, sigo sempre do mesmo lado!',
};
const descricoes: Record<EstadoJarvis, string> = {
  curioso: 'Pronto para explorar', alegre: 'Conexão feita', explicando: 'Guia em ação', pensando: 'Analisando',
  concentrado: 'Foco na missão', orgulhoso: 'Você está evoluindo', surpreso: 'Nova descoberta', preocupado: 'Vamos revisar',
  comemorando: 'Conquista desbloqueada', descansando: 'No seu ritmo', apoiando: 'Vamos juntos',
  brincalhao: 'Modo bom humor', bravo: 'Bravo de brincadeira',
};
type Fala = { id: string; estado: EstadoJarvis; mensagem: string };
type Canal = { publicar: (fala: Fala) => void; remover: (id: string) => void };
type Interacao = Fala & { origem: 'reacao' | 'selecao' | 'consulta' | 'brincadeira'; termo?: ExplicacaoTermo };
const CanalJarvis = createContext<Canal | null>(null);

/** Uma única presença: personagem, balão, reações e leitura compartilham o mesmo núcleo. */
export function JarvisProvider({ children }: { children: ReactNode }) {
  const [fontes, definirFontes] = useState<Fala[]>([]);
  const publicar = useCallback((fala: Fala) => definirFontes(atuais => [...atuais.filter(item => item.id !== fala.id), fala]), []);
  const remover = useCallback((id: string) => definirFontes(atuais => atuais.filter(item => item.id !== id)), []);
  const canal = useMemo(() => ({ publicar, remover }), [publicar, remover]);
  return <CanalJarvis.Provider value={canal}>{children}{createPortal(<AssistenteFlutuante fala={fontes.at(-1)} />, document.body)}</CanalJarvis.Provider>;
}
export function Jarvis({ estado = 'curioso', mensagem, ativo = true }: { estado?: EstadoJarvis; mensagem?: string; compacto?: boolean; ativo?: boolean }) {
  const canal = useContext(CanalJarvis);
  const id = useId();
  useEffect(() => {
    if (!canal || !ativo) return;
    canal.publicar({ id, estado, mensagem: mensagem ?? falas[estado] });
    return () => canal.remover(id);
  }, [canal, id, estado, mensagem, ativo]);
  return null;
}
function preferencia(chave: string) {
  try { return localStorage.getItem(`flow.jarvis.${chave}`) === 'sim'; } catch { return false; }
}
function salvarPreferencia(chave: string, valor: boolean) {
  try { localStorage.setItem(`flow.jarvis.${chave}`, valor ? 'sim' : 'nao'); } catch { /* Vale nesta sessão. */ }
}
const areasPrivadas = 'input,textarea,select,button,[contenteditable]:not([contenteditable="false"]),[data-jarvis-ignorar],.cm-editor,.questao,fieldset,[role="dialog"],[aria-modal="true"],.pagina-admin';
function elementoDoNo(no: Node | null): Element | null { return no instanceof Element ? no : no?.parentElement ?? null; }
/** Aceita somente uma seleção contida numa única região editorial e visível. */
export function selecaoEditorial(selecao: Selection | null): { termo: string; contexto?: string; regiao: Element } | null {
  if (!selecao || selecao.isCollapsed || selecao.rangeCount !== 1) return null;
  const inicio = elementoDoNo(selecao.anchorNode), fim = elementoDoNo(selecao.focusNode);
  const regiao = inicio?.closest('[data-jarvis-conteudo]');
  if (!regiao || fim?.closest('[data-jarvis-conteudo]') !== regiao || !regiao.isConnected) return null;
  if (inicio?.closest(areasPrivadas) || fim?.closest(areasPrivadas) || inicio?.closest('[hidden],[inert]') || fim?.closest('[hidden],[inert]')) return null;
  const intervalo = selecao.getRangeAt(0);
  if (intervalo.cloneContents().querySelector(areasPrivadas)) return null;
  const termo = selecao.toString().trim().replace(/\s+/g, ' ');
  const contexto = inicio?.closest('p,li,dd,h1,h2,h3,h4')?.textContent ?? undefined;
  return explicarTermo(termo, contexto) ? { termo, contexto, regiao } : null;
}
function Nucleo({ estado }: { estado: EstadoJarvis }) {
  const id = useId().replaceAll(':', '');
  return <svg className="jarvis-nucleo" viewBox="0 0 120 120" fill="none" role="img" aria-label={`J.A.R.V.I.S ${estado}`}>
    <defs><radialGradient id={`luz-${id}`}><stop stopColor="#e5ffff"/><stop offset=".38" stopColor="#74f1f5"/><stop offset="1" stopColor="#168da1"/></radialGradient><linearGradient id={`metal-${id}`} x1="28" y1="20" x2="92" y2="103" gradientUnits="userSpaceOnUse"><stop stopColor="#d2fbff"/><stop offset=".4" stopColor="#2e8a9c"/><stop offset="1" stopColor="#12394e"/></linearGradient></defs>
    <ellipse className="jarvis-projecao" cx="60" cy="110" rx="30" ry="4" fill="#64e7ee" opacity=".2"/>
    <g className="jarvis-holograma">
      <circle cx="60" cy="56" r="49" fill="#071e2d" fillOpacity=".94"/>
      <g className="jarvis-anel jarvis-anel--externo" stroke="#69e2ed"><circle cx="60" cy="56" r="47" strokeWidth="1" opacity=".35"/><path d="M60 9a47 47 0 0 1 44 31M107 56a47 47 0 0 1-47 47M13 56a47 47 0 0 1 17-36" strokeWidth="3"/><path d="M60 5v7M60 100v7M9 56h7M104 56h7" strokeWidth="2"/></g>
      <g className="jarvis-anel jarvis-anel--interno" stroke="#a0edf2"><circle cx="60" cy="56" r="38" strokeDasharray="3 8" opacity=".5"/><path d="M29 36a37 37 0 0 1 55-9M91 77a37 37 0 0 1-55 8" strokeWidth="2"/></g>
      <path d="m44 30 16-5 16 5 12 15-5 29-15 12H52L37 74l-5-29Z" fill={`url(#metal-${id})`} stroke="#79d8e4" strokeWidth="1.2"/>
      <path d="m43 41 17-5 17 5 4 10-5 17-16 7-16-7-5-17Z" fill="#092c3d" stroke="#19566b"/>
      <g className="jarvis-visor" stroke="#a8ffff" strokeWidth="2.5" strokeLinecap="round"><path d="m43 51 12 3m10 0 12-3"/></g>
      <path className="jarvis-sinal" d="M48 64h5l3-5 5 11 4-8 3 2h4" stroke="#68eaf0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle className="jarvis-centelha" cx="60" cy="82" r="4" fill={`url(#luz-${id})`}/>
      <g className="jarvis-particulas" fill="#c2ffff"><circle cx="15" cy="30" r="1.5"/><circle cx="103" cy="24" r="1"/><circle cx="100" cy="88" r="2"/><path d="m19 83 2 2-2 2-2-2Z"/></g>
    </g>
  </svg>;
}

const piadas = [
  'Por que o programador levou uma escada? Porque queria subir de nível! Eu trouxe os emblemas.',
  'Um byte entrou numa academia. Saiu de lá um pouco mais forte… mas continuou com oito bits!',
  'Meu café favorito? Java! Mas para aprender Python eu também aceito um chá com indentação.',
];
const bravezas = [
  'Ora, ora… quem deixou esse ponto e vírgula passeando sozinho? Cara de bravo ativada! É só brincadeira: vamos investigar juntos.',
  'Protesto oficialmente contra os bugs que se escondem na última linha! Pronto, desabafei. Agora vamos seguir a pista.',
  'Minhas sobrancelhas holográficas estão em modo tempestade! Já passou. Errar faz parte; eu continuo aqui para ajudar.',
];
function AssistenteFlutuante({ fala }: { fala?: Fala }) {
  const audio = useAudio();
  const [minimizado, minimizar] = useState(() => preferencia('minimizado'));
  const [silenciado, silenciar] = useState(() => preferencia('silenciado'));
  const [pausado, pausar] = useState(() => preferencia('pausado'));
  const [balao, abrirBalao] = useState(false);
  const [interativo, abrirInterativo] = useState(false);
  const [interacao, definirInteracao] = useState<Interacao>();
  const [consulta, abrirConsulta] = useState(false);
  const [termo, definirTermo] = useState('');
  const [erroTermo, definirErroTermo] = useState('');
  const [emDialogo, definirEmDialogo] = useState(false);
  const dock = useRef<HTMLElement>(null);
  const entradaTermo = useRef<HTMLInputElement>(null);
  const numero = useRef(0);
  const humor = useRef({ piada: 0, bravo: 0 });
  const ultimaReacao = useRef(-Infinity);
  const interacaoNoDock = useRef(false);
  const regiaoSelecionada = useRef<Element | null>(null);
  const ultimaSelecao = useRef('');
  const idBalao = useId();
  const idTermo = useId();
  const falaVisivel = interacao ?? fala;
  const estado = falaVisivel?.estado ?? 'curioso';
  const falando = audio?.estado === 'falando';
  const volumeAtual = audio?.volumeReproducao ?? audio?.volume ?? 1;
  const vibrando = falando && volumeAtual > 0;
  const leitura = falando || audio?.estado === 'preparando' || audio?.estado === 'pausada';
  const statusVoz = falando ? volumeAtual > 0 ? 'Falando...' : 'Lendo · volume zero' : audio?.estado === 'preparando' ? 'Preparando voz...' : audio?.estado === 'pausada' ? 'Leitura pausada' : '';
  const visivel = !emDialogo && !minimizado && !silenciado && balao && Boolean(falaVisivel || consulta);
  const painelInterativo = interativo || consulta || ['selecao', 'consulta', 'brincadeira'].includes(interacao?.origem ?? '');

  const reagir = useCallback((estadoNovo: EstadoJarvis, mensagem: string, origem: Interacao['origem'], explicacao?: ExplicacaoTermo) => {
    definirInteracao({ id: `interacao-${++numero.current}`, estado: estadoNovo, mensagem, origem, termo: explicacao });
    abrirBalao(true);
  }, []);
  useEffect(() => salvarPreferencia('minimizado', minimizado), [minimizado]);
  useEffect(() => salvarPreferencia('silenciado', silenciado), [silenciado]);
  useEffect(() => salvarPreferencia('pausado', pausado), [pausado]);
  useEffect(() => {
    abrirInterativo(false); abrirConsulta(false); definirInteracao(undefined);
    regiaoSelecionada.current = null; ultimaSelecao.current = '';
  }, [fala?.id]);
  useEffect(() => {
    const atualizar = () => definirEmDialogo(Boolean(document.querySelector('[aria-modal="true"],dialog[open]')));
    atualizar();
    const observador = new MutationObserver(atualizar);
    observador.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['aria-modal', 'open'] });
    return () => observador.disconnect();
  }, []);
  useEffect(() => {
    // Dicas editoriais novas substituem uma seleção cuja região já saiu da tela.
    if (regiaoSelecionada.current && (!regiaoSelecionada.current.isConnected || regiaoSelecionada.current.closest('[hidden],[inert]'))) {
      regiaoSelecionada.current = null; ultimaSelecao.current = '';
      definirInteracao(atual => atual?.origem === 'selecao' ? undefined : atual);
    }
    if (!fala || minimizado || silenciado) { abrirBalao(false); return; }
    abrirBalao(true);
  }, [fala, minimizado, silenciado]);
  useEffect(() => {
    if (!balao || consulta || interacao?.origem === 'selecao' || interacao?.origem === 'consulta') return;
    const tempo = window.setTimeout(() => {
      if (!dock.current?.contains(document.activeElement) && !dock.current?.matches(':hover')) {
        abrirBalao(false); definirInteracao(undefined);
      }
    }, 12000);
    return () => window.clearTimeout(tempo);
  }, [balao, consulta, fala, interacao]);
  useEffect(() => {
    if (!balao) return;
    const recolherAoEstudar = (evento: Event) => {
      if (evento.target instanceof Node && !dock.current?.contains(evento.target)) { abrirBalao(false); abrirInterativo(false); }
    };
    document.addEventListener('pointerdown', recolherAoEstudar, true);
    document.addEventListener('focusin', recolherAoEstudar, true);
    return () => {
      document.removeEventListener('pointerdown', recolherAoEstudar, true);
      document.removeEventListener('focusin', recolherAoEstudar, true);
    };
  }, [balao]);
  useEffect(() => {
    if (consulta && visivel) entradaTermo.current?.focus();
    // Somente o botão de consulta abre o campo e solicita foco.
  }, [consulta, visivel]);
  useEffect(() => {
    if (emDialogo || minimizado || silenciado) return;
    const aoClicar = (evento: MouseEvent) => {
      const alvo = evento.target instanceof Element ? evento.target.closest<HTMLElement>('[data-jarvis-reacao]') : null;
      if (!alvo || alvo.closest('[inert],[hidden],[aria-modal="true"]') || dock.current?.contains(alvo)) return;
      const novoEstado = alvo.dataset.jarvisReacao as EstadoJarvis;
      if (!(novoEstado in falas) || Date.now() - ultimaReacao.current < 700) return;
      ultimaReacao.current = Date.now();
      const mensagem = alvo.dataset.jarvisMensagem?.trim().slice(0, 500) || falas[novoEstado];
      reagir(novoEstado, mensagem, 'reacao');
    };
    document.addEventListener('click', aoClicar);
    return () => document.removeEventListener('click', aoClicar);
  }, [emDialogo, minimizado, silenciado, reagir]);
  useEffect(() => {
    if (emDialogo || minimizado || silenciado) return;
    let tempo: ReturnType<typeof setTimeout> | undefined;
    const conferir = () => {
      clearTimeout(tempo);
      tempo = setTimeout(() => {
        if (interacaoNoDock.current || dock.current?.contains(document.activeElement)) return;
        const selecionada = selecaoEditorial(window.getSelection());
        if (!selecionada) {
          const haviaSelecao = regiaoSelecionada.current !== null;
          regiaoSelecionada.current = null; ultimaSelecao.current = '';
          if (haviaSelecao) { definirInteracao(atual => atual?.origem === 'selecao' ? undefined : atual); abrirBalao(false); }
          return;
        }
        if (ultimaSelecao.current === selecionada.termo && regiaoSelecionada.current === selecionada.regiao) return;
        regiaoSelecionada.current = selecionada.regiao; ultimaSelecao.current = selecionada.termo;
        const explicacao = explicarTermo(selecionada.termo, selecionada.contexto)!;
        reagir('explicando', explicacao.mensagem, 'selecao', explicacao);
      }, 220);
    };
    const marcarOrigem = (evento: Event) => {
      interacaoNoDock.current = evento.target instanceof Node && Boolean(dock.current?.contains(evento.target));
    };
    document.addEventListener('pointerdown', marcarOrigem, true);
    document.addEventListener('selectionchange', conferir);
    document.addEventListener('pointerup', conferir);
    document.addEventListener('keyup', conferir);
    return () => {
      clearTimeout(tempo);
      document.removeEventListener('pointerdown', marcarOrigem, true);
      document.removeEventListener('selectionchange', conferir);
      document.removeEventListener('pointerup', conferir);
      document.removeEventListener('keyup', conferir);
    };
  }, [emDialogo, minimizado, silenciado, reagir]);

  function fechar() {
    abrirBalao(false); abrirConsulta(false);
    dock.current?.querySelector<HTMLButtonElement>('.jarvis-ativador')?.focus();
  }
  function brincar(tipo: 'piada' | 'bravo') {
    const lista = tipo === 'piada' ? piadas : bravezas;
    const mensagem = lista[humor.current[tipo]++ % lista.length];
    abrirConsulta(false);
    reagir(tipo === 'piada' ? 'brincalhao' : 'bravo', mensagem, 'brincadeira');
  }
  return <aside ref={dock} hidden={emDialogo} className={`jarvis-dock ${pausado ? 'jarvis-dock--pausado' : ''} ${minimizado ? 'jarvis-dock--minimizado' : ''} ${vibrando ? 'jarvis-dock--falando' : ''}`} data-estado={estado} data-voz={audio?.estado ?? 'parada'} aria-label="Assistente J.A.R.V.I.S" onKeyDown={e => { if (e.key === 'Escape' && visivel) { e.preventDefault(); e.stopPropagation(); fechar(); } }}>
    {visivel && <div className={`jarvis-balao ${painelInterativo ? 'jarvis-balao--interativo' : ''}`} id={idBalao}>
      <div className="jarvis-identidade"><span className="jarvis-indicador" aria-hidden="true"/><strong>J.A.R.V.I.S</strong><span>SEU ASSISTENTE</span></div>
      {interacao?.termo && <div className="jarvis-termo"><span>EXPLORANDO</span><strong>{interacao.termo.termo}</strong><small>{interacao.termo.conhecida ? 'Glossário local' : 'Trecho da aula · sem definição local'}</small></div>}
      <p className="jarvis-mensagem" role="status" aria-live="polite" aria-atomic="true">{falaVisivel?.mensagem ?? 'Selecione um termo da aula ou me diga o que quer explorar.'}</p>
      {painelInterativo && (consulta ? <form className="jarvis-consulta" onSubmit={e => {
        e.preventDefault(); const explicacao = explicarTermo(termo);
        if (!explicacao) { definirErroTermo('Use de 2 a 80 caracteres e até 8 palavras.'); entradaTermo.current?.focus(); return; }
        definirErroTermo(''); regiaoSelecionada.current = null; ultimaSelecao.current = '';
        reagir('explicando', explicacao.mensagem, 'consulta', explicacao); abrirConsulta(false);
      }}>
        <label htmlFor={idTermo}>Qual termo vamos explorar?</label>
        <div><input id={idTermo} ref={entradaTermo} value={termo} onChange={e => { definirTermo(e.target.value); definirErroTermo(''); }} minLength={2} maxLength={80} placeholder="Ex.: variável ou CSS" autoComplete="off" aria-describedby={erroTermo ? `${idTermo}-erro` : undefined}/><button type="submit" aria-label="Explicar termo"><Icone nome="busca" tamanho={18}/></button></div>
        {erroTermo && <p id={`${idTermo}-erro`} role="alert">{erroTermo}</p>}
        <button type="button" className="jarvis-cancelar" onClick={() => abrirConsulta(false)}>Cancelar consulta</button>
      </form> : <div className="jarvis-acoes" aria-label="Interagir com J.A.R.V.I.S">
        <button type="button" onClick={() => { abrirConsulta(true); definirErroTermo(''); }}><Icone nome="busca" tamanho={15}/><span>Explorar termo</span></button>
        <button type="button" onClick={() => brincar('piada')}><span aria-hidden="true">☺</span><span>Uma piada</span></button>
        <button type="button" onClick={() => brincar('bravo')}><span aria-hidden="true">⌁</span><span>Fingir braveza</span></button>
        <button type="button" onClick={() => reagir('apoiando', 'Vamos com calma. Leia o objetivo, escolha uma parte pequena e compare o resultado. Você pode pedir uma pista e voltar aos exemplos sempre que precisar.', 'brincadeira')}><Icone nome="escudo" tamanho={15}/><span>Preciso de apoio</span></button>
      </div>)}
      {painelInterativo && <div className="jarvis-audio">
        <button type="button" disabled={!audio || audio.modo === 'indisponivel' || !audio.vozId || !falaVisivel} onClick={() => { if (falaVisivel) audio?.ler({ blocos: [falaVisivel.mensagem], origem: interacao?.termo ? 'termo' : 'assistente' }); }}><Icone nome="som" tamanho={15}/><span>Ouvir explicação</span></button>
        {audio?.estado === 'falando' && <button type="button" onClick={audio.pausar} aria-label="Pausar leitura pelo J.A.R.V.I.S"><Icone nome="pausa" tamanho={16}/></button>}
        {audio?.estado === 'pausada' && <button type="button" onClick={audio.retomar} aria-label="Retomar leitura pelo J.A.R.V.I.S"><Icone nome="play" tamanho={16}/></button>}
        {leitura && <button type="button" onClick={audio?.parar} aria-label="Parar leitura pelo J.A.R.V.I.S"><span className="jarvis-parar" aria-hidden="true"/></button>}
      </div>}
      {painelInterativo && (!audio || audio.modo === 'indisponivel' || !audio.vozId) && <small className="jarvis-sem-voz">Para ouvir, escolha uma voz brasileira ou inglesa disponível nos controles da aula.</small>}
      <div className="jarvis-controles"><button type="button" onClick={() => { silenciar(true); abrirConsulta(false); }} aria-label="Silenciar dicas de J.A.R.V.I.S"><Icone nome="som" tamanho={15}/><span>Silenciar dicas</span></button><button type="button" onClick={() => pausar(!pausado)} aria-pressed={pausado} aria-label={pausado ? 'Ativar animações de J.A.R.V.I.S' : 'Pausar animações de J.A.R.V.I.S'}><Icone nome={pausado ? 'play' : 'pausa'} tamanho={15}/></button><button type="button" onClick={() => { minimizar(true); abrirConsulta(false); }} aria-label="Minimizar J.A.R.V.I.S"><Icone nome="fechar" tamanho={16}/></button></div>
    </div>}
    <div className="jarvis-presenca">
      {statusVoz && <span className={`jarvis-fala-status ${falando ? 'jarvis-fala-status--ativa' : ''}`} role="status" aria-live="polite" aria-atomic="true"><span className="jarvis-ondas" aria-hidden="true"><i/><i/><i/></span>{statusVoz}</span>}
      <button type="button" className="jarvis-ativador" aria-label={minimizado ? 'Mostrar J.A.R.V.I.S' : silenciado ? 'Ativar dicas de J.A.R.V.I.S' : visivel ? painelInterativo ? 'Recolher balão de J.A.R.V.I.S' : 'Interagir com J.A.R.V.I.S' : 'Conversar com J.A.R.V.I.S'} aria-expanded={visivel} aria-controls={visivel ? idBalao : undefined} onClick={() => {
        if (minimizado) minimizar(false);
        else if (silenciado) silenciar(false);
        if (visivel && !painelInterativo) { abrirInterativo(true); return; }
        if (!visivel) { abrirInterativo(true); if (!falaVisivel) reagir('curioso', falas.curioso, 'brincadeira'); abrirBalao(true); }
        else { abrirBalao(false); abrirConsulta(false); }
      }}>
        <Nucleo estado={estado}/><span className="jarvis-nome-curto" aria-hidden="true">J.</span>
      </button>
    </div>
    {!minimizado && <span className="jarvis-legenda" aria-hidden="true">{silenciado ? 'Dicas silenciadas' : descricoes[estado]}</span>}
  </aside>;
}
export default Jarvis;
