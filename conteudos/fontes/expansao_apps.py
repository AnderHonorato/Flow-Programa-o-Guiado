"""Aulas autorais de estado, contratos de sessão e calculadora, sem dependências.

As soluções abaixo pertencem ao verificador editorial: não entram no catálogo
distribuído aos estudantes nem no bundle do aplicativo.
"""

HTML_ESTADO = '''<h1>Reserva de lugares</h1>
<p>Escolha de zero a cinco lugares para sua visita.</p>
<button id="adicionar" type="button">Adicionar lugar</button>
<button id="remover" type="button">Remover lugar</button>
<p id="resumo" role="status" aria-live="polite">Nenhum lugar selecionado.</p>
<div id="cartao"></div>'''

JS_ESTADO = '''let lugares = 0;
const resumo = document.querySelector("#resumo");
const cartao = document.querySelector("#cartao");
function renderizar() {
  resumo.textContent = `${lugares} lugares selecionados`;
  const artigo = document.createElement("article");
  const titulo = document.createElement("h2");
  titulo.textContent = "Sua seleção";
  const descricao = document.createElement("p");
  descricao.textContent = `${lugares} de 5 lugares`;
  artigo.append(titulo, descricao);
  cartao.replaceChildren(artigo);
}
function alterarLugares(delta) {
  lugares = Math.max(0, Math.min(5, lugares + delta));
  renderizar();
}
document.querySelector("#adicionar").addEventListener("click", () => alterarLugares(1));
document.querySelector("#remover").addEventListener("click", () => alterarLugares(-1));
renderizar();'''

JS_SESSAO = '''function avaliarAcesso(autorizacao, sessao, agora, requerAdmin = false) {
  if (!sessao || autorizacao !== `Bearer ${sessao.id}` || sessao.revogada || sessao.expiraEm <= agora) {
    return new Response("Sessão ausente ou inválida", { status: 401 });
  }
  if (requerAdmin && sessao.papel !== "admin") {
    return new Response("Permissão insuficiente", { status: 403 });
  }
  return new Response("Acesso permitido no simulador", { status: 200 });
}
const ficha = { id: "ficha-local", expiraEm: 100, revogada: false, papel: "aluno" };
console.log({
  ausente: avaliarAcesso("", ficha, 50).status,
  expirada: avaliarAcesso("Bearer ficha-local", ficha, 100).status,
  revogada: avaliarAcesso("Bearer ficha-local", { ...ficha, revogada: true }, 50).status,
  aluno: avaliarAcesso("Bearer ficha-local", ficha, 50).status,
  proibido: avaliarAcesso("Bearer ficha-local", ficha, 50, true).status,
  admin: avaliarAcesso("Bearer ficha-local", { ...ficha, papel: "admin" }, 50, true).status
});'''

HTML_CALCULADORA = '''<h1>Calculadora da oficina</h1>
<p id="instrucoes">Informe dois números. Use vírgula ou ponto para decimais.</p>
<p><label for="primeiro">Primeiro número</label>
<input id="primeiro" inputmode="decimal" value="12,5" aria-describedby="instrucoes"></p>
<p><label for="segundo">Segundo número</label>
<input id="segundo" inputmode="decimal" value="2,5" aria-describedby="instrucoes"></p>
<button id="somar" type="button">Somar</button>
<button id="subtrair" type="button">Subtrair</button>
<p id="resultado" role="status" aria-live="polite">Escolha uma operação.</p>'''

JS_CALCULADORA = '''function calcular(primeiro, segundo, operacao) {
  const entradas = [primeiro, segundo];
  const numeros = [];
  for (let indice = 0; indice < entradas.length; indice += 1) {
    const texto = entradas[indice].trim();
    if (texto === "") return { ok: false, erro: "Preencha os dois números.", campo: indice };
    const numero = Number(texto.replace(",", "."));
    if (!Number.isFinite(numero)) return { ok: false, erro: "Informe apenas números finitos.", campo: indice };
    numeros.push(numero);
  }
  if (operacao !== "somar" && operacao !== "subtrair") {
    return { ok: false, erro: "Escolha uma operação disponível.", campo: 0 };
  }
  const valor = operacao === "somar" ? numeros[0] + numeros[1] : numeros[0] - numeros[1];
  if (!Number.isFinite(valor)) return { ok: false, erro: "O resultado excede o limite numérico.", campo: 0 };
  return { ok: true, valor };
}
const campos = [document.querySelector("#primeiro"), document.querySelector("#segundo")];
const saida = document.querySelector("#resultado");
function mostrar(operacao) {
  const resposta = calcular(campos[0].value, campos[1].value, operacao);
  saida.textContent = resposta.ok ? `Resultado: ${resposta.valor}` : resposta.erro;
  campos.forEach(campo => campo.removeAttribute("aria-invalid"));
  if (!resposta.ok) {
    campos[resposta.campo].setAttribute("aria-invalid", "true");
    campos[resposta.campo].focus();
  }
}
document.querySelector("#somar").addEventListener("click", () => mostrar("somar"));
document.querySelector("#subtrair").addEventListener("click", () => mostrar("subtrair"));
console.log({
  soma: calcular("12,5", "2,5", "somar"),
  subtracao: calcular("12,5", "2,5", "subtrair"),
  vazio: calcular(" ", "2", "somar"),
  invalido: calcular("livros", "2", "somar")
});'''


