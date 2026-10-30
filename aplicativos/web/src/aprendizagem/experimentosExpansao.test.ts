// @vitest-environment jsdom
import { expect, it } from 'vitest';
import { parse } from 'acorn';
import { runInNewContext } from 'node:vm';
import { calcularExpansao, modelosExpansao } from './experimentosExpansao';

const resultado = (id: string, valores: Record<string, string> = {}) => calcularExpansao(id, valores)!;
// Executa apenas os programas autorais limitados do modelo; nunca código de aluno.
const executarModelo = (id: string, valores: Record<string, string> = {}) => {
  const linhas: string[] = [];
  runInNewContext(resultado(id, valores).codigo, { console: { log: (...valores: unknown[]) => linhas.push(valores.join(' ')) } }, { timeout: 100 });
  return linhas.join('\n');
};

it('oferece dez modelos específicos, com parâmetros finitos e escolhas exploráveis', () => {
  expect(Object.keys(modelosExpansao)).toHaveLength(10);
  expect(new Set(Object.values(modelosExpansao).map(m => m.titulo)).size).toBe(10);
  for (const [id, modelo] of Object.entries(modelosExpansao)) {
    const inicial = resultado(id);
    expect(inicial.codigo.length, id).toBeGreaterThan(20);
    expect(inicial.resultado, id).toBeTruthy();
    expect(inicial.explicacao.length, id).toBeGreaterThan(50);
    for (const controle of modelo.controles) {
      for (const valor of controle.tipo === 'numero' ? ['NaN', 'Infinity', '-Infinity', '-99999', '99999'] : (controle.opcoes?.map(o => o.valor) ?? [])) {
        const alterado = resultado(id, { [controle.id]: valor });
        expect(alterado.codigo, id).not.toContain('NaN');
        expect(alterado.codigo, id).not.toContain('Infinity');
        expect(alterado.resultado, id).toBeTruthy();
      }
    }
  }
  expect(calcularExpansao('aula-inexistente', {})).toBeUndefined();
  expect(calcularExpansao('__proto__', {})).toBeUndefined();
  expect(calcularExpansao('constructor', {})).toBeUndefined();
});

it('mostra o mesmo rastreamento que o programa JavaScript de decomposição produz', () => {
  expect(resultado('fundamentos-algoritmos').resultado).toBe('Depois das doações: 15\nSaldo: 11');
  expect(executarModelo('fundamentos-algoritmos')).toBe(resultado('fundamentos-algoritmos').resultado);
  expect(executarModelo('fundamentos-algoritmos', { doacoes: '0', emprestimos: '12' })).toBe('Depois das doações: 12\nSaldo: 0');
});

it('relaciona cabeçalhos de linha e coluna e mantém conteúdo livre inerte', () => {
  const ataque = '<script>alert(1)</script><img src=x onerror=alert(2)>';
  const retorno = resultado('html-tabelas', { nome: ataque, vagas: '0' });
  const documento = new DOMParser().parseFromString(retorno.documento!, 'text/html');
  expect(documento.querySelectorAll('thead th[scope="col"]')).toHaveLength(2);
  expect(documento.querySelector('tbody th[scope="row"]')?.textContent).toBe(ataque);
  expect(documento.querySelector('tbody td')?.textContent).toBe('0');
  expect(documento.querySelector('script,img')).toBeNull();
  expect(documento.querySelector('[http-equiv="Content-Security-Policy"]')?.getAttribute('content')).toContain("default-src 'none'");
  const sem = new DOMParser().parseFromString(resultado('html-tabelas', { cabecalhos: 'nao' }).documento!, 'text/html');
  expect(sem.querySelector('th')).toBeNull();
  expect(sem.querySelector('caption')?.textContent).toContain('Oficinas');
});

it('mantém a grade limitada ao espaço da prévia e normaliza contagens de colunas', () => {
  const retorno = resultado('css-grid', { colunas: '99', gap: '-10', largura: '99999' });
  expect(retorno.codigo).toContain('repeat(3, minmax(0, 1fr))');
  expect(retorno.codigo).toContain('gap: 0px');
  expect(retorno.codigo).toContain('width: 380px');
  expect(retorno.codigo).toContain('max-width: 100%');
  expect(resultado('css-grid', { colunas: '1.2' }).codigo).toContain('repeat(1,');
});

it('preserva memórias de closures independentes inclusive sem chamadas ao primeiro contador', () => {
  expect(executarModelo('js-escopo', { inicio: '3', chamadas: '4' })).toBe('A: 7\nB: 1');
  expect(executarModelo('js-escopo', { inicio: '2', chamadas: '0' })).toBe('A: 2\nB: 1');
  expect(executarModelo('js-escopo')).toBe(resultado('js-escopo').resultado);
});

