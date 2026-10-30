/** Compara dados observáveis, sem avaliar expressões ou código do aluno. */
export function verificarSaida(registros: string[], esperado: string, propriedade?: string): boolean {
  if (!propriedade?.startsWith('json:')) return registros.length > 0 && registros.join('\n').includes(esperado);
  const caminho = propriedade.slice(5).split('.').filter(Boolean);
  if (caminho.length > 8 || caminho.some(chave => !/^[a-zA-Z0-9_-]+$/.test(chave) || ['__proto__', 'constructor', 'prototype'].includes(chave))) return false;
  let alvo: unknown;
  try { alvo = JSON.parse(esperado); } catch { return false; }
  const iguais = (a: unknown, b: unknown): boolean => {
    if (a === b) return true;
    if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) !== Array.isArray(b)) return false;
    const chaves = Object.keys(a);
    return chaves.length === Object.keys(b).length && chaves.every(chave => Object.hasOwn(b, chave) && iguais((a as Record<string, unknown>)[chave], (b as Record<string, unknown>)[chave]));
  };
  return registros.some(registro => {
    try {
      let valor = JSON.parse(registro);
      for (const chave of caminho) { if (valor === null || typeof valor !== 'object' || !Object.hasOwn(valor, chave)) return false; valor = valor[chave]; }
      return iguais(valor, alvo);
    } catch { return false; }
  });
}
