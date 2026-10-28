import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icone } from '../componentes/Icone';
import './Jarvis.css';

export type EstadoJarvis = 'curioso' | 'alegre' | 'explicando' | 'pensando' | 'concentrado' | 'orgulhoso' | 'surpreso' | 'preocupado' | 'comemorando' | 'descansando' | 'apoiando';

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
};
const descricoes: Record<EstadoJarvis, string> = {
  curioso: 'Pronto para explorar', alegre: 'Conexão feita', explicando: 'Guia em ação', pensando: 'Analisando',
  concentrado: 'Foco na missão', orgulhoso: 'Você está evoluindo', surpreso: 'Nova descoberta', preocupado: 'Vamos revisar',
  comemorando: 'Conquista desbloqueada', descansando: 'No seu ritmo', apoiando: 'Vamos juntos',
};
type Fala = { id: string; estado: EstadoJarvis; mensagem: string };
type Canal = { publicar: (fala: Fala) => void; remover: (id: string) => void };
const CanalJarvis = createContext<Canal | null>(null);

/** Uma única presença visual, mesmo quando telas diferentes publicam orientações. */
export function JarvisProvider({ children }: { children: ReactNode }) {
  const [fontes, definirFontes] = useState<Fala[]>([]);
  const publicar = useCallback((fala: Fala) => definirFontes(atuais => [...atuais.filter(item => item.id !== fala.id), fala]), []);
  const remover = useCallback((id: string) => definirFontes(atuais => atuais.filter(item => item.id !== id)), []);
  const canal = useMemo(() => ({ publicar, remover }), [publicar, remover]);
  const fala = fontes.at(-1);
  return <CanalJarvis.Provider value={canal}>{children}{createPortal(<AssistenteFlutuante fala={fala} />, document.body)}</CanalJarvis.Provider>;
}

/** Publica contexto pedagógico. O balão só é desenhado junto ao assistente global. */
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
  try { localStorage.setItem(`flow.jarvis.${chave}`, valor ? 'sim' : 'nao'); } catch { /* A preferência permanece válida nesta sessão. */ }
}

function Nucleo({ estado }: { estado: EstadoJarvis }) {
  const id = useId().replaceAll(':', '');
  return <svg className="jarvis-nucleo" viewBox="0 0 120 120" fill="none" role="img" aria-label={`J.A.R.V.IS. ${estado}`}>
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

function AssistenteFlutuante({ fala }: { fala?: Fala }) {
  const [minimizado, minimizar] = useState(() => preferencia('minimizado'));
  const [silenciado, silenciar] = useState(() => preferencia('silenciado'));
  const [pausado, pausar] = useState(() => preferencia('pausado'));
  const [balao, abrirBalao] = useState(false);
  const dock = useRef<HTMLElement>(null);
  const idBalao = useId();
  const estado = fala?.estado ?? 'curioso';
  useEffect(() => salvarPreferencia('minimizado', minimizado), [minimizado]);
  useEffect(() => salvarPreferencia('silenciado', silenciado), [silenciado]);
  useEffect(() => salvarPreferencia('pausado', pausado), [pausado]);
  useEffect(() => {
    if (!fala || minimizado || silenciado) { abrirBalao(false); return; }
    abrirBalao(true);
    const tempo = window.setTimeout(() => {
      if (!dock.current?.contains(document.activeElement)) abrirBalao(false);
    }, 12000);
    return () => window.clearTimeout(tempo);
  }, [fala, minimizado, silenciado]);
  useEffect(() => {
    if (!balao) return;
    const recolherAoEstudar = (evento: Event) => {
      if (evento.target instanceof Node && !dock.current?.contains(evento.target)) abrirBalao(false);
    };
    document.addEventListener('pointerdown', recolherAoEstudar, true);
    document.addEventListener('focusin', recolherAoEstudar, true);
    return () => {
      document.removeEventListener('pointerdown', recolherAoEstudar, true);
      document.removeEventListener('focusin', recolherAoEstudar, true);
    };
  }, [balao]);
  return <aside ref={dock} className={`jarvis-dock ${pausado ? 'jarvis-dock--pausado' : ''} ${minimizado ? 'jarvis-dock--minimizado' : ''}`} data-estado={estado} aria-label="Assistente J.A.R.V.IS." onKeyDown={e => { if (e.key === 'Escape' && balao) { abrirBalao(false); dock.current?.querySelector<HTMLButtonElement>('.jarvis-ativador')?.focus(); } }}>
    {!minimizado && !silenciado && balao && fala && <div className="jarvis-balao" id={idBalao} key={`${fala.id}-${fala.mensagem}`}>
      <div className="jarvis-identidade"><span className="jarvis-indicador" aria-hidden="true"/><strong>J.A.R.V.IS.</strong><span>SEU ASSISTENTE</span></div>
      <p className="jarvis-mensagem" role="status" aria-live="polite" aria-atomic="true">{fala.mensagem}</p>
      <div className="jarvis-controles"><button type="button" onClick={() => silenciar(true)} aria-label="Silenciar dicas de J.A.R.V.IS."><Icone nome="som" tamanho={15}/><span>Silenciar</span></button><button type="button" onClick={() => pausar(!pausado)} aria-pressed={pausado} aria-label={pausado ? 'Ativar animações de J.A.R.V.IS.' : 'Pausar animações de J.A.R.V.IS.'}><Icone nome={pausado ? 'play' : 'pausa'} tamanho={15}/></button><button type="button" onClick={() => minimizar(true)} aria-label="Minimizar J.A.R.V.IS."><Icone nome="fechar" tamanho={16}/></button></div>
    </div>}
    <button type="button" className="jarvis-ativador" aria-label={minimizado ? 'Mostrar J.A.R.V.IS.' : silenciado ? 'Ativar dicas de J.A.R.V.IS.' : balao ? 'Recolher balão de J.A.R.V.IS.' : 'Conversar com J.A.R.V.IS.'} aria-expanded={!minimizado && !silenciado && balao && Boolean(fala)} aria-controls={balao && !minimizado && !silenciado ? idBalao : undefined} onClick={() => {
      if (minimizado) minimizar(false);
      else if (silenciado) silenciar(false);
      else abrirBalao(!balao);
    }}>
      <Nucleo estado={estado}/><span className="jarvis-nome-curto" aria-hidden="true">J.</span>
    </button>
    {!minimizado && <span className="jarvis-legenda" aria-hidden="true">{silenciado ? 'Dicas silenciadas' : descricoes[estado]}</span>}
  </aside>;
}
export default Jarvis;