it('trata espaços de formulário e insere o feedback como texto na prévia', () => {
  expect(resultado('dom-formularios', { nome: '  ' }).resultado).toContain('Informe seu nome.');
  expect(resultado('dom-formularios', { nome: '  Bia  ' }).resultado).toContain('Nome conferido: Bia');
  const retorno = resultado('dom-formularios', { nome: '<img src=x onerror=alert(1)>' });
  const documento = new DOMParser().parseFromString(retorno.documento!, 'text/html');
  expect(documento.querySelector('img')).toBeNull();
  expect(documento.querySelector('output')?.textContent).toContain('<img');
  expect(retorno.codigo).toContain('new FormData(formulario)');
  expect(retorno.codigo).not.toContain('fetch(');
});

it('declara o rastreamento Python e o limite da persistência do arquivo virtual', () => {
  const retorno = resultado('python-arquivos', { nome: 'Ação "criativa"', vagas: '0' });
  expect(retorno.codigo).toContain('encoding="utf-8"');
  expect(retorno.codigo).toContain('ensure_ascii=False');
  expect(retorno.codigo).toContain('json.load(arquivo)');
  expect(retorno.resultado).toContain('Ação');
  expect(retorno.explicacao).toContain('não uma execução Python');
  expect(retorno.explicacao).toContain('não garante persistência');
});

it('deriva disponibilidade do mesmo estado e mantém zero como quantidade válida', () => {
  expect(resultado('frontend-estado', { quantidade: '0' }).resultado).toBe('0 selecionadas · 5 disponíveis');
  expect(resultado('frontend-estado', { quantidade: '5' }).resultado).toBe('5 selecionadas · 0 disponíveis');
  expect(resultado('frontend-estado', { quantidade: '-2' }).codigo).toContain('let selecionadas = 0');
});

it('valida sem coerção silenciosa e identifica a Response como modelo local', () => {
  expect(resultado('api-validacao', { entrada: 'zero' }).resultado).toBe('Status local: 201\n{"nome":"Leitura","vagas":0}');
  for (const entrada of ['negativa', 'texto']) expect(resultado('api-validacao', { entrada }).resultado).toBe('Status local: 422\n{"erro":"vagas inválidas"}');
  expect(resultado('api-validacao', { entrada: 'nome' }).resultado).toBe('Status local: 422\n{"erro":"nome inválido"}');
  expect(resultado('api-validacao').explicacao).toContain('Response local');
});

it('distingue falta de sessão, revogação, limite de expiração e falta de permissão', () => {
  for (const sessao of ['ausente', 'expirada', 'revogada']) {
    expect(executarModelo('fullstack-sessao', { sessao, rota: 'perfil' })).toBe('401');
    expect(resultado('fullstack-sessao', { sessao }).resultado).toContain('401');
  }
  expect(executarModelo('fullstack-sessao', { sessao: 'aluno', rota: 'admin' })).toBe('403');
  expect(executarModelo('fullstack-sessao', { sessao: 'aluno', rota: 'perfil' })).toBe('200');
  expect(executarModelo('fullstack-sessao', { sessao: 'admin', rota: 'admin' })).toBe('200');
  expect(resultado('fullstack-sessao').explicacao).toContain('servidor');
});

it('calcula com vírgula e números negativos, rejeitando vazio e não finitos antes da conta', () => {
  expect(executarModelo('projeto-calculadora')).toBe('14.5');
  expect(resultado('projeto-calculadora', { primeiro: ' 12,5 ', segundo: '2', operacao: 'subtrair' }).resultado).toBe('10.5');
  expect(executarModelo('projeto-calculadora', { primeiro: '-2', segundo: '3' })).toBe('1');
  for (const primeiro of ['', '   ', 'abc', 'Infinity', '1e1000', '1000001']) {
    expect(resultado('projeto-calculadora', { primeiro }).resultado).toBe('Revise o primeiro valor.');
    expect(executarModelo('projeto-calculadora', { primeiro })).toBe('Revise o primeiro valor.');
  }
  expect(resultado('projeto-calculadora', { primeiro: '0', segundo: '0' }).resultado).toBe('0');
  expect(resultado('projeto-calculadora', { segundo: '' }).resultado).toBe('Revise o segundo valor.');
});

it('mantém todos os programas JS válidos em script para cada opção, inclusive texto hostil', () => {
  const javascript = ['fundamentos-algoritmos', 'js-escopo', 'dom-formularios', 'frontend-estado', 'api-validacao', 'fullstack-sessao', 'projeto-calculadora'];
  for (const id of javascript) {
    const modelo = modelosExpansao[id];
    const variacoes = [{}, ...modelo.controles.flatMap(c => (c.opcoes?.map(o => ({ [c.id]: o.valor })) ?? [{ [c.id]: '\"</script>\\n${alert(1)}' }]))];
    for (const valores of variacoes) expect(() => parse(resultado(id, valores).codigo, { ecmaVersion: 2022, sourceType: 'script' }), id).not.toThrow();
  }
});
