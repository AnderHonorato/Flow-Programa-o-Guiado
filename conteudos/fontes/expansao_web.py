"""Expansão editorial: sequência, tabelas, Grid e formulários.

`registrar` recebe os mesmos construtores usados pelo catálogo original.
`solucoes` é uma referência de QA executável; não é incluída nas aulas publicadas.
"""


def registrar(aula, exemplo):
    aula('fundamentos', 2, 'fundamentos-algoritmos', 'Decompor uma tarefa em passos verificáveis',
         'Separar entrada, processamento e saída e acompanhar uma sequência numérica com um teste conhecido.',
         'javascript', ['fundamentos-caminho-web'], [
        'A biblioteca começou o dia com doze livros disponíveis, recebeu três doações e emprestou quatro exemplares. Antes de abrir um editor, escreva o que você sabe, o que precisa descobrir e como vai conferir. Esses três grupos são entrada, processamento e saída. O problema deixa de ser uma frase comprida e passa a ter pequenas responsabilidades verificáveis.',
        'Um algoritmo descreve uma sequência finita de passos para resolver uma tarefa. Neste caso, leia o estoque inicial, acrescente as doações e desconte os empréstimos. Faça a conta à mão primeiro: doze mais três menos quatro resulta em onze. Esse resultado conhecido permite conferir se o programa realmente segue a regra, em vez de aceitar qualquer número mostrado na tela.',
        'Vamos registrar os passos em JavaScript, a linguagem executada pelo navegador. const inicial = 12 cria um nome para o valor doze; o sinal = associa o valor ao nome, e não pergunta se duas coisas são iguais. Cada declaração termina com ponto e vírgula. Os operadores + e - fazem a soma e a subtração quando os valores são números, escritos sem aspas.',
        'Uma declaração pode usar nomes definidos nas linhas anteriores. const aposDoacoes = inicial + doacoes guarda uma etapa intermediária; const saldo = aposDoacoes - emprestimos guarda a próxima. console.log("Saldo:", saldo) escreve uma mensagem e o valor no console. O texto fica entre aspas e a vírgula separa os itens exibidos. Nesta aula não precisamos alterar a página nem ler campos.',
        'Para encontrar uma falha, acompanhe uma linha de cada vez e anote seu resultado. Se as doações são zero, o primeiro passo deve manter o estoque; se não há empréstimos, o saldo final coincide com o estoque após as doações. Não troque a conta por um número escrito diretamente no console: o programa precisa continuar correto quando as entradas mudarem. A regra desta prática considera quantidades inteiras não negativas e empréstimos que cabem no estoque.'
    ], [
        exemplo('Acompanhar o estoque em duas etapas', [
            ('const estoqueInicio = 8;', 'Guarda oito livros como entrada numérica do exemplo.'),
            ('const recebidos = 2;', 'Registra os dois livros que chegaram depois da abertura.'),
            ('const disponiveis = estoqueInicio + recebidos;', 'Soma os valores anteriores e guarda dez livros disponíveis.'),
            ('const saldoFinal = disponiveis - 3;', 'Desconta três empréstimos depois de contabilizar as doações.'),
            ('console.log("Saldo:", saldoFinal);', 'Mostra a identificação da saída e o saldo calculado de sete.')]),
        exemplo('Uma fronteira: nenhuma alteração', [
            ('const quantidadeBase = 5;', 'Define um estoque inicial diferente para conferir a regra.'),
            ('const doacoesDoDia = 0;', 'Representa uma entrada válida em que não chegou nenhum livro.'),
            ('const emprestimosDoDia = 0;', 'Registra que também não houve empréstimos neste cenário.'),
            ('const quantidadeAtual = quantidadeBase + doacoesDoDia - emprestimosDoDia;', 'Aplica a mesma sequência e mantém cinco livros disponíveis.'),
            ('console.log("Sem movimento:", quantidadeAtual);', 'Permite comparar a saída calculada com o estoque original.')])
    ], [
        ('Qual ação ajuda a verificar o algoritmo antes de executá-lo?', [
            ('Calcular um caso conhecido à mão e comparar com a saída.', True, 'Um resultado esperado independente do programa permite detectar se a sequência implementa a regra.'),
            ('Escolher qualquer número que pareça razoável.', False, 'Uma saída plausível pode esconder uma operação errada; ela precisa corresponder às entradas e à regra.'),
            ('Mudar a cor do título antes de escrever os passos.', False, 'A aparência não verifica a conta; primeiro separe os dados, a transformação e o resultado esperado.')]),
        ('O que const saldo = aposDoacoes - emprestimos representa?', [
            ('Uma etapa de processamento que calcula um novo valor.', True, 'A expressão usa duas entradas já conhecidas e guarda a diferença em um novo nome.'),
            ('Uma pergunta que compara dois valores.', False, 'O sinal = associa o resultado ao nome saldo; não faz uma pergunta de igualdade.'),
            ('Uma instrução que mostra o valor automaticamente na página.', False, 'Guardar um valor não o exibe; neste exercício console.log é responsável por produzir a saída.')])
    ],
        'Use as entradas inicial = 12, doacoes = 3 e emprestimos = 4. Calcule aposDoacoes e depois saldo, sem escrever 11 diretamente como resposta. Mostre console.log("Saldo:", saldo) e confira a mensagem Saldo: 11. Explique de qual entrada depende cada etapa.',
        'Mantenha a sequência, mas use inicial = 5, doacoes = 0 e emprestimos = 0. Preveja a saída antes de executar e justifique por que ela permanece 5.',
        'Decompor uma tarefa separa dados, transformações e resultado. Um caso conhecido e um caso sem movimento verificam a sequência.',
        ['Não confundir associação com uma comparação de igualdade.', 'Conferir etapas intermediárias em vez de substituir o cálculo pela resposta pronta.'],
        ['Escreva a conta em linguagem comum antes do código.', 'Some as doações ao estoque inicial e guarde essa etapa.', 'Subtraia os empréstimos da quantidade que já inclui as doações.'],
        {'html': '<h1>O caminho de uma conta</h1><p>Abra o console para acompanhar o estoque.</p>',
         'js': 'const inicial = 12;\nconst doacoes = 3;\nconst emprestimos = 4;\n// Calcule as duas etapas e mostre o saldo.'},
        'fundamentos-algoritmos-sequencia',
        ['Identifica entradas e saída antes de escrever as instruções.', 'Calcula o saldo a partir das entradas, sem fixar a resposta no console.', 'Confere o caso pedido e a variação com movimento zero.'])

    aula('html', 3, 'html-tabelas', 'Tabelas que explicam a relação entre os dados',
         'Representar uma agenda tabular com legenda e cabeçalhos associados a linhas e colunas.',
         'html', ['html-listas-links'], [
        'A programação da biblioteca tem três informações que sempre andam juntas: o nome da oficina, o dia e a sala. Uma lista já mostra os nomes, mas comparar o dia de cada atividade exige enxergar relações entre linhas e colunas. Uma tabela é adequada para esses dados. Ela não deve ser usada apenas para posicionar os blocos visuais de uma página; essa tarefa pertence ao CSS.',
        'table envolve a estrutura. caption dá um nome à tabela e permite compreender seu assunto antes de percorrer as células. tr reúne uma linha; th identifica uma célula de cabeçalho e td guarda um dado comum. A primeira linha pode apresentar Oficina, Dia e Sala. Cada linha seguinte precisa preservar essa ordem para que uma sala não acabe aparecendo na coluna de dia.',
        'thead agrupa a região dos cabeçalhos; tbody reúne as linhas de dados. Esses elementos tornam a estrutura explícita, mas sozinhos não dizem qual cabeçalho corresponde a cada célula. Use scope="col" nos títulos das colunas. Quando o nome de uma oficina identifica toda uma linha, ele pode ser th com scope="row". Essa associação ajuda tecnologias assistivas a manter o contexto durante a navegação.',
        'Considere a linha Leitura, Sábado, Sala 1. Leitura é o cabeçalho daquela linha; Sábado e Sala 1 são dados relacionados a ela. A tabela simples desta aula não usa células mescladas: cada linha possui três células. Não adicione espaços, quebras de linha ou elementos vazios para simular colunas. O alinhamento visual não substitui as relações semânticas criadas por th e scope.',
        'No laboratório, construa primeiro a tabela sem estilos e confira a legenda, os títulos e a quantidade de células por linha. Depois aplique bordas e espaçamento para facilitar a leitura. Em telas pequenas, uma tabela pode precisar de uma região com rolagem horizontal; esconder colunas sem explicar a perda de dados prejudica a comparação. A legenda deve continuar presente mesmo quando o título da página parece semelhante.'
    ], [
        exemplo('Uma agenda com cabeçalhos de coluna', [
            ('<table>', 'Abre uma tabela de dados relacionados, sem definir layout de página.'),
            ('  <caption>Horários da biblioteca</caption>', 'Nomeia o assunto de toda a tabela antes de seus cabeçalhos.'),
            ('  <thead><tr><th scope="col">Dia</th><th scope="col">Abertura</th></tr></thead>', 'Associa cada título às células de sua respectiva coluna.'),
            ('  <tbody>', 'Agrupa os registros que pertencem ao corpo da tabela.'),
            ('    <tr><td>Sábado</td><td>9 horas</td></tr>', 'Mantém o dia e seu horário na ordem definida pelo cabeçalho.'),
            ('  </tbody>', 'Encerra os dados sem misturá-los à região de cabeçalhos.'),
            ('</table>', 'Fecha a estrutura completa que poderá receber estilos depois.')]),
        exemplo('Um nome que identifica a linha', [
            ('<table>', 'Inicia uma segunda tabela independente da agenda anterior.'),
            ('  <caption>Vagas por oficina</caption>', 'Informa que os números abaixo representam disponibilidade de vagas.'),
            ('  <thead><tr><th scope="col">Oficina</th><th scope="col">Vagas</th></tr></thead>', 'Declara os dois cabeçalhos responsáveis por organizar as colunas.'),
            ('  <tbody>', 'Separa os dados das oficinas dos títulos das colunas.'),
            ('    <tr><th scope="row">Leitura</th><td>8</td></tr>', 'Usa o nome da oficina como cabeçalho para o valor da mesma linha.'),
            ('    <tr><th scope="row">Desenho</th><td>0</td></tr>', 'Preserva zero como um dado válido, sem esconder a oficina lotada.'),
            ('  </tbody>', 'Conclui o conjunto de registros com uma linha por oficina.'),
            ('</table>', 'Fecha a tabela mantendo as associações de linhas e colunas.')])
    ], [
        ('Qual marcação associa um título a todas as células de uma coluna simples?', [
            ('th com scope="col".', True, 'O elemento th identifica um cabeçalho e scope="col" explicita sua relação com a coluna.'),
            ('td com o texto em letras maiúsculas.', False, 'A aparência das letras não transforma uma célula comum em um cabeçalho semanticamente associado.'),
            ('p posicionado acima da tabela com espaços.', False, 'A posição visual não estabelece uma relação de cabeçalho entre o parágrafo e as células.')]),
        ('Para que serve caption nesta aula?', [
            ('Dar um nome que descreve o assunto da tabela.', True, 'A legenda permite identificar o conjunto de dados antes de percorrer suas linhas e colunas.'),
            ('Substituir todos os cabeçalhos de linha e coluna.', False, 'Caption nomeia o conjunto; th e scope continuam responsáveis pelas relações internas dos dados.'),
            ('Adicionar uma coluna vazia para ajustar a largura.', False, 'Legenda não é uma coluna; dimensões e alinhamento devem ser tratados com CSS quando necessário.')])
    ],
        'Crie uma tabela com caption “Agenda das oficinas”, thead e tbody. Os cabeçalhos de coluna devem ser Oficina, Dia e Sala, todos com scope="col". Acrescente as linhas Leitura / Sábado / Sala 1 e Desenho / Domingo / Sala 2; os nomes das oficinas devem ser th com scope="row". Mantenha três células em cada linha.',
        'Acrescente a coluna Vagas e informe 8 para Leitura e 0 para Desenho. Atualize o cabeçalho e as duas linhas; explique por que uma célula vazia não comunica o mesmo que zero.',
        'Tabelas representam relações de dados. Caption nomeia o conjunto; th e scope identificam os cabeçalhos de linhas e colunas.',
        ['Distinguir uma tabela de dados de um arranjo visual de blocos.', 'Preservar a ordem e a quantidade de células quando uma coluna é acrescentada.'],
        ['Desenhe três colunas e duas linhas de dados antes de escrever a marcação.', 'Coloque os títulos em thead e as oficinas em tbody.', 'Use th scope="row" no nome que identifica cada oficina.'],
        {'html': '<h1>Agenda da biblioteca</h1>\n<!-- Construa a tabela de oficinas aqui. -->',
         'css': 'table { border-collapse: collapse; }\nth, td { border: 1px solid #777; padding: 8px; text-align: left; }\ncaption { text-align: left; font-weight: bold; padding: 8px 0; }'},
        'html-tabelas-cabecalhos',
        ['Legenda descreve a agenda e a estrutura usa thead e tbody.', 'Cabeçalhos de coluna e de linha possuem scope apropriado.', 'As duas oficinas mantêm os dados alinhados nas três colunas.', 'A variação preserva zero como informação numérica significativa.'])

    aula('css', 4, 'css-grid', 'Distribuir cartões com CSS Grid',
         'Organizar uma coleção em duas colunas iguais e permitir que o conteúdo diminua sem criar overflow.',
         'css', ['css-flexbox'], [
        'A biblioteca quer apresentar quatro oficinas como uma pequena galeria: duas colunas com espaçamento uniforme e leitura da esquerda para a direita. Flexbox já ajuda a distribuir ações em um eixo. Grid permite declarar também as trilhas de colunas de uma composição. Os dois recursos resolvem necessidades diferentes e podem conviver; não é necessário trocar toda a página por Grid.',
        'A propriedade display: grid pertence ao contêiner que reúne os cartões, não a cada cartão. grid-template-columns define as trilhas. Escrever 1fr 1fr distribui o espaço disponível em duas frações iguais depois de considerar o intervalo. gap separa os itens sem criar uma borda externa. A quantidade de cartões não precisa ser igual à quantidade de colunas: os próximos itens ocupam novas linhas automaticamente.',
        'Um conteúdo comprido pode impedir uma coluna de encolher. minmax(0, 1fr) define um mínimo zero e uma fração como máximo de cada trilha; repeat(2, minmax(0, 1fr)) repete essa definição duas vezes. Isso permite que as duas colunas dividam o espaço do contêiner, mas o texto interno ainda precisa poder quebrar. overflow-wrap: anywhere ajuda nomes muito longos a permanecer legíveis sem empurrar a página.',
        'A ordem visual normal acompanha a ordem do HTML, preservando uma leitura previsível no teclado e em tecnologias assistivas. Não reposicione cartões só para desenhar uma composição que contradiz essa sequência. Para conferir o comportamento responsivo desta prática, reduza a largura da prévia: as colunas continuam iguais e seus conteúdos passam a ocupar mais linhas. Uma regra de media query pode trocar para uma coluna em projetos futuros.',
        'No laboratório, comece pela coleção existente e mude apenas as regras de .oficinas. Defina Grid, duas trilhas com minmax e intervalo de 16 pixels. Inspecione tanto os quatro cartões quanto um nome comprido. Trocar gap não altera a quantidade de colunas; trocar o primeiro argumento de repeat altera. O objetivo é justificar cada efeito observado e reconhecer quando o conteúdo precisa de uma composição mais simples.'
    ], [
        exemplo('Duas trilhas iguais', [
            ('.agenda {', 'Seleciona o contêiner que já contém os cartões da agenda.'),
            ('  display: grid;', 'Transforma os filhos diretos em itens de uma grade.'),
            ('  grid-template-columns: 1fr 1fr;', 'Divide o espaço disponível em duas trilhas de mesma proporção.'),
            ('  gap: 12px;', 'Cria doze pixels de intervalo entre linhas e colunas.'),
            ('}', 'Encerra as regras do contêiner sem reposicionar os filhos.')]),
        exemplo('Colunas que podem encolher', [
            ('.grade {', 'Aplica a composição ao contêiner da segunda coleção.'),
            ('  display: grid;', 'Ativa o algoritmo de Grid para organizar os filhos diretos.'),
            ('  grid-template-columns: repeat(2, minmax(0, 1fr));', 'Repete duas trilhas iguais cujo mínimo permite encolhimento.'),
            ('  gap: 16px;', 'Mantém um intervalo previsível, sem somar margens por item.'),
            ('}', 'Fecha a composição que controla as dimensões das trilhas.'),
            ('.grade > article { overflow-wrap: anywhere; }', 'Permite quebrar nomes longos dentro da largura disponível.')])
    ], [
        ('Onde deve ser aplicado display: grid para organizar quatro cartões irmãos?', [
            ('No contêiner que contém os quatro cartões.', True, 'Grid organiza os filhos diretos do elemento que recebe display: grid.'),
            ('Somente no último parágrafo da página.', False, 'A grade organiza filhos diretos; um parágrafo sem os cartões não controla a composição deles.'),
            ('Em todos os elementos, incluindo cada letra do título.', False, 'A composição precisa de um contêiner bem definido, e não de uma regra indiscriminada para toda a árvore.')]),
        ('O que repeat(2, minmax(0, 1fr)) define?', [
            ('Duas trilhas iguais que podem encolher até o mínimo zero.', True, 'Repeat duplica a definição e minmax permite que cada trilha diminua ao repartir o espaço disponível.'),
            ('Exatamente dois cartões e nenhuma outra linha.', False, 'A regra define colunas; os demais cartões continuam sendo distribuídos em novas linhas.'),
            ('Um intervalo obrigatório de dois pixels.', False, 'O número dois é a quantidade de repetições. O intervalo entre itens é responsabilidade de gap.')])
    ],
        'Transforme .oficinas em uma grade com duas colunas iguais usando repeat(2, minmax(0, 1fr)) e gap de 16px. Preserve os quatro cartões e sua ordem no HTML. Use overflow-wrap: anywhere nos cartões e confira a prévia estreita com o nome comprido fornecido.',
        'Mude repeat para uma única coluna, mantendo o mesmo gap. Compare a quantidade de linhas e explique por que não foi necessário remover cartões do HTML.',
        'Grid define trilhas no contêiner; gap separa os itens. Minmax e quebra de texto ajudam a composição a respeitar o espaço disponível.',
        ['Aplicar a regra ao pai correto dos cartões.', 'Distinguir quantidade de trilhas de quantidade de elementos.'],
        ['Localize o elemento que contém os quatro articles.', 'Comece por display: grid e adicione a definição das duas colunas.', 'Mantenha gap no contêiner e a quebra de texto nos cartões.'],
        {'html': '<h1>Oficinas em destaque</h1>\n<section class="oficinas" aria-label="Oficinas">\n  <article>Leitura compartilhada</article>\n  <article>Desenho de observação</article>\n  <article>EscritaCriativaComUmNomeMuitoComprido</article>\n  <article>Contação de histórias</article>\n</section>',
         'css': 'body { font-family: sans-serif; padding: 16px; }\n.oficinas { /* Defina a grade aqui. */ }\n.oficinas > article { border: 1px solid #777; padding: 12px; }'},
        'css-grid-trilhas-responsivas',
        ['O contêiner usa Grid e intervalo de 16 pixels.', 'Duas trilhas minmax repartem a largura sem remover conteúdos.', 'Nomes longos quebram dentro dos cartões e a ordem de leitura é mantida.', 'A variação altera o número de colunas sem mexer nos dados.'])

    aula('dom', 3, 'dom-formularios', 'Ler um formulário e responder sem recarregar',
         'Tratar o evento submit, extrair um campo nomeado e apresentar uma confirmação local com texto seguro.',
         'dom', ['dom-eventos', 'html-formulario'], [
        'A pessoa preencheu seu nome para demonstrar interesse em uma oficina. Queremos conferir esse nome e mostrar uma mensagem perto do formulário, sem atualizar a página. Esta aula trata apenas uma confirmação local: nenhum cadastro será enviado à internet nem gravado num servidor. Esse limite precisa aparecer na interface para que uma demonstração não prometa uma inscrição real.',
        'O evento submit pertence ao formulário e representa a intenção de enviar, inclusive quando a pessoa usa Enter no campo. Escutar apenas o click do botão deixa de cobrir outros caminhos de interação. Passe uma função a addEventListener("submit", ...). Dentro dela, evento.preventDefault() cancela a navegação padrão que ocorreria depois do evento; ele não cancela o restante da nossa função.',
        'FormData recebe o elemento form e reúne controles nomeados que participam do envio. new FormData(formulario).get("nome") busca o valor pelo atributo name="nome", não pelo id visual. O resultado pode ser texto, arquivo ou null; por isso, confirme typeof valor === "string" antes de usar métodos textuais. O id continua importante para ligar label e input, mas tem outra responsabilidade.',
        'trim() devolve uma nova string sem os espaços das pontas. O campo pode conter apenas espaços e ainda assim parecer preenchido para uma validação simples, então confira se o nome tratado não ficou vazio. Nesse caso mostre uma orientação concreta e encerre a função com return. Para um nome válido, monte uma saudação usando textContent. Não use innerHTML com o texto fornecido pela pessoa.',
        'Reserve uma saída com role="status" para anunciar a mensagem sem mover o foco à força. O botão type="submit" fica dentro do formulário; seu papel é oferecer uma ação explícita de conferência, e o evento continua pertencendo ao form. Teste um nome com espaços nas pontas, um campo vazio e o envio por Enter. Cada teste verifica uma parte do contrato e a mensagem deve continuar dizendo que se trata de uma demonstração local.'
    ], [
        exemplo('Escutar a intenção do formulário', [
            ('const formularioExemplo = document.querySelector("#inscricao");', 'Seleciona o formulário que reúne os controles desta demonstração.'),
            ('if (formularioExemplo) {', 'Confere a existência do formulário antes de registrar o evento.'),
            ('  formularioExemplo.addEventListener("submit", evento => {', 'Registra a função para qualquer intenção de envio do formulário.'),
            ('    evento.preventDefault();', 'Impede a navegação padrão, preservando a execução da função local.'),
            ('    console.log("Demonstração local: nenhum envio remoto.");', 'Explica a limitação em vez de anunciar um cadastro inexistente.'),
            ('  });', 'Fecha a função passada ao evento sem executá-la antecipadamente.'),
            ('}', 'Encerra a proteção usada quando o formulário não é encontrado.')]),
        exemplo('Tratar o valor antes de apresentar', [
            ('const dadosExemplo = new FormData();', 'Cria um conjunto local para estudar a leitura de um campo nomeado.'),
            ('dadosExemplo.set("nome", "  Bia  ");', 'Simula o texto que um campo de nome forneceria ao formulário.'),
            ('const recebidoExemplo = dadosExemplo.get("nome");', 'Busca a informação pelo nome e não por um seletor de elemento.'),
            ('const nomeExemplo = typeof recebidoExemplo === "string" ? recebidoExemplo.trim() : "";', 'Verifica o tipo e remove somente espaços das pontas do texto.'),
            ('const saidaExemplo = document.querySelector("#mensagem");', 'Localiza o destino textual que anunciará a orientação ao usuário.'),
            ('if (saidaExemplo) {', 'Confere a presença da saída antes de modificar seu conteúdo.'),
            ('  saidaExemplo.textContent = nomeExemplo ? `Olá, ${nomeExemplo}! Demonstração local.` : "Escreva seu nome.";', 'Apresenta o nome como texto e oferece orientação quando ele está vazio.'),
            ('}', 'Conclui a atualização sem interpretar marcação fornecida como nome.')])
    ], [
        ('Por que escutar submit no formulário em vez de apenas click no botão?', [
            ('Para tratar a intenção de envio também por teclado.', True, 'Submit pertence ao formulário e cobre a ação sem depender exclusivamente de um clique no botão.'),
            ('Para enviar automaticamente os dados a qualquer servidor.', False, 'Registrar o evento não configura um serviço remoto; esta prática cancela a navegação e responde localmente.'),
            ('Para dispensar os atributos name dos campos.', False, 'FormData usa os nomes dos controles, independentemente do evento que iniciou a leitura.')]),
        ('Qual é a forma adequada de mostrar um nome digitado pela pessoa?', [
            ('Validar o texto, aplicar trim e atribuir a textContent.', True, 'O tratamento confere o contrato e textContent apresenta os caracteres sem interpretá-los como HTML.'),
            ('Copiar o valor diretamente para innerHTML.', False, 'InnerHTML interpreta marcação; um nome precisa ser apresentado como texto, sem criar elementos inesperados.'),
            ('Procurar o valor com get usando apenas o id do campo, sem name.', False, 'FormData busca controles por name. Id serve para seleção e associação com o rótulo, mas não substitui name.')])
    ],
        'No formulário #inscricao, trate submit com preventDefault. Leia o campo name="nome" por FormData, confira que é string e aplique trim. Se ficar vazio, mostre “Escreva seu nome.” em #mensagem. Caso contrário mostre “Olá, Ana! Demonstração local.” para o valor inicial com espaços. Use textContent e preserve o anúncio role="status". Nenhum dado deve ser enviado à rede.',
        'Apague o nome e teste também somente espaços. Depois digite <b>Bia</b>: a saudação deve exibir os símbolos literalmente, sem tornar Bia um elemento em negrito. Compare clique e Enter.',
        'Submit cobre a intenção de envio; FormData usa name; trim trata as pontas. A confirmação local usa textContent e não equivale a cadastro remoto.',
        ['Distinguir name usado no envio de id usado pelo rótulo.', 'Evitar anunciar sucesso quando o valor tratado está vazio.'],
        ['Selecione o formulário e a região de mensagem antes de registrar o evento.', 'Dentro do submit, cancele a navegação e obtenha FormData do formulário.', 'Confira o tipo, trate os espaços e escolha uma mensagem antes de alterar textContent.'],
        {'html': '<h1>Interesse na oficina</h1>\n<p>Demonstração local: nenhum dado é enviado.</p>\n<form id="inscricao">\n  <label for="nome">Seu nome</label>\n  <input id="nome" name="nome" value="  Ana  ">\n  <button type="submit" id="conferir">Conferir nome</button>\n</form>\n<p id="mensagem" role="status"></p>',
         'js': 'const formulario = document.querySelector("#inscricao");\nconst mensagem = document.querySelector("#mensagem");\n// Registre o evento submit e apresente a orientação local.'},
        'dom-formularios-envio-local',
        ['Trata submit e cancela a navegação sem inventar recebimento remoto.', 'Lê name por FormData, verifica o tipo e remove espaços das pontas.', 'Campo vazio produz orientação e o nome válido aparece via textContent.', 'Clique e teclado preservam o fluxo e a região de status.'])

    return {
        'fundamentos-algoritmos': [
            {'id': 'saldo-calculado', 'descricao': 'O console apresenta Saldo: 11 para as entradas fornecidas.', 'tipo': 'javascript', 'esperado': 'Saldo: 11'}],
        'html-tabelas': [
            {'id': 'legenda', 'descricao': 'A tabela tem a legenda Agenda das oficinas.', 'tipo': 'texto', 'seletor': 'table > caption', 'esperado': 'Agenda das oficinas'},
            {'id': 'cabecalho-coluna', 'descricao': 'O cabeçalho Dia está associado à coluna.', 'tipo': 'texto', 'seletor': 'thead th[scope="col"]:nth-child(2)', 'esperado': 'Dia'},
            {'id': 'cabecalho-linha', 'descricao': 'A primeira oficina é um cabeçalho de linha.', 'tipo': 'texto', 'seletor': 'tbody tr:first-child > th[scope="row"]', 'esperado': 'Leitura'},
            {'id': 'segunda-sala', 'descricao': 'A segunda oficina ocupa a Sala 2 na terceira coluna.', 'tipo': 'texto', 'seletor': 'tbody tr:nth-child(2) > td:last-child', 'esperado': 'Sala 2'}],
        'css-grid': [
            {'id': 'contêiner-grid', 'descricao': 'O contêiner das oficinas usa Grid.', 'tipo': 'estilo', 'seletor': '.oficinas', 'propriedade': 'display', 'esperado': 'grid'},
            {'id': 'intervalo-grid', 'descricao': 'As colunas têm intervalo de 16 pixels.', 'tipo': 'estilo', 'seletor': '.oficinas', 'propriedade': 'column-gap', 'esperado': '16px'},
            {'id': 'quebra-nomes', 'descricao': 'Os nomes longos podem quebrar dentro dos cartões.', 'tipo': 'estilo', 'seletor': '.oficinas > article', 'propriedade': 'overflow-wrap', 'esperado': 'anywhere'}],
        'dom-formularios': [
            {'id': 'saudacao-submit', 'descricao': 'Enviar o formulário apresenta o nome sem espaços nas pontas.', 'tipo': 'evento', 'seletor': '#conferir', 'propriedade': '#mensagem', 'esperado': 'Olá, Ana! Demonstração local.'}]
    }


