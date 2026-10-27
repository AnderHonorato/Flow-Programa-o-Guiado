import type { EstadoLocal } from './armazenamento';

export type ResultadoRevisao = 'correta' | 'com_ajuda' | 'incorreta';
const intervalos = [1, 3, 7, 14, 30];

export function atualizarRevisao(anterior: { etapa: number; proxima: string } | undefined, resultado: ResultadoRevisao, agora = new Date()): { etapa: number; proxima: string } {
  const etapaAnterior = anterior?.etapa ?? -1;
  const etapa = resultado === 'incorreta' ? 0 : resultado === 'com_ajuda' ? Math.max(0, etapaAnterior - 1) : Math.min(4, etapaAnterior + 1);
  return { etapa, proxima: new Date(agora.getTime() + intervalos[etapa] * 86_400_000).toISOString() };
}

export function revisoesPendentes(estado: EstadoLocal, agora = new Date()) {
  return Object.entries(estado.revisoes)
    .filter(([, revisao]) => Date.parse(revisao.proxima) <= agora.getTime())
    .map(([id, revisao]) => ({ id, ...revisao, teveErro: estado.respostas[id] === false }))
    .sort((a, b) => Number(b.teveErro) - Number(a.teveErro) || Date.parse(a.proxima) - Date.parse(b.proxima));
}

const formatos = ['prever_saida', 'encontrar_bug', 'completar', 'ordenar_linhas', 'verdadeiro_falso'] as const;
export interface VariacaoRevisao {
  competencia: string; semente: number; formato: typeof formatos[number];
  enunciado: string; codigo: string; resposta: string; explicacao: string;
}

/** Semente + tentativa permitem reproduzir o exercício e alternar os formatos. */
export function gerarVariacao(competencia: string, semente: number, tentativa = 0): VariacaoRevisao {
  let hash = (semente >>> 0) || 1;
  for (const caractere of competencia) hash = Math.imul(hash ^ caractere.charCodeAt(0), 16777619) >>> 0;
  const indice = ((hash % formatos.length) + Math.max(0, Math.floor(tentativa))) % formatos.length;
  const formato = formatos[indice];
  const numero = ((hash + Math.max(0, Math.floor(tentativa)) * 17) % 8) + 2;
  const base = { competencia, semente, formato };
  const ehHtml = /html|semant|acessib/i.test(competencia);
  const ehCss = /css|layout|flex|grid/i.test(competencia);
  const ehPython = /python/i.test(competencia);
  if (ehHtml) {
    const variacoes = [
      { enunciado: 'Quantos títulos principais e parágrafos este HTML cria?', codigo: '<h1>Minha oficina</h1>\n<p>Aprender construindo.</p>', resposta: 'Um título principal e um parágrafo.', explicacao: 'h1 identifica o título principal; p delimita um parágrafo.' },
      { enunciado: 'Encontre o fechamento incorreto e reescreva a linha do título.', codigo: '<h1>Minha oficina</p>', resposta: '<h1>Minha oficina</h1>', explicacao: 'A abertura h1 deve ser fechada com /h1 para preservar a semântica.' },
      { enunciado: 'Complete a marcação para criar um parágrafo de apresentação.', codigo: '<___>Eu aprendo criando.</___>', resposta: 'p', explicacao: 'A tag p representa um parágrafo de texto.' },
      { enunciado: 'Ordene as linhas para construir um documento com conteúdo dentro de body.', codigo: '1. </body>\n2. <body>\n3. <h1>Minha oficina</h1>', resposta: '2, 3, 1', explicacao: 'Abra body, inclua o conteúdo e feche body.' },
      { enunciado: 'Verdadeiro ou falso: title substitui o título h1 exibido no corpo da página. Explique.', codigo: '<title>Minha oficina</title>', resposta: 'Falso', explicacao: 'title nomeia a aba do navegador; h1 é o título principal do conteúdo visível.' },
    ];
    return { ...base, ...variacoes[indice] };
  }
  if (ehCss) {
    const variacoes = [
      { enunciado: `Qual será a largura total desta caixa, incluindo o preenchimento?`, codigo: `.caixa { width: ${numero * 10}px; padding: ${numero}px; box-sizing: content-box; }`, resposta: `${numero * 12}px`, explicacao: 'content-box soma o padding esquerdo e direito à largura do conteúdo.' },
      { enunciado: 'Encontre e corrija o valor que impede ativar o layout Flexbox.', codigo: '.lista { display: flexbox; }', resposta: '.lista { display: flex; }', explicacao: 'O valor válido para ativar o Flexbox é flex.' },
      { enunciado: 'Complete a propriedade que afasta o conteúdo da borda do elemento.', codigo: `.caixa { ___: ${numero}px; }`, resposta: 'padding', explicacao: 'padding cria espaço interno; margin cria espaço externo.' },
      { enunciado: 'Ordene o seletor, a abertura, a declaração e o fechamento da regra CSS.', codigo: '1. }\n2. color: coral;\n3. .titulo {', resposta: '3, 2, 1', explicacao: 'Uma regra começa com seletor e abre chaves antes das declarações.' },
      { enunciado: 'Verdadeiro ou falso: margin acrescenta espaço dentro da borda. Explique.', codigo: `.caixa { margin: ${numero}px; }`, resposta: 'Falso', explicacao: 'margin cria espaço externo. O espaço interno é controlado por padding.' },
    ];
    return { ...base, ...variacoes[indice] };
  }
  const variacoes = [
    { enunciado: 'Preveja o número mostrado após a soma.', codigo: ehPython ? `valor = ${numero}\nprint(valor + 3)` : `const valor = ${numero};\nconsole.log(valor + 3);`, resposta: String(numero + 3), explicacao: `O programa soma 3 ao valor ${numero}.` },
    { enunciado: 'Encontre a variável escrita com o nome incorreto e corrija a saída.', codigo: ehPython ? `total = ${numero}\nprint(totl)` : `const total = ${numero};\nconsole.log(totl);`, resposta: ehPython ? 'print(total)' : 'console.log(total);', explicacao: 'O nome usado na leitura precisa coincidir com o nome da variável declarada.' },
    { enunciado: 'Complete o operador para obter o dobro do valor inicial.', codigo: ehPython ? `valor = ${numero}\nprint(valor ___ 2)` : `const valor = ${numero};\nconsole.log(valor ___ 2);`, resposta: '*', explicacao: 'O operador * multiplica os números.' },
    { enunciado: 'Ordene as linhas para declarar um valor antes de utilizá-lo.', codigo: ehPython ? `1. print(dobro)\n2. valor = ${numero}\n3. dobro = valor * 2` : `1. console.log(dobro);\n2. const valor = ${numero};\n3. const dobro = valor * 2;`, resposta: '2, 3, 1', explicacao: 'Primeiro defina valor, depois calcule dobro e por fim mostre o resultado.' },
    { enunciado: 'Verdadeiro ou falso: este cálculo modifica automaticamente o valor original. Explique.', codigo: ehPython ? `valor = ${numero}\nresultado = valor + 1` : `const valor = ${numero};\nconst resultado = valor + 1;`, resposta: 'Falso', explicacao: 'A soma produz um novo resultado. A variável valor mantém o número inicial.' },
  ];
  return { ...base, ...variacoes[indice] };
}
