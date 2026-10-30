import type { ControleExperimento, ModeloExperimento, ResultadoExperimento } from './modeloExperimento';

const numero = (id: string, rotulo: string, inicial: number, minimo: number, maximo: number): ControleExperimento => ({ id, rotulo, tipo: 'numero', inicial: String(inicial), minimo, maximo });
const texto = (id: string, rotulo: string, inicial: string): ControleExperimento => ({ id, rotulo, tipo: 'texto', inicial });
const escolha = (id: string, rotulo: string, inicial: string, opcoes: string[][]): ControleExperimento => ({ id, rotulo, tipo: 'escolha', inicial, opcoes: opcoes.map(([valor, texto]) => ({ valor, texto })) });

export const modelosExpansao: Record<string, ModeloExperimento> = {
  'fundamentos-algoritmos': { titulo: 'Divida a conta em etapas', instrucao: 'A biblioteca começa com doze livros. Mude as doações e os empréstimos; acompanhe a saída de uma etapa entrando na próxima.', controles: [numero('doacoes', 'Livros recebidos em doação', 3, 0, 6), numero('emprestimos', 'Livros emprestados', 4, 0, 12)] },
  'html-tabelas': { titulo: 'Uma tabela que explica suas relações', instrucao: 'Mude o nome e compare células de dados com cabeçalhos que identificam linhas e colunas.', controles: [texto('nome', 'Nome da oficina na tabela', 'Leitura'), numero('vagas', 'Vagas na tabela', 4, 0, 12), escolha('cabecalhos', 'Relações dos cabeçalhos', 'sim', [['sim', 'Com th e scope'], ['nao', 'Somente células td']])] },
  'css-grid': { titulo: 'Monte uma grade de verdade', instrucao: 'Altere colunas, espaço e largura. A mesma coleção se reorganiza na prévia.', controles: [numero('colunas', 'Número de colunas', 2, 1, 3), numero('gap', 'Espaço entre itens em pixels', 12, 0, 24), numero('largura', 'Largura máxima da grade em pixels', 320, 180, 380)] },
  'js-escopo': { titulo: 'Duas memórias independentes', instrucao: 'Cada chamada à fábrica cria uma memória. Mude o início e a quantidade de chamadas de A; B tem seu próprio contador.', controles: [numero('inicio', 'Valor inicial do contador A', 0, 0, 3), numero('chamadas', 'Chamadas do contador A', 2, 0, 4)] },
  'dom-formularios': { titulo: 'Do campo para o dado tratado', instrucao: 'Digite um nome ou só espaços. Compare o valor coletado por FormData com o texto após trim. Nenhum dado é enviado.', controles: [texto('nome', 'Nome preenchido no formulário', '  Ana  ')] },
  'python-arquivos': { titulo: 'Rastreie a ida e a volta do JSON', instrucao: 'Mude os dados e acompanhe o conteúdo do arquivo virtual. Este rastreamento não executa Python; execute seu programa no laboratório.', controles: [texto('nome', 'Nome gravado no JSON', 'Leitura'), numero('vagas', 'Vagas gravadas no JSON', 3, 0, 12)] },
  'frontend-estado': { titulo: 'Um estado, uma tela coerente', instrucao: 'Mude a quantidade selecionada. O resumo e a disponibilidade são derivados do mesmo estado, entre zero e cinco vagas.', controles: [numero('quantidade', 'Vagas selecionadas', 0, 0, 5)] },
  'api-validacao': { titulo: 'A resposta acompanha a validação', instrucao: 'Compare entradas válidas e inválidas. A Response é criada localmente; nenhum servidor recebe ou salva dados.', controles: [escolha('entrada', 'Dados recebidos na simulação', 'zero', [['zero', 'Nome válido e zero vagas'], ['negativa', 'Vagas negativas'], ['texto', 'Vagas como texto'], ['nome', 'Nome vazio']])] },
  'fullstack-sessao': { titulo: 'Sessão válida ainda precisa de permissão', instrucao: 'Explore 401, 403 e 200 neste simulador local. Em uma aplicação real, o servidor verifica a sessão e a permissão em cada requisição.', controles: [escolha('sessao', 'Situação da sessão simulada', 'ausente', [['ausente', 'Sem sessão'], ['expirada', 'Expirada agora'], ['revogada', 'Revogada'], ['aluno', 'Ativa: aluno'], ['admin', 'Ativa: administrador']]), escolha('rota', 'Recurso consultado', 'admin', [['perfil', 'Perfil do próprio usuário'], ['admin', 'Administração']])] },
  'projeto-calculadora': { titulo: 'Uma conta começa pela entrada', instrucao: 'Experimente soma, subtração, vírgula decimal e campo vazio. Neste modelo, cada operando pode ter módulo de até um milhão.', controles: [texto('primeiro', 'Primeiro valor da conta', '12,5'), texto('segundo', 'Segundo valor da conta', '2'), escolha('operacao', 'Operação da conta', 'somar', [['somar', 'Somar'], ['subtrair', 'Subtrair']])] },
};