def registrar(aula, exemplo):
    """Publica três aulas no gerador recebido e devolve seus testes objetivos."""
    aula('frontend', 2, 'frontend-estado', 'Estado: uma fonte para toda a tela',
         'Separar o número de lugares selecionados da apresentação e atualizar duas regiões da interface a partir do mesmo estado.',
         'dom', ['frontend-componentes', 'dom-eventos'], [
             'Uma família escolhe quantos lugares deseja numa visita à biblioteca. O total aparece num resumo e num cartão. Se cada região guardar sua própria contagem, uma delas pode esquecer uma atualização. O estado é o dado que descreve a seleção atual; a interface é uma representação desse dado. Nesta aula usamos JavaScript e DOM, sem depender de uma biblioteca de componentes.',
             'Declare lugares com let porque a seleção pode mudar. A função renderizar lê esse valor e atualiza todas as regiões necessárias, sem incrementá-lo. Ler um texto como “2 lugares” para descobrir o estado mistura apresentação e regra; amanhã a frase pode mudar. Guarde o número no programa e converta-o em texto somente ao apresentar o resultado.',
             'Uma ação segue uma ordem: receber a intenção, calcular o próximo estado, então renderizar. Math.min(5, quantidade) limita o teto e Math.max(0, quantidade) limita o piso. Juntos, eles mantêm a seleção entre zero e cinco. Não precisamos desativar a compreensão de teclado para aplicar essa regra: botões nativos acionam o mesmo evento por clique, Enter ou espaço.',
             'Renderizar novamente não deve duplicar cartões nem registrar mais ouvintes de evento. Use replaceChildren para substituir o conteúdo anterior do contêiner. Registre addEventListener uma vez, fora da renderização. Assim, chamar renderizar duas vezes com os mesmos dados produz a mesma apresentação, e um clique continua representando exatamente uma ação.',
             'Antes de implementar, trace no papel: zero, adicionar, um, remover, zero. Teste também remover em zero e adicionar em cinco. O resumo e o cartão devem concordar em todas as etapas. Esta prática modifica apenas a seleção local; nenhuma reserva é enviada a um servidor e nenhum lugar real é ocupado. Persistência e confirmação remota exigiriam outros contratos.'
         ], [
             exemplo('Atualizar dados antes de apresentar', [
                 ('{', 'Abre um bloco independente para os nomes deste exemplo.'),
                 ('  let quantidade = 0;', 'Guarda a seleção como número, fora do texto da interface.'),
                 ('  function proximoValor(atual, delta) {', 'Recebe estado e intenção sem ler nenhuma região da página.'),
                 ('    return Math.max(0, Math.min(5, atual + delta));', 'Restringe o próximo valor ao intervalo de zero a cinco.'),
                 ('  }', 'Encerra a função de transição de estado sem alterar o DOM.'),
                 ('  quantidade = proximoValor(quantidade, 1);', 'Aplica uma única intenção de adicionar à seleção anterior.'),
                 ('  console.log(`${quantidade} lugares selecionados`);', 'Converte o novo estado em uma mensagem de apresentação.'),
                 ('}', 'Fecha o bloco para não compartilhar nomes com outro exemplo.')
             ]),
             exemplo('Substituir o cartão sem acumular cópias', [
                 ('{', 'Isola as declarações locais desta demonstração de renderização.'),
                 ('  const area = document.createElement("div");', 'Cria um contêiner de demonstração sem depender do HTML inicial.'),
                 ('  function desenhar(total) {', 'Define uma apresentação que recebe um valor já calculado.'),
                 ('    const artigo = document.createElement("article");', 'Cria a estrutura de um novo cartão para a seleção atual.'),
                 ('    artigo.textContent = `${total} de 5 lugares`;', 'Apresenta o dado como texto sem interpretar marcação recebida.'),
                 ('    area.replaceChildren(artigo);', 'Troca os filhos existentes em vez de acrescentar outra cópia.'),
                 ('  }', 'Conclui a montagem do cartão sem alterar o total selecionado.'),
                 ('  desenhar(2);', 'Realiza a primeira apresentação da seleção com dois lugares.'),
                 ('  desenhar(2);', 'Repete a mesma apresentação para verificar sua estabilidade.'),
                 ('  console.log(area.children.length);', 'Confirma que continua existindo um cartão, e não dois.'),
                 ('}', 'Fecha o bloco mantendo a demonstração independente das demais.')
             ])
         ], [
             ('O resumo mostra 2 e o cartão mostra 1 após um clique. Qual organização ajuda a evitar essa divergência?', [
                 ('Guardar um total numérico e renderizar as duas regiões a partir dele.', True, 'Uma fonte de estado permite atualizar todas as apresentações com o mesmo valor depois de cada ação.'),
                 ('Incrementar separadamente o texto de cada região sempre que possível.', False, 'Duas contagens independentes podem se separar quando uma ação atualiza apenas uma das regiões.'),
                 ('Registrar novamente todos os cliques sempre que renderizar.', False, 'Ouvintes repetidos acumulam ações: um único clique pode executar o mesmo incremento várias vezes.')
             ]),
             ('Qual deve ser o efeito de renderizar duas vezes com o estado 3?', [
                 ('Apresentar 3 nas duas vezes, mantendo somente um cartão.', True, 'Renderização apresenta o estado atual; não deve criar uma nova seleção nem duplicar os filhos do contêiner.'),
                 ('Aumentar automaticamente o estado para 5.', False, 'Atualizar o estado pertence à ação de selecionar. Renderizar não deve alterar a quantidade escolhida.'),
                 ('Criar dois cartões para registrar o histórico de chamadas.', False, 'O cartão representa a seleção atual, não um histórico. replaceChildren permite substituir a apresentação.')
             ])
         ],
         'No JS, guarde lugares começando em zero. Implemente renderizar para atualizar #resumo com “N lugares selecionados” e produzir um único article dentro de #cartao, contendo h2 “Sua seleção” e p “N de 5 lugares”. Ligue #adicionar e #remover a mudanças limitadas entre 0 e 5 e renderize inicialmente. Teste os dois limites e confira que o cartão nunca se duplica.',
         'Adicione um botão “Limpar seleção” que define lugares como zero e chama a mesma renderização. Selecione três lugares, limpe e explique por que o botão não precisa escrever diretamente em cada região.',
         'Uma ação atualiza o estado; a renderização apresenta esse estado em todas as regiões sem duplicar dados, elementos ou ouvintes.',
         ['Manter a regra de seleção fora do texto apresentado.', 'Registrar eventos uma vez e substituir, em vez de acumular, os cartões.'],
         ['Desenhe a sequência estado anterior → ação → novo estado → renderizar.', 'Use Math.max e Math.min para limitar o número antes de apresentá-lo.', 'Monte o article e substitua os filhos de #cartao com replaceChildren.'],
         {'html': HTML_ESTADO, 'css': 'button { margin: 4px; padding: 10px; } article { border: 1px solid #8f2d4a; padding: 16px; }', 'js': 'let lugares = 0;\n// Implemente a transição, a renderização e os eventos.\n'},
         'frontend-estado-renderizacao-unica',
         ['Resumo e cartão derivam do mesmo estado numérico.', 'Adicionar e remover respeitam os limites de zero e cinco.', 'Renderizações repetidas mantêm um único cartão e um ouvinte por ação.', 'Uso por teclado e mensagem de atualização permanecem disponíveis.'])

    aula('fullstack', 2, 'fullstack-sessao', 'Sessão e permissão são decisões diferentes',
         'Distinguir identidade validada de permissão numa simulação local de sessão, expiração e respostas HTTP 401 e 403.',
         'api', ['fullstack-contratos', 'api-http'], [
             'O catálogo de oficinas possui uma área do aluno e outra de administração. Reconhecer quem fez uma requisição não significa permitir todas as ações. Autenticação verifica a identidade; autorização verifica o que essa identidade pode fazer. Vamos modelar essas decisões com funções e objetos locais, sem criar um serviço de login e sem enviar credenciais pela internet.',
             'Numa sessão real, o servidor confere uma credencial recebida, procura o registro correspondente e verifica se ainda está válido. Um cabeçalho Authorization pode usar o formato Bearer seguido de uma credencial. Nesta demonstração, “ficha-local” é somente uma etiqueta pública e fictícia. Não copie esta comparação simples para proteger um produto: o aplicativo real exige credenciais imprevisíveis e validação no servidor.',
             'A sessão do simulador contém identificador, papel, instante de expiração e indicação de revogação. O parâmetro agora é recebido explicitamente, tornando possível testar o tempo sem esperar. Se expiraEm for menor ou igual a agora, a sessão acabou. Uma sessão revogada também é recusada, mesmo antes do prazo. Fechar uma tela não revoga uma sessão no servidor.',
             'Use 401 quando não houver uma sessão válida: cabeçalho ausente, etiqueta incorreta, expiração ou revogação. Use 403 quando a sessão estiver válida, mas o papel não permitir a ação. Um aluno identificado pode receber 200 numa rota comum e 403 numa rota administrativa. Esconder um botão não substitui essa autorização em cada requisição do servidor real.',
             'Crie objetos Response para observar os status no console. Isso constrói respostas locais; nenhum servidor, senha, cookie ou conta é criado. Teste o instante imediatamente anterior à expiração e o instante exato do vencimento. No produto real, logout e banimento precisam invalidar registros no servidor; reativar uma conta não deve ressuscitar uma credencial já revogada. Aqui verificamos apenas a lógica do modelo.'
         ], [
             exemplo('Expiração testável sem esperar', [
                 ('{', 'Isola as constantes desta demonstração de tempo de sessão.'),
                 ('  const sessao = { expiraEm: 100, revogada: false };', 'Representa o prazo e a revogação por dados fictícios locais.'),
                 ('  function estaValida(ficha, agora) {', 'Recebe o relógio explicitamente para testar a fronteira temporal.'),
                 ('    return !ficha.revogada && ficha.expiraEm > agora;', 'Exige ausência de revogação e prazo estritamente no futuro.'),
                 ('  }', 'Encerra a regra de validade sem realizar uma requisição real.'),
                 ('  console.log(estaValida(sessao, 99));', 'Mostra true no último instante anterior ao vencimento definido.'),
                 ('  console.log(estaValida(sessao, 100));', 'Mostra false exatamente no prazo, sem aguardar um temporizador.'),
                 ('}', 'Fecha o bloco mantendo seus dados fora das outras demonstrações.')
             ]),
             exemplo('Identidade aceita, ação recusada', [
                 ('{', 'Abre um bloco para o exemplo de autorização administrativa.'),
                 ('  const papel = "aluno";', 'Representa o papel de uma identidade já reconhecida no modelo.'),
                 ('  const exigeAdmin = true;', 'Descreve uma ação que precisa de permissão administrativa.'),
                 ('  const status = exigeAdmin && papel !== "admin" ? 403 : 200;', 'Diferencia permissão insuficiente de uma consulta permitida.'),
                 ('  const resposta = new Response("Resposta local", { status });', 'Constrói uma resposta em memória sem publicar uma API real.'),
                 ('  console.log(resposta.status);', 'Mostra 403 porque a identidade existe e não possui esse papel.'),
                 ('}', 'Conclui o exemplo sem armazenar uma credencial de verdade.')
             ])
         ], [
             ('Uma sessão válida de aluno tenta uma ação exclusiva de administrador. Qual status expressa a decisão?', [
                 ('403, porque a identidade foi aceita e a permissão é insuficiente.', True, 'A falha é de autorização. A pessoa possui sessão válida, mas não pode realizar essa ação administrativa.'),
                 ('401, porque qualquer ação proibida indica que ninguém entrou.', False, '401 representa ausência de autenticação válida. O caso já confirmou a identidade e falhou na permissão.'),
                 ('200, desde que o botão administrativo esteja escondido.', False, 'Ocultar a interface não protege a API. A requisição deve ser recusada pela autorização do servidor.')
             ]),
             ('O prazo expiraEm vale 100 e agora também vale 100. O que o modelo deve fazer?', [
                 ('Recusar a sessão com 401 porque o prazo já foi atingido.', True, 'A validade exige expiraEm maior que agora. A igualdade pertence ao caminho expirado, que deve ser testado.'),
                 ('Aceitar para sempre, pois o identificador ainda é o mesmo.', False, 'Reconhecer o identificador não elimina a verificação do prazo nem a possibilidade de revogação.'),
                 ('Trocar o papel para administrador antes de verificar o prazo.', False, 'Permissões não renovam sessão nem surgem durante a verificação. Uma sessão expirada precisa ser recusada.')
             ])
         ],
         'Implemente avaliarAcesso(autorizacao, sessao, agora, requerAdmin = false), devolvendo Response local. Recuse com 401 sessão ausente, cabeçalho diferente de `Bearer ${sessao.id}`, revogação ou expiraEm <= agora. Com sessão válida, devolva 403 quando requerAdmin for true e papel não for admin; nos demais casos, 200. Use a ficha inicial e imprima um objeto com status nas chaves ausente, expirada, revogada, aluno, proibido e admin. Não envie nenhuma requisição real.',
         'Acrescente um caso com etiqueta incorreta e outro com agora 99. Compare-os ao caso agora 100. Explique por que renovar o prazo não deveria revalidar uma sessão cujo campo revogada continua true.',
         'Uma sessão válida identifica a pessoa; a autorização decide a ação. Expiração e revogação são verificadas antes da permissão.',
         ['Distinguir 401 de 403 sem usar a visibilidade do botão como segurança.', 'Tratar o instante de expiração como inválido e manter a revogação independente do prazo.'],
         ['Verifique a existência de sessao antes de ler suas propriedades.', 'Agrupe as causas de autenticação inválida antes da regra de papel.', 'Crie Response com status explícito e imprima somente os códigos do modelo, nunca credenciais reais.'],
         {'html': '<h1>Contrato local de sessão</h1><p>Simulador didático: nenhum login real ou envio de credenciais. Veja os status no console.</p>',
          'js': 'function avaliarAcesso(autorizacao, sessao, agora, requerAdmin = false) {\n  // Confira identidade, validade e, depois, permissão.\n}\nconst ficha = { id: "ficha-local", expiraEm: 100, revogada: false, papel: "aluno" };\n// Imprima o objeto de resultados solicitado depois de implementar a função.\n'},
         'fullstack-sessao-validade-autorizacao',
         ['Sessão ausente, errada, expirada ou revogada produz 401.', 'Aluno pode consultar rota comum, mas recebe 403 em ação administrativa.', 'Administrador válido recebe 200 somente após as verificações da sessão.', 'Explica a diferença entre este modelo local e autenticação segura no servidor.'])

    aula('projetos', 2, 'projeto-calculadora', 'Projeto: calculadora que explica as entradas',
         'Construir uma calculadora acessível com soma, subtração, validação de entradas e feedback que orienta a correção.',
         'dom', ['js-funcoes', 'dom-eventos', 'html-formulario'], [
             'A organização de uma oficina precisa somar materiais e comparar quantidades. Uma calculadora pequena permite praticar uma jornada inteira: entender a entrada, validar, calcular e apresentar o resultado. O objetivo não é apenas fazer aparecer um número; a pessoa precisa compreender o que preencher e conseguir corrigir um campo sem perder o restante do trabalho.',
             'Os valores de input chegam como texto. Antes de Number, use trim e recuse a string vazia: Number("") produz zero, mas campo esquecido não significa que a pessoa escolheu zero. Nesta calculadora, aceite vírgula ou ponto decimal substituindo uma vírgula por ponto antes da conversão. Depois exija Number.isFinite; palavras, infinitos e formatos com mais de um separador não são entradas válidas.',
             'Separe a função calcular da leitura dos campos. Ela recebe duas strings e a operação e devolve { ok: true, valor } quando consegue calcular, ou { ok: false, erro, campo } quando precisa de correção. Esse retorno permite testar regras no console sem clicar na interface. Somar usa dois números já convertidos; subtrair preserva a ordem: primeiro menos segundo.',
             'Os botões Somar e Subtrair leem os mesmos campos e chamam a mesma função. Atualize #resultado com textContent. Um parágrafo com role="status" anuncia mudanças sem exigir que toda a página seja relida. Cada campo possui label associado e instrução sobre decimais. Ao encontrar erro, marque aria-invalid no campo e devolva o foco para ele; preserve os valores digitados para facilitar a correção.',
             'Planeje casos antes de escrever os eventos: 12,5 mais 2,5 resulta em 15; a subtração resulta em 10; zero é válido; vazio e “livros” devem ser recusados. Teste também resultado negativo e um número excessivamente grande. A representação Number tem limites de precisão; esta é uma prática geral de aritmética, não uma calculadora financeira com garantia de centavos. Nenhuma informação é enviada ao servidor.'
         ], [
             exemplo('Converter somente depois de conferir o vazio', [
                 ('{', 'Abre um bloco independente para a preparação de entrada.'),
                 ('  const texto = " 12,5 ".trim();', 'Remove espaços ao redor sem transformar campo vazio em zero.'),
                 ('  if (texto === "") {', 'Separa a ausência de entrada de um zero fornecido de propósito.'),
                 ('    console.log("Preencha o número.");', 'Produz uma instrução útil em vez de inventar um valor padrão.'),
                 ('  } else {', 'Só segue para a conversão quando existe conteúdo para analisar.'),
                 ('    const numero = Number(texto.replace(",", "."));', 'Normaliza a vírgula decimal deste contrato e converte o texto.'),
                 ('    console.log(Number.isFinite(numero), numero);', 'Mostra a validade e o valor 12.5 para conferir a conversão.'),
                 ('  }', 'Conclui a separação dos caminhos vazio e preenchido.'),
                 ('}', 'Fecha o bloco sem misturar seus nomes aos outros exemplos.')
             ]),
             exemplo('A regra de cálculo pode ser testada sozinha', [
                 ('{', 'Isola a função aritmética usada nesta demonstração numérica.'),
                 ('  function operar(a, b, operacao) {', 'Recebe números que já foram convertidos e validados antes.'),
                 ('    return operacao === "somar" ? a + b : a - b;', 'Escolhe soma ou subtração dentro do contrato deste exemplo.'),
                 ('  }', 'Encerra a função sem ler um campo nem alterar a interface.'),
                 ('  console.log(operar(12.5, 2.5, "somar"));', 'Verifica a soma conhecida que deve produzir o número quinze.'),
                 ('  console.log(operar(2, 5, "subtrair"));', 'Confere a ordem da subtração e permite o resultado negativo.'),
                 ('}', 'Conclui a demonstração antes de conectar os eventos da tela.')
             ])
         ], [
             ('Por que conferir a string vazia antes de usar Number?', [
                 ('Porque Number("") vira zero, mas ausência de entrada deve pedir preenchimento.', True, 'O contrato diferencia uma informação esquecida do número zero, que é um valor válido para esta calculadora.'),
                 ('Porque trim transforma todos os números em valores inválidos.', False, 'Trim apenas remove espaços externos. A verificação de vazio impede interpretar uma ausência como zero.'),
                 ('Porque qualquer zero deveria ser proibido numa soma.', False, 'Zero é um operando válido. O erro é aceitar campo vazio sem confirmar a intenção de quem preencheu.')
             ]),
             ('Qual comportamento orienta melhor quem escreveu “livros” no primeiro campo?', [
                 ('Explicar o erro, marcar o campo e levar o foco até ele, preservando os textos.', True, 'A pessoa recebe uma indicação concreta de onde corrigir e não precisa preencher novamente o outro valor.'),
                 ('Apagar os dois campos e mostrar somente NaN.', False, 'A mensagem não explica a correção necessária e apagar dados válidos torna a recuperação mais difícil.'),
                 ('Trocar “livros” por zero e exibir o resultado como correto.', False, 'Inventar um número oculta a falha da entrada e produz uma resposta que a pessoa não solicitou.')
             ])
         ],
         'Implemente calcular(primeiro, segundo, operacao) recebendo strings, normalizando vírgula decimal, recusando vazio e valores não finitos e devolvendo objeto com ok e valor ou erro e campo (0 ou 1). Ligue os botões #somar e #subtrair aos campos existentes e apresente “Resultado: N” em #resultado; em erro, explique, marque aria-invalid e foque o campo. Com 12,5 e 2,5, confira 15 na soma e 10 na subtração. Imprima no console um relatório com chaves soma, subtracao, vazio e invalido contendo o retorno da função nesses casos.',
         'Adicione a operação multiplicar preservando a mesma validação e apresentação. Teste -3 por 2, zero por 8 e um campo vazio. Explique quais partes da aplicação puderam ser reutilizadas sem copiar a lógica de erro.',
         'Uma calculadora confiável distingue texto de número, valida antes de calcular e oferece uma correção acessível sem apagar o trabalho.',
         ['Campo vazio não equivale a zero informado.', 'Validar entrada e resultado sem misturar regra aritmética com manipulação da tela.'],
         ['Teste a função no console antes de adicionar ouvintes aos botões.', 'Guarde as duas strings e verifique trim antes de Number.', 'Retorne o índice do campo inválido para a apresentação definir foco e aria-invalid.'],
         {'html': HTML_CALCULADORA, 'css': 'input { max-width: 100%; padding: 10px; } button { padding: 10px; margin: 4px; } [aria-invalid="true"] { outline: 2px solid #8f2d4a; }',
          'js': 'function calcular(primeiro, segundo, operacao) {\n  // Valide, converta e devolva um resultado explicado.\n}\n// Conecte os dois botões à função e à região de resultado.\n'},
         'projeto-calculadora-validacao-feedback',
         ['Soma e subtração funcionam com zero, negativos e decimais do contrato.', 'Vazio e texto inválido não são silenciosamente substituídos por zero.', 'Rótulos, teclado, anúncio de resultado e foco de correção são utilizáveis.', 'Função de regra pode ser verificada independentemente do DOM.'])

    return {
        'frontend-estado': [
            {'id': 'estado-adicionar', 'descricao': 'Adicionar seleciona um lugar partindo do estado inicial zero.', 'tipo': 'evento', 'seletor': '#adicionar', 'propriedade': '#resumo', 'esperado': '1 lugares selecionados'},
            {'id': 'estado-remover', 'descricao': 'Remover volta a zero depois da adição de um lugar.', 'tipo': 'evento', 'seletor': '#remover', 'propriedade': '#resumo', 'esperado': '0 lugares selecionados'},
            {'id': 'estado-cartao', 'descricao': 'A renderização cria o título do cartão de seleção.', 'tipo': 'texto', 'seletor': '#cartao > article > h2', 'esperado': 'Sua seleção'}
        ],
        'fullstack-sessao': [
            {'id': f'sessao-{chave}', 'descricao': descricao, 'tipo': 'javascript', 'propriedade': f'json:{chave}', 'esperado': str(status)}
            for chave, status, descricao in [
                ('ausente', 401, 'Cabeçalho ausente produz 401 no modelo.'),
                ('expirada', 401, 'A igualdade no prazo de expiração produz 401.'),
                ('revogada', 401, 'Uma sessão revogada continua recusada antes do prazo.'),
                ('aluno', 200, 'Um aluno válido pode acessar a ação comum.'),
                ('proibido', 403, 'Aluno autenticado recebe 403 na ação administrativa.'),
                ('admin', 200, 'Administrador válido pode acessar a ação administrativa.')
            ]
        ],
        'projeto-calculadora': [
            {'id': 'calculadora-soma-tela', 'descricao': 'O botão Somar calcula os valores iniciais e apresenta 15.', 'tipo': 'evento', 'seletor': '#somar', 'propriedade': '#resultado', 'esperado': 'Resultado: 15'},
            {'id': 'calculadora-subtracao-tela', 'descricao': 'O botão Subtrair apresenta 10 para os valores iniciais.', 'tipo': 'evento', 'seletor': '#subtrair', 'propriedade': '#resultado', 'esperado': 'Resultado: 10'},
            {'id': 'calculadora-vazio', 'descricao': 'O relatório recusa campo vazio sem tratá-lo como zero.', 'tipo': 'javascript', 'propriedade': 'json:vazio.ok', 'esperado': 'false'},
            {'id': 'calculadora-invalido', 'descricao': 'O relatório recusa entrada não numérica.', 'tipo': 'javascript', 'propriedade': 'json:invalido.ok', 'esperado': 'false'}
        ]
    }


def solucoes():
    """Programas autorais de referência para a verificação controlada do editor."""
    return {
        'frontend-estado': {'html': HTML_ESTADO, 'css': '', 'js': JS_ESTADO},
        'fullstack-sessao': {'html': '<h1>Simulação local de sessão</h1><p>Os códigos no console representam decisões locais, sem autenticação real.</p>', 'css': '', 'js': JS_SESSAO},
        'projeto-calculadora': {'html': HTML_CALCULADORA, 'css': '', 'js': JS_CALCULADORA}
    }
