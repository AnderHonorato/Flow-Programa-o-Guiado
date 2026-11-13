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
  // CodeMirror usa offsets UTF-16. Nunca dividir um par substituto (emoji)
  // ao calcular as bordas: isso evita uma edição intermediária inválida.
  const substitutoAlto = (valor: number) => valor >= 0xd800 && valor <= 0xdbff;
  const substitutoBaixo = (valor: number) => valor >= 0xdc00 && valor <= 0xdfff;
  if (inicio > 0 && inicio < anterior.length &&
      substitutoAlto(anterior.charCodeAt(inicio - 1)) && substitutoBaixo(anterior.charCodeAt(inicio))) {
    inicio--;
  }
  if (fimAnterior > inicio && fimAnterior < anterior.length &&
      substitutoAlto(anterior.charCodeAt(fimAnterior - 1)) && substitutoBaixo(anterior.charCodeAt(fimAnterior))) {
    fimAnterior++;
    fimProximo++;
  }
  return { from: inicio, to: fimAnterior, insert: proximo.slice(inicio, fimProximo) };
}
