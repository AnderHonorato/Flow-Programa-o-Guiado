/** Contrato público do currículo v1. Conteúdo em produção não contém aulas publicadas. */
export type Linguagem = 'html' | 'css' | 'javascript' | 'dom' | 'python' | 'api';
export interface ArquivosCodigo { html: string; css: string; js: string; python?: string }
export interface Alternativa { texto: string; correta: boolean; feedback: string }
export interface Questao { id: string; enunciado: string; alternativas: Alternativa[] }
export interface Exemplo { titulo: string; codigo: string; explicacao: string[] }
export interface TesteAula {
  id: string; descricao: string;
  tipo: 'elemento' | 'texto' | 'atributo' | 'estilo' | 'evento' | 'javascript' | 'python';
  seletor?: string; esperado?: string; propriedade?: string;
}
export interface Aula {
  id: string; titulo: string; objetivo: string; preRequisitos: string[];
  blocos: string[]; exemplos: Exemplo[]; questoes: Questao[];
  desafio: string; variacao: string; resumo: string; pontosDificeis: string[];
  pistas: string[]; arquivos: ArquivosCodigo; competencia: string;
  linguagem: Linguagem; rubrica: string[]; testes?: TesteAula[];
}
export interface Modulo {
  id: string; titulo: string; estado: 'publicado' | 'em_producao'; aulas: Aula[];
  planejamento?: {objetivos: string[]; aulasPrevistas: number; exerciciosPrevistos: number};
}
export interface Trilha {
  id: string; titulo: string; descricao: string; cor: string;
  preRequisitos: string[]; modulos: Modulo[];
}
export interface Catalogo { versao: 1; trilhas: Trilha[] }
