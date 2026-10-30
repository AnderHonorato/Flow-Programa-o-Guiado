# Revisão independente de QA

Data: 27/10/2026. Ambiente inicial: Chromium Playwright, desktop 1440×1000 e celular 390×844, Vite em 127.0.0.1:4173 e API em 8000. Revisão conduzida contra o prompt mestre do pacote fornecido. Os resultados abaixo diferenciam evidência executada, inspeção e limitação.

## Evidências executadas

- `testes/acessibilidade/revisar-ui.mjs`: 16 combinações de início/trilhas/aula/perfil, desktop/celular e claro/escuro, com capturas PNG e axe-core. Log:`testes/acessibilidade/resultado-auditoria.log`. Detalhes:`testes/acessibilidade/evidencias/resultado-ui.json`.
- Em todas 16 telas a largura do documento coincide com viewport (1440 ou 390px), sem rolagem horizontal da página.
- Primeira rodada E2E(`resultado-e2e.log`): 2 passaram(catálogo e tema), 4 falharam(home e fluxo em ambos dispositivos), 2 ignorados justificadamente(cache de produção não existe no Vite DEV).
- Rodadas de diagnóstico do fluxo não são aprovação final: uma falha foi o teste pressupor 4 verificações enquanto o catálogo passou a conter 5; outra rodada sofreu reload do Vite durante edição concorrente. O log final será registrado após estabilização.

## Problemas encontrados e encaminhados

| Gravidade | Problema e efeito | Evidência | Estado |
|---|---|---|---|
| Média | Início rotula o destaque HTML, mas abre“Do arquivo à página”. O primeiro item com linguagem HTML pertence à trilha Fundamentos. | Teste“início recomenda a aula HTML inicial” + catálogo `fundamentos-caminho-web` | Encaminhado ao principal; usar id `html-primeira-pagina`. |
| Alta para acessibilidade | Contraste de texto secundário no tema claro é 4,23:1, abaixo de 4,5:1. Tags no editor: 3,67:1. | Axe `color-contrast` em resultado-ui.json | Encaminhado para ajuste de tokens/syntax. |
| Média | Exemplo com rolagem horizontal no celular não recebe foco de teclado. | Axe `scrollable-region-focusable` claro e escuro | Encaminhado; foco acessível no `pre`. |
| Média | Modal de conta originalmente mantém foco no botão atrás e permite Tab fora; Escape não fecha. | Interação `modal-conta-teclado` | Principal implementando correção; requer rechecagem. |
| Média | Navegação mobile sem estado expandido e Escape não fecha. | Interação `menu-celular` | Encaminhado. |
| Média | Abas de aula sem ligação tab/painel e sem setas/roving tabindex. | Interação `abas-aula` | Encaminhado. |

## Falhas de teste corrigidas

- Menu lateral mobile fica fora da tela até“Abrir navegação”; o auxiliar agora abre o menu antes de clicar.
-“Em produção editorial” aparece dentro de trilha expandida; teste passou a expandir HTML.
- `fill()` no contenteditable CodeMirror teve comportamento inconsistente na emulação móvel. Edição agora usa seleção pelo teclado e `insertText`, conferindo texto completo no editor.
- Remontagem do laboratório agenda atualização automática da prévia; o teste aguarda estado“Prévia atualizada” antes de testar.
- Auditoria usava botão inexistente“Enviar para revisão”; corrigido para“Enviar desafio”.
- `addInitScript` da auditoria tentava acessar localStorage do iframe sandbox; corrigido para executar apenas em `window===window.top`. Esses erros eram instrumentação, não acesso indevido pelo produto.

## Cobertura e limites

O novo E2E verifica perfil local, catálogo HTML, edição real HTML/CSS/JS dentro do iframe, sandbox sem mesma origem, alternativa errada/certa e feedback, verificações objetivas, registro sem XP duplicado, fila offline sem aprovação automática, persistência após recarga e tema. Um teste separado exige `/sw.js` real para reabrir sem internet em produção. Conta real, revogação de sessão e bloqueio 403 de admin têm teste próprio. Nenhum teste simula resposta de GPT.

A revisão inicial não encontrou certificados. A integração posterior adicionou página própria de certificados internos, com origem em aprovação administrativa no servidor, exportação HTML e impressão. O teste de conta agora verifica que uma conta sem aprovação não recebe certificado; emissão positiva depende da evidência de API e dos testes específicos desse módulo. Registrar competência e contar XP não substitui aprovação pedagógica final. Execução Python offline e pacotes possuem evidência específica da equipe em `testes/offline/evidencias/pacotes-producao.json` (não produzida por este revisor). Integração GPT real, instalação APK, teclado Android físico, sincronização entre dispositivos e recuperação por e-mail dependem de evidências específicas do restante da equipe e não são certificados por esta revisão.

Atributo `sandbox="allow-scripts"` é checado no E2E; isolamento completo (CSP, rede, timeouts, postMessage e proteção contra travamento) exige testes de segurança do laboratório além dessa checagem. RBAC e isolamento entre contas exigem os testes de API/armazenamento, não apenas esconder o botão admin.

Isolamento no hook de aplicação: `aplicativos/web/src/componentes/useFlow.test.tsx` cobre local10XP → contaA50XP/projeto privado → logout local10XP/fila vazia → contaB10XP/sem dadosA, preservando dadosA. O colega responsável relatou essa cobertura; o log de testes integrado do principal é a evidência de execução.
