import { desenhosAvatar } from './avatar';

/** Retratos vetoriais originais do Flow. Não usam personagens ou marcas de terceiros. */
export function DesenhoAvatar({ id, tamanho = 80 }: { id: string; tamanho?: number }) {
  const desenho = desenhosAvatar.find(d => d.id === id) ?? desenhosAvatar[0];
  const pixel = desenho.estilo === 'Pixel';
  const familia = desenho.id.split('-')[1];
  return <svg viewBox={pixel ? '0 0 32 32' : '0 0 120 120'} width={tamanho} height={tamanho} aria-hidden="true" focusable="false" className={`perfil-desenho perfil-desenho--${desenho.estilo.toLowerCase()}`} shapeRendering={pixel ? 'crispEdges' : undefined}>
    {pixel ? <Pixel familia={familia} fundo={desenho.fundo} cor={desenho.cor}/> : <>
      <circle cx="60" cy="60" r="58" fill={desenho.fundo}/><circle cx="60" cy="60" r="51" fill="none" stroke="#fff" strokeOpacity=".12"/>
      <path d="m20 25 2 4 5 1-5 2-2 5-2-5-5-2 5-1Zm79 58 2 4 5 1-5 2-2 5-2-5-5-2 5-1Z" fill={desenho.cor} opacity=".55"/>
      <circle cx="96" cy="30" r="3" fill="#fff" opacity=".5"/>
      {desenho.estilo === 'Cartoon' ? <Cartoon familia={familia} cor={desenho.cor}/> : <Game familia={familia} cor={desenho.cor}/>}
    </>}
  </svg>;
}

function Olhos({ claros = false, y = 59 }: { claros?: boolean; y?: number }) {
  return <g><ellipse cx="46" cy={y} rx="4" ry="5" fill={claros ? '#f5fbff' : '#17283d'}/><ellipse cx="74" cy={y} rx="4" ry="5" fill={claros ? '#f5fbff' : '#17283d'}/><circle cx="47" cy={y - 2} r="1.3" fill="#fff"/><circle cx="75" cy={y - 2} r="1.3" fill="#fff"/></g>;
}
function Sorriso({ y = 74 }: { y?: number }) { return <path d={`M52 ${y}q8 7 16 0`} stroke="#28334c" strokeWidth="3" strokeLinecap="round" fill="none"/>; }
function Cartoon({ familia, cor }: { familia: string; cor: string }) {
  if (familia === 'raposa') return <g stroke="#2b2744" strokeWidth="2.5" strokeLinejoin="round">
    <path d="M31 52 26 20l24 17m21-1 23-16-5 34" fill={cor}/><path d="m33 40-3-12 12 12m36-1 12-11-3 15" fill="#fbd2ce" stroke="none"/>
    <path d="M28 59q-2-31 32-31t32 31l-9 29-23 15-24-15Z" fill={cor}/><path d="m30 59 30 17 30-17-8 27-22 16-23-16Z" fill="#fff1d9" stroke="none"/>
    <path d="m30 60-8 7 13 1m55-8 8 7-13 1" fill={cor}/><Olhos y={57}/><path d="m54 73 6 5 6-5Z" fill="#28334c" stroke="none"/><Sorriso y={82}/>
  </g>;
  if (familia === 'gato') return <g stroke="#282a49" strokeWidth="2.5" strokeLinejoin="round">
    <path d="m29 54 1-32 23 15m15 0 22-15 1 32" fill={cor}/><path d="m35 40-1-10 11 10m30 0 10-10 1 13" fill="#dba6dd" stroke="none"/>
    <path d="M26 63q0-31 34-31t34 31v12q0 24-34 24T26 75Z" fill={cor}/><path d="M46 38q7 9 14 9t14-9" fill="#c8b1ed" stroke="none"/><Olhos/><path d="m56 71 4 4 4-4" fill="#b96c99" stroke="none"/><Sorriso y={79}/><path d="M38 74 19 71m19 10-17 3m61-10 19-3M82 81l17 3" stroke="#59617a" strokeWidth="2"/>
  </g>;
  if (familia === 'coruja') return <g stroke="#282a49" strokeWidth="2.5" strokeLinejoin="round">
    <path d="m30 47-7-25 25 12q12-5 24 0l25-12-7 25q9 35-4 46L60 105 34 93q-13-11-4-46Z" fill={cor}/>
    <path d="M33 47q10-8 27 6 17-14 27-6v23q-8 15-27 10-19 5-27-10Z" fill="#f4eaff" stroke="none"/>
    <circle cx="44" cy="59" r="13" fill="#fefbff"/><circle cx="76" cy="59" r="13" fill="#fefbff"/><Olhos/><path d="m55 76 5 9 5-9" fill="#ffc66b"/><path d="m43 91 5 4m9-1 3 4m11-7 5-3" stroke="#7c61a5" strokeWidth="3"/>
  </g>;
  if (familia === 'astronauta') return <g stroke="#24324b" strokeWidth="2.5" strokeLinejoin="round">
    <path d="M34 98v-8h52v8l-6 12H40Z" fill="#a9c5ee"/><path d="M25 65q0-43 35-43t35 43v15q0 23-35 23T25 80Z" fill={cor}/>
    <rect x="19" y="58" width="10" height="25" rx="5" fill="#c7d7ed"/><rect x="91" y="58" width="10" height="25" rx="5" fill="#c7d7ed"/>
    <rect x="33" y="39" width="54" height="47" rx="22" fill="#253f6b"/><path d="M40 50q6-10 19-8" stroke="#9bb5df" strokeWidth="4" strokeLinecap="round" fill="none"/><Olhos claros y={62}/><path d="M54 76q6 4 12 0" stroke="#8de7e1" strokeWidth="3" strokeLinecap="round" fill="none"/><circle cx="60" cy="96" r="4" fill="#9ce4db" stroke="none"/>
  </g>;
  if (familia === 'robo') return <g stroke="#24324b" strokeWidth="2.5" strokeLinejoin="round">
    <path d="M60 33V21"/><circle cx="60" cy="17" r="6" fill="#ffc97c"/>
    <rect x="25" y="34" width="70" height="59" rx="23" fill={cor}/><rect x="18" y="51" width="10" height="25" rx="4" fill="#56b9b0"/><rect x="92" y="51" width="10" height="25" rx="4" fill="#56b9b0"/>
    <rect x="34" y="45" width="52" height="33" rx="13" fill="#234458"/><Olhos claros/><path d="M48 84h24" stroke="#3e918c" strokeWidth="4" strokeLinecap="round"/><path d="M40 94v8h40v-8" fill="#73cdc4"/><circle cx="43" cy="87" r="2" fill="#fff" stroke="none"/>
  </g>;
  return <g stroke="#29344c" strokeWidth="2.5" strokeLinejoin="round">
    <path d="m34 48-8-18 20 8m30 0 18-9-7 21" fill="#ffe3a1"/><path d="m46 32 7-12 9 11 10-11 6 15" fill="#81bf89"/>
    <path d="M29 57q0-29 31-29t31 29v17q0 28-31 28T29 74Z" fill={cor}/><path d="m29 55-13 8 14 6m61-14 13 8-14 6" fill="#9bd693"/>
    <ellipse cx="60" cy="82" rx="25" ry="16" fill="#e5f1bd" stroke="none"/><Olhos y={55}/><circle cx="50" cy="77" r="2" fill="#72926f" stroke="none"/><circle cx="70" cy="77" r="2" fill="#72926f" stroke="none"/><Sorriso y={87}/><path d="m35 65 4 3m43-3-4 3" stroke="#f5b9a0" strokeWidth="4" strokeLinecap="round"/>
  </g>;
}

