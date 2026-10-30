import type { EstadoLocal } from '../offline/armazenamento';

/** A evolução depende de resultados registrados, nunca do XP recebido de fora. */
export const niveis = [
  { minimo: 0, nome: 'Faísca', cor: '#57b6cb', frase: 'Toda criação começa com uma descoberta.' },
  { minimo: 100, nome: 'Explorador', cor: '#65c8b4', frase: 'Você deu vida à sua primeira ideia.' },
  { minimo: 280, nome: 'Construtor', cor: '#72aaf9', frase: 'Conceitos começam a virar construções.' },
  { minimo: 600, nome: 'Inventor', cor: '#a996f4', frase: 'Você combina ideias e resolve desafios.' },
  { minimo: 1000, nome: 'Arquiteto', cor: '#dc93d6', frase: 'Seu repertório ganha novas camadas.' },
  { minimo: 1400, nome: 'Especialista', cor: '#efaf68', frase: 'Cada detalhe faz parte da sua evolução.' },
  { minimo: 1750, nome: 'Visionário', cor: '#f1ce79', frase: 'Sua jornada já inspira novas possibilidades.' },
  { minimo: 2000, nome: 'Luminar', cor: '#a9e5ed', frase: 'Conhecimento para construir o que vem depois.' },
] as const;

export function experiencia(estado: Pick<EstadoLocal, 'aulasConcluidas' | 'respostas'>) {
  return new Set(estado.aulasConcluidas).size * 100 + Object.values(estado.respostas).filter(v => v === true).length * 10;
}

export function evolucao(estado: Pick<EstadoLocal, 'aulasConcluidas' | 'respostas'>) {
  const xp = experiencia(estado);
  const indice = niveis.reduce((atual, nivel, i) => xp >= nivel.minimo ? i : atual, 0);
  const atual = niveis[indice];
  const proximo = niveis[indice + 1];
  return { xp, indice, numero: indice + 1, atual, proximo,
    percentual: proximo ? Math.min(100, Math.floor((xp - atual.minimo) / (proximo.minimo - atual.minimo) * 100)) : 100,
    faltam: proximo ? proximo.minimo - xp : 0,
  };
}

export function conquistas(estado: Pick<EstadoLocal, 'aulasConcluidas' | 'respostas'>) {
  const aulas = new Set(estado.aulasConcluidas).size;
  const corretas = Object.values(estado.respostas).filter(v => v === true).length;
  return [
    { id: 'primeira-conexao', nome: 'Primeira conexão', descricao: 'Acertar uma questão após enviar a avaliação.', obtido: corretas >= 1, atual: Math.min(corretas, 1), meta: 1, desenho: 'conexao', grau: 0 },
    { id: 'primeira-criacao', nome: 'Primeira criação', descricao: 'Registrar a competência de uma aula.', obtido: aulas >= 1, atual: Math.min(aulas, 1), meta: 1, desenho: 'codigo', grau: 1 },
    { id: 'base-solida', nome: 'Base sólida', descricao: 'Registrar competências em três aulas diferentes.', obtido: aulas >= 3, atual: Math.min(aulas, 3), meta: 3, desenho: 'blocos', grau: 2 },
    { id: 'engenho', nome: 'Engenho criativo', descricao: 'Registrar competências em cinco aulas diferentes.', obtido: aulas >= 5, atual: Math.min(aulas, 5), meta: 5, desenho: 'nucleo', grau: 3 },
    { id: 'constelacao', nome: 'Constelação', descricao: 'Registrar competências em dez aulas diferentes.', obtido: aulas >= 10, atual: Math.min(aulas, 10), meta: 10, desenho: 'estrela', grau: 5 },
    { id: 'universo', nome: 'Universo em expansão', descricao: 'Registrar competências em vinte aulas diferentes.', obtido: aulas >= 20, atual: Math.min(aulas, 20), meta: 20, desenho: 'estrela', grau: 7 },
  ];
}

export function iconeDisponivel(icone: unknown, indiceNivel: number): number {
  return Number.isInteger(icone) && Number(icone) >= 0 && Number(icone) <= indiceNivel && Number(icone) < niveis.length ? Number(icone) : 0;
}
