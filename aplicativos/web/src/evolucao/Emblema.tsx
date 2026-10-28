import { niveis } from './regras';

/** Brasões vetoriais originais: cada grau acrescenta camadas à mesma identidade. */
export function Emblema({ grau, desenho = 'nucleo', bloqueado = false, tamanho = 88 }: { grau: number; desenho?: string; bloqueado?: boolean; tamanho?: number }) {
  const cor = niveis[Math.min(Math.max(grau, 0), niveis.length - 1)].cor;
  return <svg viewBox="0 0 120 120" width={tamanho} height={tamanho} aria-hidden="true" focusable="false" className={`evo-emblema ${bloqueado ? 'evo-emblema--bloqueado' : ''}`} style={{ color: cor }}>
    {grau >= 3 && <g className="evo-emblema-halo" fill="none" stroke="currentColor" opacity=".65"><circle cx="60" cy="59" r="51" strokeDasharray={grau >= 6 ? '18 4 2 4' : '3 7'}/>{grau >= 6 && <circle cx="60" cy="59" r="55" strokeWidth=".7"/>}</g>}
    {grau >= 2 && <g fill="currentColor" opacity=".8"><path d="m14 41 13 9v25l-9-7Zm92 0-13 9v25l9-7Z"/>{grau >= 5 && <path d="m8 58 16 12 6 16-12-4Zm104 0L96 70l-6 16 12-4Z"/>}</g>}
    <path d="m60 13 35 19v40L60 96 25 72V32Z" fill="#102b40" stroke="currentColor" strokeWidth="2.5"/>
    <path d="m60 20 29 16v33L60 89 31 69V36Z" fill="currentColor" opacity=".13"/>
    <path d="m60 25 24 13v28L60 82 36 66V38Z" fill="none" stroke="currentColor" opacity=".35"/>
    {grau >= 4 && <path d="m45 17 4-9 11 5L71 8l4 9M42 91l-3 13 21-7 21 7-3-13" fill="#102b40" stroke="currentColor" strokeWidth="2"/>}
    {desenho === 'codigo' ? <g stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none"><path d="m51 43-11 12 11 12m18-24 11 12-11 12m-6-29-6 34"/></g> : desenho === 'blocos' ? <g fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m60 35 13 8-13 8-13-8Zm-14 22 12 8-12 8-13-8Zm28 0 13 8-13 8-12-8ZM47 43v13l13 8 13-8V43"/></g> : desenho === 'conexao' ? <g fill="none" stroke="currentColor" strokeWidth="3"><path d="m43 66 17-22 17 22M43 66h34"/><circle cx="60" cy="43" r="5" fill="#102b40"/><circle cx="43" cy="66" r="5" fill="#102b40"/><circle cx="77" cy="66" r="5" fill="#102b40"/></g> : desenho === 'estrela' ? <g fill="currentColor"><path d="m60 32 7 16 18 6-18 7-7 17-7-17-18-7 18-6Z"/><path d="m82 30 2 5 5 2-5 2-2 5-2-5-5-2 5-2Zm-43-2 1 4 4 1-4 1-1 4-1-4-4-1 4-1Z" opacity=".7"/></g> : <g fill="none" stroke="currentColor"><circle cx="60" cy="55" r="17" strokeWidth="2"/><circle cx="60" cy="55" r="9" strokeWidth="3"/><path d="M60 30v8m0 34v8M35 55h8m34 0h8m-43-18 6 6m24 24 6 6m0-36-6 6M48 67l-6 6" strokeWidth="2"/><circle cx="60" cy="55" r="3" fill="currentColor"/></g>}
    {grau >= 1 && <g fill="currentColor">{Array.from({ length: Math.min(grau, 5) }, (_, i) => <circle key={i} cx={60 + (i - (Math.min(grau, 5) - 1) / 2) * 8} cy="107" r="2"/>)}</g>}
    {grau === 7 && <path d="m60 2 3 4-3 4-3-4ZM1 59l4-3 4 3-4 3Zm110 0 4-3 4 3-4 3Z" fill="currentColor"/>}
  </svg>;
}
