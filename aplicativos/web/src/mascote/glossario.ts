/** Explicações editoriais locais: nenhuma seleção é enviada a um serviço externo. */
export interface ExplicacaoTermo { termo: string; mensagem: string; conhecida: boolean }
type Entrada = { nomes: string[]; explicacao: string };
const entradas: Entrada[] = [
  { nomes: ['html'], explicacao: 'HTML organiza o conteúdo de uma página. Pense nele como a estrutura de uma casa: h1 marca um título e p marca um parágrafo. O visual fica por conta do CSS.' },
  { nomes: ['css'], explicacao: 'CSS define a aparência do conteúdo: cores, espaços e tamanhos. Por exemplo, p { color: blue; } pede que os parágrafos sejam azuis. O seletor escolhe quem recebe o estilo.' },
  { nomes: ['javascript', 'js'], explicacao: 'JavaScript acrescenta comportamento à página. Ele pode escutar um clique, calcular um valor e atualizar um texto. HTML estrutura, CSS apresenta e JavaScript faz a interação acontecer.' },
  { nomes: ['python'], explicacao: 'Python é uma linguagem de programação usada em automações, dados e aplicações. A indentação organiza blocos: o espaço no início da linha faz parte da estrutura do código.' },
  { nomes: ['tag', 'tags'], explicacao: 'Uma tag marca uma parte do conteúdo em HTML. Em <p>Olá</p>, <p> abre o parágrafo e </p> fecha. Algumas tags, como img, não precisam de fechamento.' },
  { nomes: ['elemento', 'elementos'], explicacao: 'Em HTML, um elemento reúne a marcação e seu conteúdo. Em <p>Olá</p>, o elemento é o parágrafo inteiro. Ele pode receber atributos e conter outros elementos.' },
  { nomes: ['atributo', 'atributos'], explicacao: 'Um atributo acrescenta informação a um elemento HTML. Em <a href="/inicio">Início</a>, href informa o endereço do link. Ele fica na tag de abertura.' },
  { nomes: ['seletor', 'seletores'], explicacao: 'Um seletor CSS escolhe quais elementos recebem uma regra. p seleciona parágrafos; .aviso seleciona elementos com a classe aviso. Depois vem o estilo entre chaves.' },
  { nomes: ['classe', 'classes'], explicacao: 'No CSS, uma classe permite agrupar elementos para aplicar um estilo. Um elemento com class="aviso" pode ser selecionado por .aviso. Em outras linguagens, classe pode ter outro significado.' },
  { nomes: ['variavel', 'variaveis', 'variable'], explicacao: 'Uma variável associa um nome a um valor usado pelo programa. Em let pontos = 10, o nome pontos permite consultar esse valor depois. A forma de declarar depende da linguagem.' },
  { nomes: ['constante', 'const', 'constantes'], explicacao: 'Em JavaScript, const cria uma associação que não pode ser reatribuída. Por exemplo, const total = 10 não permite depois total = 20. Objetos declarados com const ainda podem ter seu conteúdo alterado.' },
  { nomes: ['funcao', 'funcoes', 'function'], explicacao: 'Uma função reúne instruções para realizar uma tarefa. Ela pode receber entradas, chamadas parâmetros, e devolver um resultado. Definir a função prepara a tarefa; chamá-la faz a tarefa acontecer.' },
  { nomes: ['parametro', 'parametros'], explicacao: 'Um parâmetro é o nome de uma entrada esperada por uma função. Em function dobro(numero), numero é o parâmetro. Na chamada dobro(3), 3 é o argumento fornecido.' },
  { nomes: ['array', 'arrays', 'lista', 'listas'], explicacao: 'Uma lista guarda vários valores em ordem. Em JavaScript, um array como ["HTML", "CSS"] tem dois itens, acessados pelos índices 0 e 1. O primeiro índice é zero.' },
  { nomes: ['objeto', 'objetos'], explicacao: 'Em JavaScript, um objeto reúne propriedades com nome e valor. Em { nome: "Lia", pontos: 10 }, nome e pontos são as chaves. Você pode consultar, por exemplo, pessoa.pontos.' },
  { nomes: ['dom'], explicacao: 'DOM é a representação da página em objetos que o JavaScript consegue consultar e alterar. Por exemplo, document.querySelector("h1") encontra o primeiro título h1.' },
  { nomes: ['evento', 'eventos'], explicacao: 'Um evento avisa que algo aconteceu, como um clique ou uma tecla pressionada. Um ouvinte pode reagir a ele: addEventListener("click", acao) executa acao quando ocorre o clique.' },
  { nomes: ['condicao', 'condicional', 'if', 'condicionais'], explicacao: 'Uma condição ajuda o programa a escolher um caminho. Em if (pontos > 10), o bloco só roda quando a comparação é verdadeira. else pode definir o outro caminho.' },
  { nomes: ['loop', 'laco', 'lacos', 'for', 'while'], explicacao: 'Um laço repete instruções. Um for pode percorrer uma lista; um while repete enquanto uma condição for verdadeira. A condição de parada evita repetir sem fim.' },
  { nomes: ['booleano', 'boolean', 'booleanos'], explicacao: 'Um valor booleano representa verdadeiro ou falso. Ele costuma aparecer em condições. Em JavaScript, true e false são valores booleanos; a string "false" continua sendo um texto.' },
  { nomes: ['string', 'strings', 'texto'], explicacao: 'Uma string é um valor de texto. Em JavaScript, "10" é texto e 10 é número: eles podem se comportar de modos diferentes em cálculos. As aspas indicam o texto.' },
  { nomes: ['api', 'apis'], explicacao: 'Uma API define como um programa pode pedir dados ou ações a outro componente. Em uma API HTTP, uma requisição usa um endereço e um método, e recebe uma resposta.' },
  { nomes: ['json'], explicacao: 'JSON é um formato de texto para trocar dados. Ele usa pares de chave e valor, listas, números, textos e outros valores permitidos. As chaves e strings precisam de aspas duplas.' },
  { nomes: ['http', 'https'], explicacao: 'HTTP é um protocolo de troca de mensagens na web. O cliente envia uma requisição e o servidor responde. HTTPS usa uma conexão criptografada para proteger os dados em trânsito.' },
  { nomes: ['git'], explicacao: 'Git registra versões de arquivos de um projeto. Um commit guarda um conjunto de mudanças, e uma branch permite desenvolver uma linha de trabalho separada.' },
  { nomes: ['commit', 'commits'], explicacao: 'Um commit é um registro de mudanças no histórico do Git. Sua mensagem explica o que mudou. Ele ajuda a comparar versões e entender a evolução do projeto.' },
  { nomes: ['sql'], explicacao: 'SQL é uma linguagem para consultar e modificar dados em bancos relacionais. SELECT consulta dados; WHERE filtra quais registros entram no resultado.' },
  { nomes: ['banco de dados', 'banco', 'dados'], explicacao: 'Um banco de dados organiza informações para consultar e atualizar depois. Em um banco relacional, tabelas guardam registros e podem se relacionar por chaves.' },
  { nomes: ['flexbox', 'flex'], explicacao: 'Flexbox organiza elementos em uma direção principal, linha ou coluna. display: flex ativa esse modelo; gap cria espaço entre itens e align-items controla o alinhamento no eixo transversal.' },
  { nomes: ['grid'], explicacao: 'CSS Grid organiza elementos em linhas e colunas. display: grid ativa o modelo; grid-template-columns define as colunas. É útil para compor layouts em duas dimensões.' },
  { nomes: ['responsivo', 'responsividade'], explicacao: 'Um layout responsivo se adapta ao espaço disponível. Larguras flexíveis, media queries e imagens ajustáveis ajudam a manter o conteúdo utilizável no celular e no computador.' },
  { nomes: ['acessibilidade'], explicacao: 'Acessibilidade permite que pessoas com diferentes necessidades usem a interface. Bons rótulos, contraste, teclado e estrutura semântica ajudam. Uma animação também precisa respeitar quem prefere menos movimento.' },
  { nomes: ['algoritmo', 'algoritmos'], explicacao: 'Um algoritmo é uma sequência de passos para resolver uma tarefa. Antes de programar, descreva as entradas, os passos e o resultado esperado. Depois confira se os passos funcionam com exemplos.' },
  { nomes: ['depuracao', 'debug', 'bug', 'erro'], explicacao: 'Depurar é investigar o que o programa fez e por que o resultado foi diferente do esperado. Leia a mensagem, reproduza o caso e mude uma parte de cada vez. Erro é pista, não falta de capacidade.' },
];
export function normalizarTermo(texto: string) {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/^[\s`'"“”‘’<({\[]+|[\s`'"“”‘’>)}\],.;:!?]+$/g, '').replace(/\s+/g, ' ').trim();
}
export function termoValido(texto: string) {
  const termo = texto.trim().replace(/\s+/g, ' ');
  return termo.length >= 2 && termo.length <= 80 && termo.split(' ').length <= 8 && !/[\u0000-\u001f]/.test(termo);
}
export function explicarTermo(texto: string, contexto?: string): ExplicacaoTermo | null {
  const termo = texto.trim().replace(/\s+/g, ' ');
  if (!termoValido(termo)) return null;
  const entrada = entradas.find(item => item.nomes.includes(normalizarTermo(termo)));
  if (entrada) return { termo, mensagem: entrada.explicacao, conhecida: true };
  const trecho = contexto?.trim().replace(/\s+/g, ' ').slice(0, 240);
  return { termo, conhecida: false, mensagem: `“${termo}” ainda não tem uma definição no meu glossário local.${trecho ? ` Na aula, aparece neste trecho: “${trecho}${contexto!.trim().length > 240 ? '…' : ''}”.` : ' Tente um termo como HTML, variável, função ou API.'} Posso ajudar você a explorar os termos que já conheço.` };
}