const escapar = (valor: string) => valor.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const documento = (html: string, css = '') => `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; form-action 'none'; base-uri 'none'"><style>body{font:16px system-ui;color:#163249;background:#f5fbff;margin:16px;overflow-wrap:anywhere}*{box-sizing:border-box}h2{font-size:20px}table{border-collapse:collapse;width:100%}th,td{padding:10px;border:1px solid #176877;text-align:left}caption{text-align:left;font-weight:700;margin-bottom:12px}output{display:block}article{padding:12px;background:#d5f2ec;border:1px solid #176877}${css}</style></head><body>${html}</body></html>`;

/** Somente programas autorais fixos e dados limitados; nunca avalia código digitado. */
export function calcularExpansao(id: string, valores: Record<string, string>): ResultadoExperimento | undefined {
  if (!Object.hasOwn(modelosExpansao, id)) return undefined;
  const modelo = modelosExpansao[id];
  const v = { ...Object.fromEntries(modelo.controles.map(c => [c.id, c.inicial])), ...valores };
  const s = (chave: string) => String(v[chave] ?? '').slice(0, 100);
  const n = (chave: string) => {
    const controle = modelo.controles.find(c => c.id === chave)!;
    const valor = Number(v[chave]);
    return Number.isFinite(valor) ? Math.round(Math.min(controle.maximo!, Math.max(controle.minimo!, valor))) : Number(controle.inicial);
  };
  switch (id) {
    case 'fundamentos-algoritmos': {
      const doacoes = n('doacoes'), emprestimos = n('emprestimos');
      return { codigo: `const estoqueInicial = 12;\nconst doacoes = ${doacoes};\nconst emprestimos = ${emprestimos};\nconst depoisDasDoacoes = estoqueInicial + doacoes;\nconst saldo = depoisDasDoacoes - emprestimos;\nconsole.log("Depois das doações:", depoisDasDoacoes);\nconsole.log("Saldo:", saldo);`, resultado: `Depois das doações: ${12 + doacoes}\nSaldo: ${12 + doacoes - emprestimos}`, explicacao: 'A tarefa foi decomposta: receber os dados, somar as doações e descontar os empréstimos. depoisDasDoacoes precisa existir antes de calcular saldo. Os nomes tornam a dependência entre as etapas visível.' };
    }
    case 'html-tabelas': {
      const nome = s('nome'), vagas = n('vagas'), cabecalhos = v.cabecalhos !== 'nao';
      const html = `<table>\n  <caption>Oficinas e vagas disponíveis</caption>\n  <thead><tr>${cabecalhos ? '<th scope="col">Oficina</th><th scope="col">Vagas</th>' : '<td>Oficina</td><td>Vagas</td>'}</tr></thead>\n  <tbody><tr>${cabecalhos ? `<th scope="row">${escapar(nome)}</th>` : `<td>${escapar(nome)}</td>`}<td>${vagas}</td></tr></tbody>\n</table>`;
      return { codigo: html, resultado: `${nome}: ${vagas} vagas.\n${cabecalhos ? 'Cabeçalhos de coluna e linha identificados.' : 'As células td não declaram relações de cabeçalho.'}`, explicacao: 'caption nomeia a tabela. th identifica um cabeçalho; scope="col" o relaciona à coluna e scope="row" à linha. A aparência pode ser parecida, mas o significado para navegação assistiva muda.', documento: documento(html) };
    }
    case 'css-grid': {
      const colunas = n('colunas'), gap = n('gap'), largura = n('largura');
      const css = `.grade {\n  display: grid;\n  grid-template-columns: repeat(${colunas}, minmax(0, 1fr));\n  gap: ${gap}px;\n  width: ${largura}px;\n  max-width: 100%;\n}`;
      return { codigo: css, resultado: `${colunas} ${colunas === 1 ? 'coluna' : 'colunas'}, ${gap}px entre itens.\nLargura de até ${largura}px, limitada pelo espaço da prévia.`, explicacao: 'Grid organiza os filhos em linhas e colunas. Cada 1fr recebe uma parte do espaço restante após o gap; minmax(0, 1fr) permite encolher sem impor a largura mínima do conteúdo.', documento: documento('<div class="grade"><article>Leitura</article><article>Escrita</article><article>Desenho</article><article>Teatro</article></div>', css) };
    }
    case 'js-escopo': {
      const inicio = n('inicio'), chamadas = n('chamadas');
      return { codigo: `function criarContador(inicio) {\n  let quantidade = inicio;\n  return function incrementar() {\n    quantidade += 1;\n    return quantidade;\n  };\n}\nconst contarA = criarContador(${inicio});\nconst contarB = criarContador(0);\nlet ultimoA = ${inicio};\nfor (let passo = 0; passo < ${chamadas}; passo += 1) {\n  ultimoA = contarA();\n}\nconsole.log("A:", ultimoA);\nconsole.log("B:", contarB());`, resultado: `A: ${inicio + chamadas}\nB: 1`, explicacao: 'A função devolvida mantém acesso à variável da chamada que a criou: isso é uma closure. A e B não compartilham quantidade. Cada passagem pelo laço chama apenas A; B só é chamado uma vez.' };
    }
    case 'dom-formularios': {
      const bruto = s('nome'), nome = bruto.trim(), mensagem = nome ? `Nome conferido: ${nome}` : 'Informe seu nome.';
      return { codigo: `const formulario = document.createElement("form");\nconst campo = document.createElement("input");\ncampo.name = "nome";\ncampo.value = ${JSON.stringify(bruto)};\nformulario.append(campo);\nconst dados = new FormData(formulario);\nconst nome = String(dados.get("nome") ?? "").trim();\nconst mensagem = nome ? \`Nome conferido: \${nome}\` : "Informe seu nome.";\nconsole.log(mensagem);`, resultado: `Valor coletado: ${JSON.stringify(bruto)}\nApós trim: ${JSON.stringify(nome)}\n${mensagem}`, explicacao: 'FormData usa o atributo name para identificar o campo. trim remove espaços nas extremidades; um nome só com espaços fica vazio. O laboratório ensina a tratar submit e apresentar o recado com textContent, sem enviar dados.', documento: documento(`<h2>Conferência local</h2><p>Nome coletado: ${escapar(JSON.stringify(bruto))}</p><output>${escapar(mensagem)}</output>`) };
    }
    case 'python-arquivos': {
      const nome = s('nome'), vagas = n('vagas'), json = JSON.stringify({ nome, vagas });
      return { codigo: `import json\ndados = {"nome": ${JSON.stringify(nome)}, "vagas": ${vagas}}\nwith open("experimento_oficina.json", "w", encoding="utf-8") as arquivo:\n    json.dump(dados, arquivo, ensure_ascii=False)\nwith open("experimento_oficina.json", "r", encoding="utf-8") as arquivo:\n    lido = json.load(arquivo)\nprint(lido["nome"])\nprint(lido["vagas"])`, resultado: `Rastreamento do arquivo JSON: ${json}\nApós a leitura: ${nome} · ${vagas} vagas`, explicacao: 'Este é um rastreamento dos dados, não uma execução Python. No laboratório, open usa o sistema de arquivos virtual do runtime: não abre arquivos pessoais do aparelho. with fecha o arquivo, UTF-8 preserva acentos e json.load recupera vagas como número. O arquivo virtual não garante persistência após reiniciar o runtime.' };
    }
    case 'frontend-estado': {
      const quantidade = n('quantidade'), restantes = 5 - quantidade;
      return { codigo: `let selecionadas = ${quantidade};\nconst capacidade = 5;\nfunction renderizar() {\n  const restantes = capacidade - selecionadas;\n  const resumo = document.querySelector("#resumo");\n  if (resumo) resumo.textContent = \`\${selecionadas} selecionadas · \${restantes} disponíveis\`;\n}\nrenderizar();`, resultado: `${quantidade} selecionadas · ${restantes} disponíveis`, explicacao: 'O estado é selecionadas. A disponibilidade é calculada a partir dele, sem manter outra contagem que possa divergir. Após adicionar ou remover no laboratório, a mesma função renderizar atualiza o resumo.', documento: documento(`<h2>Reserva de vagas</h2><output id="resumo">${quantidade} selecionadas · ${restantes} disponíveis</output>`) };
    }
    case 'api-validacao': {
      const entrada = { nome: v.entrada === 'nome' ? '   ' : 'Leitura', vagas: v.entrada === 'negativa' ? -1 : v.entrada === 'texto' ? '3' : 0 };
      const erro = !entrada.nome.trim() ? 'nome inválido' : !Number.isInteger(entrada.vagas) || Number(entrada.vagas) < 0 ? 'vagas inválidas' : '';
      const corpo = erro ? { erro } : { nome: entrada.nome.trim(), vagas: entrada.vagas };
      return { codigo: `// Simulação local: não recebe nem grava dados em um servidor.\nconst recebido = ${JSON.stringify(entrada)};\nlet erro = "";\nif (typeof recebido.nome !== "string" || !recebido.nome.trim()) erro = "nome inválido";\nelse if (!Number.isInteger(recebido.vagas) || recebido.vagas < 0) erro = "vagas inválidas";\nconst corpo = erro ? { erro } : { nome: recebido.nome.trim(), vagas: recebido.vagas };\nconst resposta = new Response(JSON.stringify(corpo), {\n  status: erro ? 422 : 201,\n  headers: { "Content-Type": "application/json" }\n});\nconsole.log(resposta.status);\nconsole.log(corpo);`, resultado: `Status local: ${erro ? 422 : 201}\n${JSON.stringify(corpo)}`, explicacao: erro ? 'A entrada é recusada antes de criar o recurso. A resposta local 422 descreve qual campo viola o contrato; não convertemos silenciosamente uma string em número.' : 'Zero vagas é um inteiro válido e não negativo. O modelo produz uma Response local 201 com JSON; persistência e validação de uma API real pertencem ao servidor.' };
    }
    case 'fullstack-sessao': {
      const situacao = ['expirada', 'revogada', 'aluno', 'admin'].includes(v.sessao) ? v.sessao : 'ausente';
      const sessao = situacao === 'ausente' ? null : { papel: situacao === 'admin' ? 'admin' : 'aluno', expiraEm: situacao === 'expirada' ? 100 : 101, revogada: situacao === 'revogada' };
      const precisaAdmin = v.rota !== 'perfil';
      const status = !sessao || sessao.revogada || sessao.expiraEm <= 100 ? 401 : precisaAdmin && sessao.papel !== 'admin' ? 403 : 200;
      return { codigo: `// Simulador local de uma decisão que, em produção, pertence ao servidor.\nconst agora = 100;\nconst sessao = ${JSON.stringify(sessao)};\nconst precisaAdmin = ${precisaAdmin};\nlet status;\nif (!sessao || sessao.revogada || sessao.expiraEm <= agora) {\n  status = 401;\n} else if (precisaAdmin && sessao.papel !== "admin") {\n  status = 403;\n} else {\n  status = 200;\n}\nconsole.log(status);`, resultado: `${status} · ${status === 401 ? 'É necessário autenticar novamente.' : status === 403 ? 'Sessão válida, permissão insuficiente.' : 'Sessão válida e acesso permitido.'}`, explicacao: 'Ausência, revogação ou expiração produzem 401. No instante exato de expiração, a sessão já venceu. Uma sessão válida de aluno pode acessar seu perfil, mas recebe 403 na administração. Em produção, o servidor verifica tudo isso a cada requisição. Este simulador não faz login nem protege uma rota real: nunca confie em um papel escolhido no navegador.' };
    }
    case 'projeto-calculadora': {
      const primeiro = s('primeiro'), segundo = s('segundo'), somar = v.operacao !== 'subtrair';
      const converter = (valor: string) => valor.trim() === '' ? null : Number(valor.trim().replace(',', '.'));
      const a = converter(primeiro), b = converter(segundo);
      const valido = (valor: number | null): valor is number => valor !== null && Number.isFinite(valor) && Math.abs(valor) <= 1_000_000;
      const erro = !valido(a) ? 'Revise o primeiro valor.' : !valido(b) ? 'Revise o segundo valor.' : '';
      const resultado = valido(a) && valido(b) ? String(somar ? a + b : a - b) : erro;
      return { codigo: `function lerNumero(texto) {\n  const limpo = texto.trim();\n  if (!limpo) return null;\n  const valor = Number(limpo.replace(",", "."));\n  return Number.isFinite(valor) && Math.abs(valor) <= 1000000 ? valor : null;\n}\nconst primeiro = lerNumero(${JSON.stringify(primeiro)});\nconst segundo = lerNumero(${JSON.stringify(segundo)});\nif (primeiro === null) console.log("Revise o primeiro valor.");\nelse if (segundo === null) console.log("Revise o segundo valor.");\nelse console.log(primeiro ${somar ? '+' : '-'} segundo);`, resultado, explicacao: erro ? 'Um campo vazio não é zero. A conversão acontece após trim e a normalização da vírgula; recusamos valores não finitos ou fora do limite deste experimento. No projeto, o feedback deve indicar o campo e devolver o foco a ele.' : 'As duas entradas foram convertidas e validadas antes da operação. O resultado vem de uma conta numérica real; a vírgula da entrada foi normalizada para o ponto usado no código.' };
    }
    default: return undefined;
  }
}
