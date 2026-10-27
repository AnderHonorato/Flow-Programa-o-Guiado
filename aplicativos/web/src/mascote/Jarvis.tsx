import { useEffect, useState } from 'react';
import { Icone } from '../componentes/Icone';
import './Jarvis.css';

export type EstadoJarvis = 'curioso' | 'alegre' | 'explicando' | 'pensando' | 'concentrado' | 'orgulhoso' | 'surpreso' | 'preocupado' | 'comemorando' | 'descansando' | 'apoiando';

const falas: Record<EstadoJarvis, string> = {
  curioso: 'Uma ideia de cada vez. Vamos experimentar?',
  alegre: 'Boa! Você conectou a ideia ao resultado.',
  explicando: 'Mude uma linha e observe o que acontece na prévia.',
  pensando: 'O que esse código precisa fazer primeiro?',
  concentrado: 'Compare o resultado com o objetivo do desafio.',
  orgulhoso: 'Mais um degrau construído por você.',
  surpreso: 'Um resultado novo! Vamos entender o que mudou?',
  preocupado: 'Vamos olhar a mensagem de erro com calma.',
  comemorando: 'Funcionou! Agora tente explicar com suas palavras.',
  descansando: 'Seu trabalho está aqui. Volte no seu ritmo.',
  apoiando: 'Errar traz uma pista. Revise uma parte de cada vez.',
};

function lerPreferencia(chave: string) {
  try { return localStorage.getItem(`flow.jarvis.${chave}`) === 'sim'; } catch { return false; }
}

