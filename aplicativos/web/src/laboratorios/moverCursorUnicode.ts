/** Move o cursor por grafema visível, sem dividir emojis compostos ou acentos. */
const segmentador = typeof Intl !== 'undefined' && 'Segmenter' in Intl
  ? new Intl.Segmenter('pt-BR', { granularity: 'grapheme' })
  : null;

export function moverCursorUnicode(texto: string, posicao: number, direcao: -1 | 1): number {
  const numero = Number.isFinite(posicao) ? Math.trunc(posicao) : 0;
  const atual = Math.max(0, Math.min(texto.length, numero));
  if (direcao < 0 && atual === 0) return 0;
  if (direcao > 0 && atual === texto.length) return texto.length;

  // Windows usa CRLF (\\r\\n): tratar a quebra como um único movimento.
  // Também recupera o cursor caso uma seleção externa o deixe entre CR e LF.
  if (direcao > 0 && texto.slice(atual, atual + 2) === '\r\n') return atual + 2;
  if (direcao < 0 && texto.slice(atual - 2, atual) === '\r\n') return atual - 2;
  if (direcao > 0 && atual > 0 && texto[atual - 1] === '\r' && texto[atual] === '\n') return atual + 1;
  if (direcao < 0 && texto[atual - 1] === '\r' && texto[atual] === '\n') return atual - 1;

  if (segmentador) {
    // Segmenta apenas a linha atual: documentos grandes não são percorridos a cada toque.
    const inicio = texto.lastIndexOf('\n', Math.max(0, atual - 1)) + 1;
    const fimEncontrado = texto.indexOf('\n', atual);
    const fim = fimEncontrado < 0 ? texto.length : fimEncontrado;
    if (direcao < 0 && atual === inicio && inicio > 0) return inicio - 1;
    if (direcao > 0 && atual === fim && fim < texto.length) return fim + 1;
    const limites = [inicio];
    for (const parte of segmentador.segment(texto.slice(inicio, fim))) {
      limites.push(inicio + parte.index + parte.segment.length);
    }
    if (direcao < 0) {
      for (let i = limites.length - 1; i >= 0; i--) {
        if (limites[i] < atual) return limites[i];
      }
      return inicio;
    }
    for (const limite of limites) {
      if (limite > atual) return limite;
    }
    return fim;
  }

  // Compatibilidade com navegadores antigos: ao menos preserva pares UTF-16.
  if (direcao < 0) {
    const anterior = atual - 1;
    return anterior > 0 && ehBaixo(texto.charCodeAt(anterior)) && ehAlto(texto.charCodeAt(anterior - 1)) ? anterior - 1 : anterior;
  }
  return atual + (atual + 1 < texto.length && ehAlto(texto.charCodeAt(atual)) && ehBaixo(texto.charCodeAt(atual + 1)) ? 2 : 1);
}
function ehAlto(codigo: number) { return codigo >= 0xd800 && codigo <= 0xdbff; }
function ehBaixo(codigo: number) { return codigo >= 0xdc00 && codigo <= 0xdfff; }