function Pixel({ familia, fundo, cor }: { familia: string; fundo: string; cor: string }) {
  const borda = '#19263b';
  return <>
    <path d="M4 1h24v2h2v2h1v22h-1v2h-2v2H4v-2H2v-2H1V5h1V3h2Z" fill={fundo}/><path d="M6 4h2v2H6Zm19 2h2v2h-2ZM4 23h2v2H4Z" fill="#fff" opacity=".25"/>
    {familia === 'cristal' ? <><path d="M13 5h6v3h4v4h3v7h-3v4h-4v4h-6v-4H9v-4H6v-7h3V8h4Z" fill={borda}/><path d="M14 7h4v3h4v3h2v5h-3v4h-3v3h-4v-3h-3v-4H8v-5h3v-3h3Z" fill={cor}/><path d="M14 7h4v6h3v6h-3v6h-4v-7h-3v-5h3Z" fill="#5ebfbd"/><path d="M14 10h3v3h-3Zm-3 3h3v3h-3Z" fill="#e5fff3"/><path d="M2 13h2v2H2Zm24 10h2v2h-2Z" fill="#f6dd99"/></> : familia === 'raposa' ? <><path d="M7 6h4v3h10V6h4v14h-3v5h-4v2h-4v-2h-4v-5H7Z" fill={borda}/><path d="M9 8h2v4h10V8h2v11h-3v4h-3v2h-2v-2h-3v-4H9Z" fill={cor}/><path d="M9 16h4v3h6v-3h4v3h-3v4h-3v2h-2v-2h-3v-4H9Z" fill="#ffedc8"/><path d="M11 14h3v3h-3Zm7 0h3v3h-3Zm-3 6h2v2h-2Z" fill={borda}/></> : <>
      <path d="M10 8h12v3h3v11h-3v3h-3v3h-9v-3H7V11h3Z" fill={borda}/><path d="M10 12h12v10h-3v3h-6v-3h-3Z" fill={cor}/>
      {familia === 'guardiao' ? <><path d="M10 7h12v3h3v9h-5v-3h-8v3H7v-9h3Z" fill="#76b8d3"/><path d="M14 7h4v18h-4Z" fill="#bddff2"/><path d="M10 13h4v3h-4Zm8 0h4v3h-4Z" fill={borda}/><path d="M10 25h12v4H10Z" fill="#70cbbc"/></> : familia === 'mago' ? <><path d="M14 3h4v3h3v3h3v3h3v3H5v-3h3V9h3V6h3Z" fill={borda}/><path d="M15 5h2v4h4v3h3v1H8v-1h3V9h4Z" fill="#9f7de2"/><path d="M15 8h2v2h-2Z" fill="#ffe598"/><path d="M10 22h3v3h6v-3h3v5h-3v2h-6v-2h-3Z" fill="#e9deff"/></> : familia === 'exploradora' ? <><path d="M9 6h14v3h3v4H6V9h3Z" fill={borda}/><path d="M10 8h12v3H10Z" fill="#e2b66c"/><path d="M7 12h18v2H7Z" fill="#f8d38c"/><path d="M8 15h3v11H8Zm14 0h3v11h-3Z" fill="#7d524e"/><path d="M12 24h8v4h-8Z" fill="#8bcaad"/></> : <><path d="M10 6h12v3h3v6H7V9h3Z" fill={borda}/><path d="M10 8h12v5H10Z" fill="#9f9af2"/><path d="M8 11h16v3H8Z" fill="#b8b6ff"/><path d="M10 25h12v4H10Z" fill="#dd9fbc"/></>}
      <path d="M11 16h3v3h-3Zm7 0h3v3h-3Z" fill={borda}/><path d="M14 21h4v2h-4Z" fill="#a36372"/>
    </>}
  </>;
}

