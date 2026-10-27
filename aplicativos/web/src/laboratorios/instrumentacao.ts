import { parse } from 'acorn';

/** Instrumenta a AST sem alterar strings/comentários nem confundir for com identificadores. */
export function instrumentarJavascript(codigo: string, guarda: string): string {
  const arvore = parse(codigo, { ecmaVersion: 'latest', sourceType: 'script', allowReturnOutsideFunction: false });
  const insercoes: { pos: number; texto: string; ordem: number }[] = [];
  const inserir = (pos: number, texto: string, ordem = 0) => insercoes.push({ pos, texto, ordem });
  const visitar = (no: unknown): void => {
    if (!no || typeof no !== 'object') return;
    const item = no as Record<string, unknown>;
    const corpo = item.body as { type: string; start: number; end: number } | undefined;
    if (['ForStatement', 'ForInStatement', 'ForOfStatement', 'WhileStatement', 'DoWhileStatement'].includes(String(item.type)) && corpo) {
      if (corpo.type === 'BlockStatement') inserir(corpo.start + 1, `${guarda}();`);
      else { inserir(corpo.start, `{${guarda}();`, 1); inserir(corpo.end, '}', -1); }
    }
    if (['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression'].includes(String(item.type)) && corpo) {
      if (corpo.type === 'BlockStatement') inserir(corpo.start + 1, `${guarda}();`);
      else { inserir(corpo.start, `(${guarda}(),`, 1); inserir(corpo.end, ')', -1); }
    }
    for (const [chave, valor] of Object.entries(item)) {
      if (chave === 'start' || chave === 'end') continue;
      if (Array.isArray(valor)) valor.forEach(visitar);
      else if (valor && typeof valor === 'object') visitar(valor);
    }
  };
  visitar(arvore);
  return insercoes.sort((a, b) => b.pos - a.pos || a.ordem - b.ordem).reduce((fonte, item) => fonte.slice(0, item.pos) + item.texto + fonte.slice(item.pos), codigo);
}
