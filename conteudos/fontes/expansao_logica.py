"""Aulas autorais de escopo, arquivos e validação para a expansão editorial.

``registrar`` recebe os construtores do catálogo, sem importar seu gerador.
``solucoes`` fornece somente referências para a verificação de conteúdo.
"""


def registrar(aula, exemplo):
    aula(
        'javascript', 4, 'js-escopo', 'Escopo: cada contador guarda sua história',
        'Distinguir escopo de bloco e escopo lexical ao criar contadores independentes com funções.',
        'javascript', ['js-funcoes', 'js-arrays'],
        [
            'Duas oficinas usam contadores de participantes. Se ambas alterarem uma única variável global, um clique na primeira também muda o número da segunda. Precisamos decidir quem pode acessar cada dado. Escopo é a região do código em que um nome está disponível; organizar essa região evita que partes independentes do programa compartilhem estado por acidente.',
            'Uma declaração let pode receber outro valor. Const impede reatribuir o nome, mas não congela um objeto guardado nele. Ambas respeitam o bloco delimitado por chaves. Dentro de um if, uma nova declaração com o mesmo nome cria outra variável: isso é sombreamento. Alterar essa variável interna não altera a externa. Use nomes claros para não tornar esse efeito uma surpresa.',
            'O escopo lexical depende de onde uma função foi escrita, e não de quem a chamou. Uma função interna pode ler e atualizar variáveis da função que a contém. Quando a função interna é devolvida e continua usando essas variáveis, temos um fechamento, também chamado closure. O valor continua acessível à função devolvida mesmo depois de terminar a chamada que o criou.',
            'Uma fábrica de contadores recebe um início, declara um total local e devolve uma função que incrementa esse total. Cada chamada à fábrica cria um ambiente independente. Duas chamadas ao primeiro contador compartilham o mesmo total daquele contador; chamar a fábrica novamente cria outro total. Observe a diferença entre chamar criarContador(5) e chamar a função devolvida por ela.',
            'Antes do laboratório, acompanhe as saídas dos dois exemplos. Depois escreva no papel o total esperado após cada chamada. Não coloque o total fora da fábrica e não declare total novamente dentro da função de incremento, pois isso o reiniciaria a cada chamada. Esta aula não carrega módulos externos; todos os arquivos executados continuam pertencendo ao laboratório isolado.',
        ],
        [
            exemplo('Um nome dentro e fora do bloco', [
                ('let vagas = 10;', 'Declara a contagem externa que continuará disponível após o bloco.'),
                ('if (true) {', 'Abre um bloco próprio para observar uma declaração independente.'),
                ('  let vagas = 3;', 'Cria outra variável chamada vagas, limitada a estas chaves.'),
                ('  vagas += 1;', 'Incrementa somente a variável interna, que passa a valer quatro.'),
                ('  console.log("Dentro:", vagas);', 'Imprime quatro enquanto o nome interno ainda está disponível.'),
                ('}', 'Encerra o bloco e o acesso à declaração que existia somente nele.'),
                ('console.log("Fora:", vagas);', 'Imprime dez porque a variável externa não foi reatribuída.'),
            ]),
            exemplo('Uma função que preserva seu próprio total', [
                ('function criarContador(inicio) {', 'Abre uma fábrica; cada chamada recebe seu próprio valor inicial.'),
                ('  let total = inicio;', 'Reserva o estado deste contador antes de criar sua função interna.'),
                ('  return function incrementar() {', 'Devolve uma função que conserva acesso ao total desta chamada.'),
                ('    total += 1;', 'Atualiza o mesmo total preservado, sem reinicializá-lo aqui.'),
                ('    return total;', 'Devolve o número atualizado para quem chamou o incremento.'),
                ('  };', 'Fecha a função devolvida sem executá-la durante sua criação.'),
                ('}', 'Encerra a fábrica que será chamada separadamente para cada contador.'),
                ('const contadorDaSala = criarContador(2);', 'Cria um ambiente cujo total inicial é dois e guarda o incremento.'),
                ('console.log(contadorDaSala());', 'Executa a função guardada e mostra seu primeiro resultado: três.'),
                ('console.log(contadorDaSala());', 'Executa novamente e mostra quatro, preservando o total anterior.'),
            ]),
        ],
        [
            ('Duas chamadas separadas a criarContador(0) devem produzir contadores que...', [
                ('Guardam totais independentes.', True, 'Cada chamada à fábrica cria seu próprio ambiente; o fechamento preserva apenas o total daquela chamada.'),
                ('Compartilham obrigatoriamente uma variável global.', False, 'O total foi declarado dentro da fábrica, por isso não precisa ser global nem compartilhado entre as instâncias.'),
                ('Voltam sempre a zero depois de cada incremento.', False, 'A função interna continua acessando o mesmo total. Reiniciá-lo no incremento destruiria a contagem acumulada.'),
            ]),
            ('Existe let vagas = 10 fora de um bloco e let vagas = 3 dentro dele. Ao incrementar a interna, a externa...', [
                ('Continua valendo 10.', True, 'A declaração interna cria outra variável. O sombreamento muda qual nome é acessado dentro das chaves.'),
                ('Passa automaticamente a valer 4.', False, 'Isso ocorreria se a declaração interna não existisse e o programa alterasse a variável externa.'),
                ('Deixa de existir no programa inteiro.', False, 'A variável externa continua em seu escopo; ela apenas fica sombreada enquanto o bloco interno usa o mesmo nome.'),
            ]),
        ],
        'Implemente criarContador(inicio) com um total local e uma função devolvida que incrementa e retorna esse total. Crie primeiro com início 5 e segundo com início 0. Chame primeiro duas vezes, segundo uma vez e primeiro outra vez. Registre console.log({ primeiro: [a, b, c], segundo: d, externo }) com primeiro igual a [6, 7, 8], segundo igual a 1 e externo igual a 10. Demonstre um bloco com sua própria variável externo sem mudar a externa.',
        'Crie um terceiro contador começando em -1. Preveja e confira as duas primeiras saídas, depois chame o primeiro novamente e explique por que ele continua sua própria contagem.',
        'Escopo limita o acesso aos nomes; um fechamento mantém o estado do ambiente em que a função foi criada.',
        ['Distinguir a criação da função de sua execução posterior.', 'Não reiniciar o estado dentro de cada chamada de incremento.'],
        ['Desenhe uma caixa para cada chamada da fábrica.', 'Declare total dentro de criarContador, antes de devolver a função.', 'Use return para entregar uma função; o incremento pertence ao corpo dessa função.'],
        {'html': '<h1>Contadores independentes</h1><p>Acompanhe as chamadas no console.</p>', 'js': 'function criarContador(inicio) {\n  // Guarde o total e devolva uma função de incremento.\n}\nconst externo = 10;\nconsole.log({ primeiro: [], segundo: null, externo });'},
        'javascript-escopo-fechamentos',
        ['Cada contador preserva seu próprio total entre chamadas.', 'O relatório apresenta [6, 7, 8], 1 e 10 nos campos solicitados.', 'Explica por que o bloco interno não muda a variável externa.'],
    )

    aula(
        'python', 4, 'python-arquivos', 'Arquivos: escrever, fechar e ler de volta',
        'Serializar uma lista de oficinas em JSON, reler um arquivo UTF-8 e conferir seus dados sem acessar a rede.',
        'python', ['python-dicionarios'],
        [
            'Um relatório que existe apenas numa variável desaparece quando o programa termina. Um arquivo permite representar os dados fora daquela variável, desde que exista um sistema de arquivos para guardá-lo. No laboratório Python, esse sistema é virtual e pertence ao runtime WebAssembly; escrever nele não cria um arquivo pessoal na pasta Downloads do celular nem envia nada para a internet.',
            'Open recebe um caminho e um modo de acesso. O modo "w" cria ou substitui o conteúdo de um arquivo; use-o com cuidado para não apagar um documento existente. O modo "r" lê um arquivo que precisa existir. Encoding="utf-8" define como o texto será convertido em bytes e recuperado, preservando acentos. Arquivo de texto e lista Python são representações diferentes.',
            'With abre uma região de gerenciamento de recurso. Ao sair dessa região, o arquivo é fechado mesmo se ocorrer uma exceção. Não tente ler do objeto arquivo depois desse fechamento. Para conferir o conteúdo salvo, abra o mesmo caminho novamente em outro with. A indentação mostra exatamente quais instruções podem usar cada arquivo aberto.',
            'JSON é um formato textual para dados como listas, objetos, números e strings. Importe o módulo json da biblioteca padrão. Json.dump escreve os dados num arquivo aberto; json.load lê o arquivo e reconstrói os valores compatíveis. Ensure_ascii=False mantém os caracteres acentuados legíveis no texto salvo. Dump e load não validam as regras de negócio das oficinas.',
            'Para praticar sem deixar arquivos de exemplo espalhados, importe TemporaryDirectory do módulo tempfile e use outro with para criar uma pasta temporária. Monte o caminho com uma f-string e faça a escrita e a leitura dentro desse bloco. A pasta será removida no final. Fora dessa prática, o runtime pode descartar seus arquivos ao ser encerrado: o código salvo pelo Flow e o sistema de arquivos Python são mecanismos diferentes.',
        ],
        [
            exemplo('Um aviso com acentos', [
                ('from tempfile import TemporaryDirectory', 'Importa um gerenciador de pasta temporária da biblioteca padrão.'),
                ('with TemporaryDirectory() as pasta:', 'Cria uma pasta isolada que será removida quando este bloco terminar.'),
                ('    caminho_aviso = f"{pasta}/aviso.txt"', 'Monta o caminho dentro da pasta temporária, sem usar pastas pessoais.'),
                ('    with open(caminho_aviso, "w", encoding="utf-8") as arquivo:', 'Abre o aviso para escrita em UTF-8 e garante seu fechamento depois.'),
                ('        arquivo.write("Inscrições abertas")', 'Escreve texto acentuado no arquivo, sem convertê-lo numa lista.'),
                ('    with open(caminho_aviso, "r", encoding="utf-8") as arquivo:', 'Reabre o mesmo caminho para leitura depois do fechamento da escrita.'),
                ('        aviso_lido = arquivo.read()', 'Recupera o conteúdo textual enquanto o arquivo continua aberto.'),
                ('    print(aviso_lido)', 'Exibe o texto que veio do arquivo e permite conferir os acentos.'),
            ]),
            exemplo('Uma lista volta a ser dados', [
                ('import json', 'Disponibiliza a serialização e a leitura de dados no formato JSON.'),
                ('from tempfile import TemporaryDirectory', 'Importa novamente o recurso para este exemplo funcionar sozinho.'),
                ('with TemporaryDirectory() as pasta_dados:', 'Cria outra pasta para separar o exemplo de dados do aviso anterior.'),
                ('    caminho_dados = f"{pasta_dados}/oficinas.json"', 'Define um arquivo de texto JSON dentro da pasta temporária atual.'),
                ('    oficinas = [{"nome": "Desenho", "vagas": 2}]', 'Prepara uma lista Python com um dicionário e uma quantidade numérica.'),
                ('    with open(caminho_dados, "w", encoding="utf-8") as arquivo:', 'Abre o destino de escrita explicitando a codificação do texto.'),
                ('        json.dump(oficinas, arquivo, ensure_ascii=False)', 'Serializa a lista no arquivo sem transformar acentos em escapes.'),
                ('    with open(caminho_dados, "r", encoding="utf-8") as arquivo:', 'Abre o arquivo salvo para recuperar sua representação de dados.'),
                ('        recuperadas = json.load(arquivo)', 'Reconstrói a lista e os dicionários a partir do conteúdo JSON lido.'),
                ('    print(recuperadas[0]["nome"], recuperadas[0]["vagas"])', 'Consulta os campos da lista recuperada e mostra Desenho e dois.'),
            ]),
        ],
        [
            ('O que open(caminho, "w", encoding="utf-8") pode fazer se o arquivo já existir?', [
                ('Substituir o conteúdo anterior.', True, 'O modo w abre para escrita e trunca o arquivo existente; o exemplo usa uma pasta temporária para limitar esse efeito.'),
                ('Ler sem alterar nenhum byte.', False, 'A leitura usa r. Escolher w quando se queria apenas conferir o conteúdo pode apagar dados.'),
                ('Enviar automaticamente o arquivo para um servidor.', False, 'Open trabalha com o sistema de arquivos disponível; ele não realiza uma requisição de rede.'),
            ]),
            ('Qual operação reconstrói uma lista Python a partir de um arquivo JSON aberto para leitura?', [
                ('json.load(arquivo).', True, 'Load interpreta o JSON do arquivo e devolve os valores Python compatíveis para consulta.'),
                ('json.dump(lista, arquivo).', False, 'Dump escreve dados no destino. Ele faz o caminho contrário ao da leitura solicitada.'),
                ('Escrever o nome do arquivo dentro de print.', False, 'Imprimir um caminho mostra só seu nome; isso não abre nem interpreta o conteúdo salvo.'),
            ]),
        ],
        'Dentro de uma TemporaryDirectory, salve em oficinas.json a lista inicial com json.dump e ensure_ascii=False. Feche a escrita e reabra em modo r com UTF-8. Use exclusivamente a lista relida para imprimir "Leitura: 0 vagas", "Escrita: 3 vagas" e "Total: 3 vagas". Preserve o valor zero e calcule o total a partir dos registros recuperados, sem fixá-lo como texto.',
        'Acrescente uma oficina chamada "Criação" com 2 vagas antes de salvar. Leia novamente o arquivo, confirme o acento e confira que o total passou a 5. Explique por que a pasta temporária desaparece ao sair do bloco.',
        'With fecha recursos; UTF-8 preserva texto; dump escreve JSON e load reconstrói dados a partir do arquivo.',
        ['Distinguir o arquivo virtual do laboratório de um download no dispositivo.', 'Não tentar ler usando um arquivo de escrita já fechado.'],
        ['Primeiro desenhe os dois blocos: escrever e depois ler.', 'Reutilize o mesmo caminho e a codificação UTF-8 nas duas aberturas.', 'O relatório deve percorrer recuperadas, não somente a lista original.'],
        {'python': 'import json\nfrom tempfile import TemporaryDirectory\n\noficinas = [{"nome": "Leitura", "vagas": 0}, {"nome": "Escrita", "vagas": 3}]\n# Salve e releia a lista numa pasta temporária antes de montar o relatório.\nprint("Relatório ainda não foi recuperado do arquivo.")'},
        'python-arquivos-json-utf8',
        ['Escrita e leitura usam o mesmo caminho com UTF-8 e recursos fechados por with.', 'O relatório vem da lista relida e preserva zero vagas.', 'A variação calcula o novo total e explica a duração do arquivo virtual.'],
    )

    aula(
        'backend', 2, 'api-validacao', 'Validação: responder sem inventar dados',
        'Validar um corpo desconhecido antes de criar uma resposta JSON local com status de sucesso ou erro.',
        'api', ['api-http', 'js-funcoes'],
        [
            'Uma tela pode oferecer somente números positivos, mas um cliente diferente pode enviar texto, campos ausentes ou uma lista inteira no lugar do objeto esperado. A fronteira do backend deve conferir esses dados antes de realizar uma operação. Neste laboratório montaremos Request e Response locais; isso ensina o contrato, mas não cria um servidor, um cadastro remoto ou uma autorização real.',
            'Comece pelo formato geral: typeof entrada === "object" não basta, porque null também possui esse resultado e arrays são objetos. Rejeite null e Array.isArray(entrada) antes de consultar os campos. Validar a estrutura primeiro evita uma exceção ao tentar ler entrada.nome de um valor inexistente. Uma falha esperada de validação deve produzir uma resposta compreensível.',
            'Confira typeof entrada.nome === "string" antes de chamar trim. Trim remove espaços das pontas; uma string só de espaços vira vazia e deve ser rejeitada. Para vagas, Number.isInteger exige um número inteiro, e a comparação com zero impede negativos. A string "3" não satisfaz esse contrato numérico. Converter silenciosamente esconderia um erro do cliente que precisamos explicar.',
            'Uma resposta JSON combina um status, Content-Type e um corpo serializado com JSON.stringify. Neste contrato, 201 confirma uma criação aceita no modelo e 422 representa um conteúdo compreendido cujo formato ou valores não atendem às regras. Retorne { erro: "nome inválido" } ou { erro: "vagas inválidas" } conforme o campo. Esse status é uma escolha documentada do contrato, não uma regra universal para toda API.',
            'Uma função de validação não deve preencher nome obrigatório com um valor fictício nem alterar o objeto recebido. No sucesso, construa um novo objeto com nome aparado e vagas, descartando campos extras. Para ler os corpos das respostas, use await resposta.json() dentro de uma função async. Teste zero vagas, texto numérico, nome vazio, array e null; observe cada caminho sem fazer fetch nem declarar persistência.',
        ],
        [
            exemplo('Uma guarda antes de acessar campos', [
                ('function lerNome(entrada) {', 'Recebe um valor desconhecido que ainda não possui contrato garantido.'),
                ('  if (!entrada || typeof entrada !== "object" || Array.isArray(entrada)) {', 'Rejeita valores ausentes, tipos primitivos e arrays antes do acesso.'),
                ('    return { erro: "objeto inválido" };', 'Devolve um erro descritivo sem tentar consultar um campo inexistente.'),
                ('  }', 'Fecha a guarda inicial e permite seguir apenas com um objeto aceitável.'),
                ('  if (typeof entrada.nome !== "string" || !entrada.nome.trim()) {', 'Verifica o tipo antes de aparar espaços e exige um nome não vazio.'),
                ('    return { erro: "nome inválido" };', 'Explica a falha do campo em vez de fabricar um nome substituto.'),
                ('  }', 'Encerra a rejeição dos nomes e preserva o objeto recebido sem alteração.'),
                ('  return { nome: entrada.nome.trim() };', 'Cria um novo resultado usando apenas o campo permitido e normalizado.'),
                ('}', 'Fecha a função que pode ser exercitada sem depender de uma interface.'),
                ('console.log(lerNome({ nome: "  Leitura  " }));', 'Confirma a normalização das bordas sem modificar o registro original.'),
                ('console.log(lerNome(null));', 'Demonstra que a ausência vira erro esperado em vez de uma exceção.'),
            ]),
            exemplo('O erro também tem um contrato HTTP', [
                ('async function observarErro() {', 'Abre uma função assíncrona para permitir a leitura posterior do corpo.'),
                ('  const resposta = new Response(JSON.stringify({ erro: "vagas inválidas" }), {', 'Cria uma resposta local cujo corpo já foi serializado como JSON.'),
                ('    status: 422,', 'Identifica a rejeição de dados segundo a convenção desta atividade.'),
                ('    headers: { "Content-Type": "application/json" }', 'Declara o formato que o cliente encontrará ao interpretar o corpo.'),
                ('  });', 'Conclui o objeto Response sem enviar nenhuma chamada pela internet.'),
                ('  console.log(resposta.status, resposta.ok);', 'Mostra 422 e false, pois o status de erro fica fora da faixa de sucesso.'),
                ('  console.log(await resposta.json());', 'Interpreta o texto JSON do corpo como um objeto JavaScript utilizável.'),
                ('}', 'Encerra a função de observação e separa sua declaração da chamada.'),
                ('observarErro();', 'Inicia a demonstração local sem solicitar qualquer recurso remoto.'),
            ]),
        ],
        [
            ('O contrato exige vagas como número inteiro não negativo. A entrada { nome: "Leitura", vagas: "3" } deve...', [
                ('Ser rejeitada com erro de vagas.', True, 'A string numérica não é um inteiro JavaScript. O contrato exige tipo correto antes da criação.'),
                ('Ser aceita só porque contém um algarismo.', False, 'A aparência do texto não muda seu tipo. Uma conversão silenciosa ocultaria o descumprimento do contrato.'),
                ('Receber zero vagas automaticamente.', False, 'Substituir um dado inválido por zero inventa uma decisão de negócio que o cliente não solicitou.'),
            ]),
            ('Por que testar null e Array.isArray antes de ler entrada.nome?', [
                ('Para rejeitar formatos inesperados antes de acessar os campos.', True, 'Null não pode ser consultado como objeto, e uma lista não representa o registro exigido pelo contrato.'),
                ('Para comprovar que o usuário está autenticado.', False, 'Validação de dados não comprova identidade; autenticação e autorização são verificações diferentes.'),
                ('Para salvar o objeto automaticamente num banco.', False, 'Uma guarda só decide se os dados podem avançar. O laboratório não possui persistência remota.'),
            ]),
        ],
        'Implemente criarResposta(entrada) retornando Response JSON: null, array ou tipo não objeto recebem 422 e erro "objeto inválido"; nome não textual ou vazio recebe 422 e erro "nome inválido"; vagas não inteiras ou negativas recebem 422 e erro "vagas inválidas". Sucesso retorna 201 e somente { nome: nome aparado, vagas }. Em async conferir(), registre um objeto com statusValido, statusTexto, statusNome, statusArray e statusAusente para os casos fornecidos; registre também corpoValido e erroTexto obtidos com await resposta.json(). Não use fetch e não altere as entradas.',
        'Teste vagas igual a -1, 1.5 e 0. Acrescente um campo admin: true à entrada válida e confirme que ele não aparece na resposta. Explique por que remover esse campo não substitui a autorização de um servidor real.',
        'Valide formato, tipo e regra antes de produzir um novo resultado; respostas locais demonstram um contrato sem criar um servidor.',
        ['Null passa por typeof objeto, mas não admite acesso a propriedades.', 'Dados válidos, identidade e permissão são responsabilidades distintas.'],
        ['Rejeite primeiro o formato geral, depois nome e finalmente vagas.', 'Uma pequena função auxiliar pode construir Response JSON com status e Content-Type.', 'Leia o corpo uma vez com await json() e registre campos estruturados para conferir os testes.'],
        {'html': '<h1>Contrato de criação de oficina</h1><p>Respostas locais, sem envio ou cadastro remoto.</p>', 'js': 'function criarResposta(entrada) {\n  // Valide a entrada e devolva uma Response JSON apropriada.\n}\nasync function conferir() {\n  const valida = { nome: "  Leitura  ", vagas: 0, extra: true };\n  const texto = { nome: "Leitura", vagas: "3" };\n  const nomeVazio = { nome: "   ", vagas: 3 };\n  const lista = [];\n  const ausente = null;\n  // Execute os casos e leia os corpos antes de montar o relatório.\n  console.log({ statusValido: null, statusTexto: null, statusNome: null, statusArray: null, statusAusente: null });\n}\nconferir();'},
        'backend-validacao-resposta-json',
        ['Guardas rejeitam formatos, nomes e vagas inválidos sem lançar exceções acidentais.', 'Status e corpos representam cada caminho do contrato local.', 'O sucesso mantém zero, apara o nome e descarta campos extras sem mutação.'],
    )

    return {
        'js-escopo': [
            {'id': 'contador-primeiro', 'descricao': 'O primeiro contador preserva a sequência 6, 7 e 8.', 'tipo': 'javascript', 'propriedade': 'json:primeiro', 'esperado': '[6,7,8]'},
            {'id': 'contador-segundo', 'descricao': 'O segundo contador começa de forma independente em 1.', 'tipo': 'javascript', 'propriedade': 'json:segundo', 'esperado': '1'},
            {'id': 'escopo-externo', 'descricao': 'A variável externa permanece igual a 10.', 'tipo': 'javascript', 'propriedade': 'json:externo', 'esperado': '10'},
        ],
        'python-arquivos': [
            {'id': 'arquivo-leitura', 'descricao': 'O relatório recuperado preserva Leitura com zero vagas.', 'tipo': 'python', 'esperado': 'Leitura: 0 vagas'},
            {'id': 'arquivo-escrita', 'descricao': 'O relatório recuperado apresenta Escrita com três vagas.', 'tipo': 'python', 'esperado': 'Escrita: 3 vagas'},
            {'id': 'arquivo-total', 'descricao': 'O total calculado dos registros recuperados é três.', 'tipo': 'python', 'esperado': 'Total: 3 vagas'},
        ],
        'api-validacao': [
            {'id': 'validacao-sucesso', 'descricao': 'Zero vagas recebe status 201 no contrato local.', 'tipo': 'javascript', 'propriedade': 'json:statusValido', 'esperado': '201'},
            {'id': 'validacao-texto', 'descricao': 'Vagas textuais recebem status 422.', 'tipo': 'javascript', 'propriedade': 'json:statusTexto', 'esperado': '422'},
            {'id': 'validacao-nome', 'descricao': 'Nome só com espaços recebe status 422.', 'tipo': 'javascript', 'propriedade': 'json:statusNome', 'esperado': '422'},
            {'id': 'validacao-lista', 'descricao': 'Uma lista no lugar do registro recebe status 422.', 'tipo': 'javascript', 'propriedade': 'json:statusArray', 'esperado': '422'},
            {'id': 'validacao-ausencia', 'descricao': 'Uma entrada null recebe status 422 sem quebrar a execução.', 'tipo': 'javascript', 'propriedade': 'json:statusAusente', 'esperado': '422'},
            {'id': 'validacao-corpo', 'descricao': 'O sucesso contém só o nome aparado e zero vagas.', 'tipo': 'javascript', 'propriedade': 'json:corpoValido', 'esperado': '{"nome":"Leitura","vagas":0}'},
            {'id': 'validacao-erro', 'descricao': 'O corpo de erro explica o problema de vagas.', 'tipo': 'javascript', 'propriedade': 'json:erroTexto', 'esperado': '{"erro":"vagas inválidas"}'},
        ],
    }