/** Companheiro original em grade de 64 pixels. Não toca áudio automaticamente. */
export function Jarvis({ estado = 'curioso', mensagem, compacto = false }: { estado?: EstadoJarvis; mensagem?: string; compacto?: boolean }) {
  const [minimizado, definirMinimizado] = useState(() => lerPreferencia('minimizado'));
  const [silenciado, definirSilenciado] = useState(() => lerPreferencia('silenciado'));
  const [pausado, definirPausado] = useState(() => lerPreferencia('pausado'));
  useEffect(() => { try { localStorage.setItem('flow.jarvis.minimizado', minimizado ? 'sim' : 'nao'); } catch { /* Armazenamento indisponível: preferência vale nesta sessão. */ } }, [minimizado]);
  useEffect(() => { try { localStorage.setItem('flow.jarvis.silenciado', silenciado ? 'sim' : 'nao'); } catch { /* A interface continua funcionando. */ } }, [silenciado]);
  useEffect(() => { try { localStorage.setItem('flow.jarvis.pausado', pausado ? 'sim' : 'nao'); } catch { /* A interface continua funcionando. */ } }, [pausado]);

  if (minimizado) return <button type="button" className="jarvis-reabrir" onClick={() => definirMinimizado(false)} aria-label="Mostrar J.A.R.V.IS."><span className="jarvis-mini" aria-hidden="true">J.</span><span>Mostrar J.A.R.V.IS.</span></button>;

  const sorrindo = ['alegre', 'orgulhoso', 'comemorando', 'apoiando'].includes(estado);
  const descansando = estado === 'descansando';
  const emocionado = estado === 'comemorando';
  const surpreendido = estado === 'surpreso';
  const preocupado = estado === 'preocupado';
  const olhando = estado === 'concentrado' || estado === 'explicando';
  const pensando = estado === 'pensando';

  return <aside className={`jarvis ${compacto ? 'jarvis--compacto' : ''} ${pausado ? 'jarvis--pausado' : ''}`} data-estado={estado} aria-label="Ajuda de J.A.R.V.IS.">
    <div className="jarvis-palco">
      <svg className="jarvis-pixels" viewBox="0 0 64 64" fill="none" shapeRendering="crispEdges" role="img" aria-label={`J.A.R.V.IS. ${estado}`}>
        <ellipse className="jarvis-sombra" cx="32" cy="58" rx="17" ry="2" fill="#362723" opacity=".13"/>
        <g className="jarvis-corpo" key={estado}>
          <g className="jarvis-antena"><path d="M31 18V9h3v9" fill="#653B32"/><path d="M32 6h7v4h-7zM29 9h5v4h-5z" fill="#8F2D4A"/><path d="M34 6h3v2h-3z" fill="#EBA78B"/></g>
          <g className="jarvis-braco jarvis-braco--esquerdo"><path d="M12 34h5v13h-5zM9 38h4v8H9z" fill="#7F4435"/><path d="M11 38h5v6h-5z" fill="#D97757"/></g>
          <g className="jarvis-braco jarvis-braco--direito"><path d="M47 34h5v13h-5zM51 38h4v8h-4z" fill="#7F4435"/><path d="M48 38h5v6h-5z" fill="#D97757"/></g>
          <path d="M19 48h9v8h-9zM36 48h9v8h-9z" fill="#653B32"/><path d="M17 53h11v4H17zM36 53h11v4H36z" fill="#8F2D4A"/>
          <path d="M21 16h22v3h5v5h3v23h-3v5H17v-5h-3V24h3v-5h4z" fill="#653B32"/>
          <path d="M21 19h22v3h5v24h-3v3H19v-3h-2V25h3v-3h1z" fill="#D97757"/>
          <path d="M22 19h20v3H22zM19 23h3v6h-3z" fill="#F2AD87"/>
          <path d="M22 25h20v2h4v14h-3v3H21v-3h-3V28h4z" fill="#FFEDD4"/>
          <path d="M23 25h18v2H23zM20 28h3v2h-3z" fill="#FFFFFF" opacity=".7"/>
          <g className="jarvis-olhos" fill="#362723">
            {descansando ? <path d="M23 33h6v2h-6zM35 33h6v2h-6z"/> : sorrindo ? <path d="M23 31h2v-2h3v2h2v3h-2v-2h-3v2h-2zM34 31h2v-2h3v2h2v3h-2v-2h-3v2h-2z"/> : <><rect x={olhando ? 26 : 24} y={surpreendido ? 28 : 30} width="4" height={surpreendido ? 8 : 6}/><rect x={olhando ? 38 : 36} y={surpreendido ? 28 : 30} width="4" height={surpreendido ? 8 : 6}/><path d="M25 30h1v2h-1zM37 30h1v2h-1z" fill="#FFFAF5"/></>}
          </g>
          {sobrancelhas(preocupado, pensando)}
          <path d="M21 37h4v2h-4zM39 37h4v2h-4z" fill="#E9A38A"/>
          {surpreendido ? <path d="M30 37h4v5h-4z" fill="#653B32"/> : preocupado ? <path d="M29 40h2v-2h3v2h2v2h-2v-2h-3v2h-2z" fill="#653B32"/> : <path d="M29 38h2v2h3v-2h2v3h-2v1h-3v-1h-2z" fill="#653B32"/>}
          <path d="M19 46h26v4H19zM37 49h6v6h-6z" fill="#8F2D4A"/>
          <path d="M25 47h5v2h-5z" fill="#F7C7A4"/>
          {emocionado && <g className="jarvis-confetes" fill="#8F2D4A"><path d="M6 14h3v4H6zM53 18h4v3h-4zM11 7h3v3h-3z"/><path d="M48 8h3v5h-3zM5 28h3v3H5zM56 30h3v4h-3z" fill="#D97757"/></g>}
          {pensando && <g fill="#8F2D4A"><path d="M48 15h3v3h-3zM53 10h4v4h-4z"/></g>}
          {descansando && <path d="M46 10h7v2h-3v2h3v2h-7v-2h3v-2h-3z" fill="#8F2D4A"/>}
        </g>
      </svg>
    </div>
    <div className="jarvis-conversa"><div className="jarvis-cabecalho"><strong>J.A.R.V.IS.</strong><span>Seu guia de estudos</span></div>
      {!silenciado && <p className="jarvis-mensagem" role="status" aria-live="polite" aria-atomic="true">{mensagem ?? falas[estado]}</p>}
      {silenciado && <p className="jarvis-silenciado">Dicas silenciadas</p>}
      <div className="jarvis-controles">
        <button type="button" onClick={() => definirSilenciado(!silenciado)} aria-pressed={silenciado} aria-label={silenciado ? 'Ativar dicas de J.A.R.V.IS.' : 'Silenciar dicas de J.A.R.V.IS.'}><Icone nome="som" tamanho={15}/><span>{silenciado ? 'Ativar dicas' : 'Silenciar'}</span></button>
        <button type="button" onClick={() => definirPausado(!pausado)} aria-pressed={pausado} aria-label={pausado ? 'Ativar animações de J.A.R.V.IS.' : 'Pausar animações de J.A.R.V.IS.'}><Icone nome={pausado ? 'play' : 'pausa'} tamanho={14}/></button>
        <button type="button" onClick={() => definirMinimizado(true)} aria-label="Minimizar J.A.R.V.IS."><Icone nome="fechar" tamanho={15}/></button>
      </div>
    </div>
  </aside>;
}

function sobrancelhas(preocupado: boolean, pensando: boolean) {
  return preocupado ? <path d="M23 28h3v-2h3v2h-3v2h-3zM35 26h3v2h3v2h-3v-2h-3z" fill="#653B32"/> : pensando ? <path d="M23 27h7v2h-7zM35 26h6v2h-6z" fill="#653B32"/> : null;
}

export default Jarvis;
