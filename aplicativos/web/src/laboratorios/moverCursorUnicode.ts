/** Move o cursor por ponto de código, preservando pares substitutos UTF-16. */
export function moverCursorUnicode(texto: string, posicao: number, direcao: -1 | 1): number {
  const atual = Math.max(0, Math.min(texto.length, Math.trunc(posicao)));
  if (direcao < 0) {
    if (atual === 0) return 0;
    const anterior = atual - 1;
    return anterior > 0 && ehBaixo(texto.charCodeAt(anterior)) && ehAlto(texto.charCodeAt(anterior - 1)) ? anterior - 1 : anterior;
  }
  if (atual >= texto.length) return texto.length;
  return atual + (atual + 1 < texto.length && ehAlto(texto.charCodeAt(atual)) && ehBaixo(texto.charCodeAt(atual + 1)) ? 2 : 1);
}
function ehAlto(codigo: number) { return codigo >= 0xd800 && codigo <= 0xdbff; }
function ehBaixo(codigo: number) { return codigo >= 0xdc00 && codigo <= 0xdfff; }
