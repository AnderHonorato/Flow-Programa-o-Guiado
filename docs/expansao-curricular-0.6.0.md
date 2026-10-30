# Expansão curricular — 0.6.0

O Flow passa de20 para30 aulas completas e de80 para120 atividades autorais. São60 questões objetivas,30 desafios e30 variações. O catálogo preserva as10 trilhas/60 módulos;30 módulos têm aulas e os outros30 continuam identificados como em produção editorial. A meta180 aulas/450 atividades continua pendente de expansão autoral.

## Novas aulas

| Trilha | Aula | Prática |
| --- | --- | --- |
| Fundamentos | Decompor uma tarefa em passos verificáveis | Estoque, entradas, etapas e saldo calculado |
| HTML | Tabelas que explicam a relação entre os dados | Caption, cabeçalhos e scope de coluna/linha |
| CSS | Distribuir cartões com CSS Grid | Duas trilhas, minmax, gap e conteúdo estreito |
| JavaScript | Escopo e closures | Contadores independentes e variáveis de bloco |
| DOM | Formulários e dados tratados | Submit, FormData, trim e mensagem textual local |
| Python | Arquivos JSON | Escrita/leitura real em diretório temporário do runtime |
| Frontend | Estado e renderização | Seleção limitada, cartão único e atualização coerente |
| Backend | Validação na fronteira | Tipos, campos e respostas JSON locais201/422 |
| Full stack | Sessão e autorização | Decisões locais401/403/200, validade e revogação |
| Projetos | Calculadora acessível | Decimais, soma/subtração, erro, aria-invalid e foco |

Cada aula nova tem cinco blocos autorais de ensino, dois exemplos explicados linha a linha, um experimento interativo específico, preparação em quatro passos, duas questões com justificativa por alternativa, desafio, variação, pistas e rubrica. As demonstrações não concedem XP. As questões continuam definitivas e só recebem correção/nota após o envio.

Os títulos dos pré-requisitos aparecem na aula, em vez dos identificadores técnicos. As20 aulas antigas são preservadas integralmente, inclusive suas questões e alternativas, evitando alterar avaliações já respondidas.

## Execução e isolamento

Python usa Pyodide real e o sistema de arquivos virtual do worker. TemporaryDirectory limpa os arquivos de prática; escrever ali não salva um documento pessoal no aparelho. O experimento visual de JSON é explicitamente um rastreamento; o laboratório é onde o código Python executa. Sessão e API nas aulas são simulações locais com Request/Response, sem envio de credenciais ou persistência remota.

O laboratório permite eventos nativos de formulário (`allow-forms`) e execução de código (`allow-scripts`), mantendo origem isolada e sem permissão de navegação superior. A política CSP continua com `form-action 'none'`, `connect-src 'none'` e `default-src 'none'`. O evento submit tem navegação impedida sem bloquear foco de rótulos, caixas de seleção, clique ou Enter. Envios diretos com form.submit também são bloqueados pela CSP.

## Fonte editorial e verificação

As fontes estão em `conteudos/fontes/expansao_{web,logica,apps}.py`; o gerador principal produz o catálogo estático. Soluções de referência são carregadas pelo processo Node/Python de QA, sem importação no aplicativo ou rota de respostas. O inventário separa conteúdo real de planejamento.

A CI regenera catálogo/inventário e exige ausência de diferenças com os arquivos versionados. O auditor verifica dependências, duplicações, estrutura editorial, exemplos Python e sintaxe JavaScript. A nova validação em navegador usa cada aula no aplicativo completo: o inicial incompleto precisa falhar um objetivo, e a solução executada precisa passar todos.

187 testes frontend e78 testes da API passaram. Evidências e resultados complementares deste lote ficam em `docs/evidencias/curriculo-0.6.0`. Nenhuma migração de banco é necessária; sessões, bloqueios, avaliações, ranking e certificados da0.5 mantêm a mesma estrutura.

O APK0.6/code6 continua uma compilação de depuração. Instalação sobre a versão anterior requer a mesma assinatura para preservar dados. Validação em aparelho Android físico e audição das vozes continuam pendentes; o funcionamento web do runtime não é evidência de execução nativa.
