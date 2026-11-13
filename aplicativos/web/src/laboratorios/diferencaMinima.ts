/** Calcula a menor substituição contínua entre duas versões do código. */
export function diferencaMinima(anterior: string, proximo: string): { from: number; to: number; insert: string } {
  let inicio = 0;
  const limite = Math.min(anterior.length, proximo.length);
  while (inicio < limite && anterior[inicio] === proximo[inicio]) inicio++;
  let fimAnterior = anterior.length;
  let fimProximo = proximo.length;
  while (fimAnterior > inicio && fimProximo > inicio && anterior[fimAnterior - 1] === proximo[fimProximo - 1]) {
    fimAnterior--;
    fimProximo--;
  }
  return { from: inicio, to: fimAnterior, insert: proximo.slice(inicio, fimProximo) };
}
