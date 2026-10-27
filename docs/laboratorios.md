# Laboratórios de programação

`aplicativos/web/src/laboratorios/Laboratorio.tsx` implementa o contrato React de `contratos/integracao.md`. Recebe aula/perfil e callbacks de testes e envio. Não executa código do aluno na API.

## Editor e projetos

CodeMirror 6 com HTML, CSS, JavaScript e Python; números de linha, realce, autocomplete, Tab para indentar, autoindentação, seleção, desfazer e refazer. Arquivos `index.html`, `style.css`, `script.js`, `main.py`. A ação Autoindentar usa as regras da linguagem do editor; não equivale a um formatador completo. O histórico de desfazer é da aba atual e reinicia ao trocar de arquivo; os documentos são mantidos.

Salvamento local por perfil/aula com debounce de 250 ms, limites de 200 mil caracteres por arquivo e até 20 snapshots. A falha de quota/armazenamento é exibida. Restaurar o início primeiro cria snapshot da edição. Não há envio de rascunhos para a API sem acionar envio de desafio. Funções `exportarProjetos`, `importarProjetos`, `validarProjetos` e `vincularProjetos` permitem backup e migração para conta. Conflitos preservam o destino e recuperam a origem como snapshot; nunca apagam o perfil de origem.

A prévia atualiza após 450 ms ou pelo botão Executar. Desktop usa editor/prévia e console/testes, com redimensionamento vertical do editor e horizontal no desktop. Celular tem Código / Visualização / Console / Testes. As dimensões de prévia 375, 768 e largura disponível alteram o iframe sem recarregar a página. Inspeção mostra seletor, caixa, margem, padding e árvore resumida, e seleciona a linha HTML aproximada. Elementos gerados dinamicamente e tags repetidas podem mapear para a primeira ocorrência; não há source map de template/DOM completo.

## Execução HTML/CSS/JS e limites de segurança

A prévia é um `iframe sandbox="allow-scripts"` sem `allow-same-origin`, com origem opaca e `referrerPolicy="no-referrer"`. O HTML passa por DOMParser: scripts, frames, objetos, meta, links externos, handlers `on*` e ações de formulário são retirados. JavaScript só roda a partir do arquivo JS. Título e idioma do HTML original são preservados.

A CSP do documento usa `default-src 'none'`, JS com nonce aleatório, sem eval, CSS inline, imagens apenas `data:`, sem fetch/XHR/websocket, fontes externas, mídia, objetos, frames, workers, base ou submissão de formulário. O canal postMessage no pai confere janela de origem e token de execução, não apenas a string do evento. O console apresenta valores reais, erros e rejeições e limita sua saída a 200 mensagens. A CSP bloqueia subrecursos de rede; requisições do cliente HTTP são um fluxo separado e explícito.

Acorn analisa a AST e injeta guardas em corpos de laços/funções/setas, interrompendo loops e recursão comuns por 50 mil passos ou 1,2 segundo sem ceder ao navegador. O orçamento é renovado quando o event loop volta a responder, preservando eventos após espera. Erros de sintaxe aparecem antes da execução. Scripts inline no HTML são removidos, portanto precisam ser colocados em `script.js`.

**Limite material:** iframe e instrumentação no mesmo navegador não são um limite de CPU/memória do sistema operacional. Operações nativas custosas (por exemplo regex patológica), grandes alocações e JS deliberadamente adversarial podem congelar/encerrar a aba. Sandboxing restringe a origem e a navegação superior, porém CSP não proíbe toda navegação do próprio frame em todos os motores. Não declarar esta prévia um serviço seguro para executar código hostil de terceiros; execução remota multiusuário exigiria processo/container separado com quotas e egress bloqueado. A confirmação de Android/WebView depende de teste no dispositivo.

## Verificações objetivas

`Aula.testes` contém testes declarativos, executados no DOM da própria prévia: elemento, texto, atributo, estilo computado e evento de clique com resultado observável. JavaScript compara saída real do console; Python compara stdout real. O campo `propriedade` em evento é o seletor do elemento cujo texto será conferido após o clique. Texto sem `esperado` exige conteúdo não vazio; atributo sem `esperado` exige presença. JavaScript sem erros é conferido adicionalmente nas aulas web. Testar recria a prévia com o código atual, inclusive com atualização automática desabilitada.

Aulas sem testes declarados recebem verificações básicas explicitamente limitadas (conteúdo visível e ausência de erro), sem alegar cobertura da rubrica inteira. Python sem testes nunca é aprovado automaticamente. Testes locais podem ser manipulados por código deliberadamente malicioso; servem ao aprendizado, não à certificação ou avaliação autoritativa. Avaliação pedagógica e revisão de servidor permanecem separadas.

## Python local verdadeiro

`python.worker.ts` carrega `/pyodide/pyodide.mjs` de distribuição oficial local, usando `indexURL: '/pyodide/'`. São necessários `pyodide.mjs`, `pyodide.asm.js`, `pyodide.asm.wasm`, `python_stdlib.zip`, `pyodide-lock.json` da mesma versão; manter a licença da distribuição. O provisionamento não depende de CDN na execução. O cache offline dos arquivos grandes precisa ser configurado pelo service worker e depende de quota do dispositivo.

Execução em Web Worker com saída real, limite de inicialização de 45 segundos e de execução de 4 segundos após carregar. Parar termina o worker, inclusive loops infinitos Python. Não suporta input interativo ou pip/pacotes externos. Cada execução começa em worker novo. APIs de rede comuns do worker são removidas após a inicialização, mas a ponte JS de Pyodide e import dinâmico exigem CSP de produção no contexto worker para uma garantia completa de egress; não tratar isso como isolamento de sistema. Não há limite rígido de memória WebAssembly. Falta do runtime gera indisponibilidade explícita, nunca resultado Python simulado.

## Cliente HTTP

A aula API oferece GET/POST de `/tarefas` em simulação local claramente identificada, com JSON, status 200/201/404/422 e validação. Os dados duram a sessão do componente. O opt-in HTTP real aceita somente caminhos `/api/` desta origem, omite credenciais/cookies e usa timeout de oito segundos. Não implementa servidor nem execução remota de backend.

## Verificação executada

`npx vitest run aplicativos/web/src/laboratorios` cobre sanitização, CSP, escape de script/style, AST, loops, recursão, armazenamento, isolamento por perfil, backup e conflito. Os testes Chromium abrem iframe real e verificam JS, isolamento do pai, fetch bloqueado, remoção de script HTML, laço interrompido e evento funcional após esperar 1,4 segundo. Usam `CHROMIUM_PATH`, Chromium de sistema quando disponível, ou navegador Playwright instalado. Testes unitários não equivalem a teste de teclado físico/virtual Android.
