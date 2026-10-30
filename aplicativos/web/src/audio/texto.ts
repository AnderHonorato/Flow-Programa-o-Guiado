/** Preserva o conteúdo de estudo e evita soletrar blocos inteiros de código. */
export function prepararTexto(texto: string, idioma: 'pt-BR' | 'en' = 'pt-BR'): string {
  let preparado = texto.replace(/```[\s\S]*?```/g, idioma === 'pt-BR'
    ? ' Há um exemplo de código para consultar no laboratório. '
    : ' There is a code example to read in the laboratory. ')
    .replace(/`([^`]+)`/g, '$1');
  if (idioma === 'pt-BR') preparado = preparado.replace(/\bHTML\b/g, 'agá tê eme ele')
    .replace(/\bCSS\b/g, 'cê ésse ésse').replace(/\bDOM\b/g, 'dóm').replace(/\bAPI\b/g, 'a pê i');
  return preparado.replace(/\s+/g, ' ').trim();
}

export interface Trecho { texto: string; indice: number }
/** Limita o texto antes de enviá-lo ao TTS nativo, que aceita até 4.000 caracteres. */
export function dividirTrechos(blocos: string[], idioma: 'pt-BR' | 'en', inicio = 0): Trecho[] {
  const trechos: Trecho[] = [];
  for (let indice = Math.max(0, inicio); indice < blocos.length; indice++) {
    let texto = prepararTexto(blocos[indice], idioma);
    while (texto.length > 3300) {
      const pausa = Math.max(texto.lastIndexOf('. ', 3300), texto.lastIndexOf(' ', 3300));
      const corte = pausa > 1600 ? pausa + 1 : 3300;
      trechos.push({ texto: texto.slice(0, corte).trim(), indice });
      texto = texto.slice(corte).trim();
    }
    if (texto) trechos.push({ texto, indice });
  }
  return trechos;
}