def solucoes():
    """Referências de QA autorais; não integram os arquivos iniciais do aluno."""
    return {
        'js-escopo': {
            'html': '<h1>Contadores independentes</h1>', 'css': '',
            'js': '''function criarContador(inicio) {
  let total = inicio;
  return function incrementar() {
    total += 1;
    return total;
  };
}
const primeiro = criarContador(5);
const segundo = criarContador(0);
const externo = 10;
{ let externo = 3; externo += 1; }
const a = primeiro();
const b = primeiro();
const d = segundo();
const c = primeiro();
console.log({ primeiro: [a, b, c], segundo: d, externo });''',
        },
        'python-arquivos': {
            'html': '', 'css': '', 'js': '',
            'python': '''import json
from tempfile import TemporaryDirectory

oficinas = [{"nome": "Leitura", "vagas": 0}, {"nome": "Escrita", "vagas": 3}]
with TemporaryDirectory() as pasta:
    caminho = f"{pasta}/oficinas.json"
    with open(caminho, "w", encoding="utf-8") as arquivo:
        json.dump(oficinas, arquivo, ensure_ascii=False)
    with open(caminho, "r", encoding="utf-8") as arquivo:
        recuperadas = json.load(arquivo)
    total = 0
    for oficina in recuperadas:
        print(f"{oficina['nome']}: {oficina['vagas']} vagas")
        total += oficina["vagas"]
    print(f"Total: {total} vagas")''',
        },
        'api-validacao': {
            'html': '<h1>Contrato local validado</h1>', 'css': '',
            'js': '''function responder(corpo, status) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
function criarResposta(entrada) {
  if (!entrada || typeof entrada !== "object" || Array.isArray(entrada)) {
    return responder({ erro: "objeto inválido" }, 422);
  }
  if (typeof entrada.nome !== "string" || !entrada.nome.trim()) {
    return responder({ erro: "nome inválido" }, 422);
  }
  if (!Number.isInteger(entrada.vagas) || entrada.vagas < 0) {
    return responder({ erro: "vagas inválidas" }, 422);
  }
  return responder({ nome: entrada.nome.trim(), vagas: entrada.vagas }, 201);
}
async function conferir() {
  const valida = { nome: "  Leitura  ", vagas: 0, extra: true };
  const respostaValida = criarResposta(valida);
  const respostaTexto = criarResposta({ nome: "Leitura", vagas: "3" });
  console.log({
    statusValido: respostaValida.status,
    statusTexto: respostaTexto.status,
    statusNome: criarResposta({ nome: "   ", vagas: 3 }).status,
    statusArray: criarResposta([]).status,
    statusAusente: criarResposta(null).status,
    corpoValido: await respostaValida.json(),
    erroTexto: await respostaTexto.json()
  });
}
conferir();''',
        },
    }
