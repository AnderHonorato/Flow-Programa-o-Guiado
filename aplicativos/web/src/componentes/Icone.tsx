import type { ReactNode } from 'react';

const desenhos: Record<string, ReactNode> = {
  inicio: <><path d="m3 10 9-7 9 7v10H3Z"/><path d="M9 20v-7h6v7"/></>,
  trilhas: <><path d="M4 20h5v-5h5v-5h6V4"/><path d="m16 4 4 0 0 4"/><circle cx="4" cy="5" r="2"/></>,
  aula: <><rect x="3" y="4" width="18" height="14" rx="2"/><path d="m10 8 5 3-5 3ZM8 21h8M12 18v3"/></>,
  codigo: <><path d="m7 6-5 6 5 6M17 6l5 6-5 6M14 3l-4 18"/></>,
  revisao: <><path d="M4 8a8 8 0 1 1 0 8M4 3v5h5M12 7v5l3 2"/></>,
  projetos: <><path d="M3 7h7l2-3h5l2 3h2v13H3Z"/><path d="m9 12-3 3 3 3m6-6 3 3-3 3"/></>,
  perfil: <><circle cx="12" cy="7" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/></>,
  comunidade: <><circle cx="8" cy="7" r="3"/><circle cx="17" cy="8" r="2.5"/><path d="M2 21v-3a6 6 0 0 1 12 0v3M16 14a5 5 0 0 1 6 5v2M7 16h2m-1-1v2"/></>,
  admin: <><path d="m12 2 8 3v6c0 5-8 10-8 10S4 16 4 11V5Z"/><path d="m8 11 3 3 5-6"/></>,
  seta: <><path d="M4 12h16m-6-6 6 6-6 6"/></>,
  play: <path d="m8 4 12 8-12 8Z"/>,
  pausa: <><path d="M8 4v16M16 4v16"/></>,
  sol: <><circle cx="12" cy="12" r="4"/><path d="M12 1v2M12 21v2M1 12h2M21 12h2M4 4l2 2M18 18l2 2M20 4l-2 2M6 18l-2 2"/></>,
  lua: <path d="M20 14A9 9 0 0 1 10 3a9 9 0 1 0 10 11Z"/>,
  check: <path d="m4 12 5 5L20 6"/>,
  download: <><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/></>,
  rede: <><path d="M2 8a16 16 0 0 1 20 0M5 12a11 11 0 0 1 14 0M8 16a6 6 0 0 1 8 0"/><circle cx="12" cy="20" r=".8"/></>,
  sair: <><path d="M10 3H3v18h7M10 12h12m-5-5 5 5-5 5"/></>,
  fechar: <path d="m5 5 14 14M19 5 5 19"/>,
  som: <><path d="M3 9h4l5-5v16l-5-5H3Z"/><path d="M16 8a6 6 0 0 1 0 8M19 4a11 11 0 0 1 0 16"/></>,
  menu: <path d="M3 6h18M3 12h18M3 18h18"/>,
  livro: <><path d="M12 5C9 3 5 3 2 4v15c3-1 7-1 10 1 3-2 7-2 10-1V4c-3-1-7-1-10 1Zm0 0v15"/></>,
  raio: <path d="m13 2-9 12h7l-1 8 10-13h-7Z"/>,
  alvo: <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></>,
  terminal: <><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m6 9 4 3-4 3m7 0h5"/></>,
  escudo: <><path d="m12 2 8 3v6c0 5-8 10-8 10S4 16 4 11V5Z"/><path d="M12 7v6m0 3v.5"/></>,
  mais: <path d="M12 4v16M4 12h16"/>,
  busca: <><circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/></>,
};

/** Ícones decorativos: o elemento interativo que os contém deve ter nome acessível. */
export function Icone({ nome, tamanho = 20, className = '' }: { nome: string; tamanho?: number; className?: string }) {
  return <svg className={className} width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{desenhos[nome] ?? desenhos.livro}</svg>;
}

export default Icone;