function Game({ familia, cor }: { familia: string; cor: string }) {
  const pele = familia === 'ranger' ? '#d2a288' : familia === 'inventora' ? '#b87966' : '#efc5a9';
  return <g stroke="#252b45" strokeWidth="2.5" strokeLinejoin="round">
    <path d="m25 104 9-21 26-10 26 10 9 21" fill={cor}/><path d="m50 81 10 17 10-17" fill="#283a56" stroke="none"/>
    {familia === 'guardiao' ? <><path d="M30 59q-2-31 30-38 32 7 30 38l-6 28-24 12-24-12Z" fill={cor}/><path d="m33 47 27-8 27 8-6 27-21 14-21-14Z" fill="#434565"/><path d="M60 20v78" stroke="#ffefbc" strokeWidth="7"/><path d="m40 57 13 4m14 0 13-4" stroke="#defbff" strokeWidth="4" strokeLinecap="round"/><path d="m50 26 10-16 10 16" fill="#ffedbd"/></> : familia === 'ninja' ? <><path d="M27 58q0-35 33-35t33 35v24L75 98H45L27 82Z" fill="#303f62"/><path d="M33 48h54v25H33Z" fill={pele}/><path d="M29 42h62v12H29Z" fill={cor}/><path d="m91 45 18-5-10 14 9 9-17-8Z" fill={cor}/><Olhos y={61}/><path d="M32 73h56l-9 19-19 8-19-8Z" fill="#384c70"/><path d="m47 81 13 6 13-6" fill="none" stroke="#7993c0"/></> : <>
      <path d="M34 48q0-27 26-27t26 27v25q0 19-26 25T34 73Z" fill={pele}/>
      {familia === 'piloto' ? <><path d="M28 62q-2-41 32-41t32 41l-8 16V54l-24-5-24 5v24Z" fill={cor}/><path d="M39 39h42v9H39Z" fill="#7472b2"/><rect x="23" y="55" width="14" height="22" rx="5" fill="#b1c5ed"/><rect x="83" y="55" width="14" height="22" rx="5" fill="#b1c5ed"/><path d="M91 74v12H74" fill="none" stroke="#a3e0e2" strokeWidth="4" strokeLinecap="round"/></> : familia === 'bardo' ? <><path d="M29 54q0-31 31-31t31 31l-18-13-34 16-10 18Z" fill="#4b4264"/><path d="m23 38 55-18 21 22-72 6Z" fill={cor}/><path d="m78 25 10-13 11 5-13 17" fill="#efbbd8"/><path d="m29 84 16 9-4 15" fill="#467b7b" stroke="none"/></> : familia === 'ranger' ? <><path d="M29 51 39 28h42l10 23-32-9Z" fill="#5d9c82"/><path d="M21 50h78v9H21Z" fill={cor}/><path d="M39 28h42l-5-10H45Z" fill="#82c7a0"/><path d="M34 60h5v24h-5m47-24h5v24h-5" fill="#664e4b" stroke="none"/></> : <><path d="M29 62q-5-41 31-41 35 0 31 41L76 45 60 52 39 45l-3 38-10-11Z" fill="#483452"/><path d="m33 45 10-17 39 6 5 16" fill={cor}/><circle cx="45" cy="42" r="9" fill="#f4da96"/><circle cx="74" cy="45" r="9" fill="#f4da96"/><circle cx="45" cy="42" r="4" fill="#7da2cb" stroke="none"/><circle cx="74" cy="45" r="4" fill="#7da2cb" stroke="none"/><path d="M87 65q14 0 10 21l-8 8" fill="#6c456d"/></>}
      <Olhos y={65}/><Sorriso y={83}/>
    </>}
    <path d="m44 100 16 7 16-7" fill="none" stroke="#fff" strokeOpacity=".5"/>
  </g>;
}