def solucoes():
    return {
        'fundamentos-algoritmos': {
            'html': '<h1>O caminho de uma conta</h1><p>Confira o console.</p>', 'css': '',
            'js': 'const inicial = 12;\nconst doacoes = 3;\nconst emprestimos = 4;\nconst aposDoacoes = inicial + doacoes;\nconst saldo = aposDoacoes - emprestimos;\nconsole.log("Saldo:", saldo);'},
        'html-tabelas': {
            'html': '<h1>Agenda da biblioteca</h1>\n<table>\n<caption>Agenda das oficinas</caption>\n<thead><tr><th scope="col">Oficina</th><th scope="col">Dia</th><th scope="col">Sala</th></tr></thead>\n<tbody>\n<tr><th scope="row">Leitura</th><td>Sábado</td><td>Sala 1</td></tr>\n<tr><th scope="row">Desenho</th><td>Domingo</td><td>Sala 2</td></tr>\n</tbody>\n</table>',
            'css': 'table { border-collapse: collapse; } th, td { border: 1px solid #777; padding: 8px; }', 'js': ''},
        'css-grid': {
            'html': '<h1>Oficinas em destaque</h1><section class="oficinas" aria-label="Oficinas"><article>Leitura compartilhada</article><article>Desenho de observação</article><article>EscritaCriativaComUmNomeMuitoComprido</article><article>Contação de histórias</article></section>',
            'css': 'body { padding: 16px; } .oficinas { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; } .oficinas > article { overflow-wrap: anywhere; border: 1px solid #777; padding: 12px; }', 'js': ''},
        'dom-formularios': {
            'html': '<h1>Interesse na oficina</h1><p>Demonstração local: nenhum dado é enviado.</p><form id="inscricao"><label for="nome">Seu nome</label><input id="nome" name="nome" value="  Ana  "><button type="submit" id="conferir">Conferir nome</button></form><p id="mensagem" role="status"></p>', 'css': '',
            'js': 'const formulario = document.querySelector("#inscricao");\nconst mensagem = document.querySelector("#mensagem");\nif (formulario && mensagem) formulario.addEventListener("submit", evento => {\n  evento.preventDefault();\n  const valor = new FormData(formulario).get("nome");\n  const nome = typeof valor === "string" ? valor.trim() : "";\n  mensagem.textContent = nome ? `Olá, ${nome}! Demonstração local.` : "Escreva seu nome.";\n});'}
    }
