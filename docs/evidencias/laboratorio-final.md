# Laboratório: evidência de revisão de 27/10/2026

Ambiente: Linux, Chromium de sistema em `/usr/bin/chromium`, React19, Vite7, Pyodide0.29.3 provisionado localmente. Nenhum teste aqui depende de um resultado Python simulado.

## Regressões reproduzidas antes da correção

- `npx vitest run aplicativos/web/src/laboratorios/Laboratorio.browser.test.ts`: o teste recebeu dois resultados aprovados; após 650 ms, a lista tinha zero itens. A prévia automática pendente apagava o resultado de Testar. Após corrigir, preserva os itens ao executar e invalida ao editar/restaurar.
- `npx vitest run aplicativos/web/src/laboratorios/sandbox.browser.test.ts -t 'exige a propriedade'`: o teste declarou `json:nomes`, mas um array igual em `outra` era aceito pela busca textual. A comparação estrutural agora exige a propriedade e o tipo corretos.

## Comandos finais executados

`npm run typecheck`: exit0.

`python3 conteudos/fontes/gerar_catalogo.py`: 10 trilhas,60 módulos estruturais,20 aulas publicadas e80 atividades autorais. Não contabiliza os40 módulos em produção como aulas publicadas.

`python3 conteudos/verificadores/auditar_catalogo.py`: exit0; integridadeEditorial=true; erros=[];6 exemplos Python executados e18 exemplos JavaScript com sintaxe verificada.45 verificações objetivas declaradas. Verificação adicional confirmou20/20 aulas com testes declarados e saída esperada não vazia nos testes Python.

`npm test`: exit0;15 arquivos passaram;60 testes passaram; duração61.70s na rodada final.

Trechos da rodada final:

```text
Laboratorio.browser.test.ts (4 tests) 25851ms
  preserva verificações após executar novamente e invalida ao editar ou restaurar
  executa Python local real e mostra erro real sem aprovar o teste
  mantém contraste mínimo de 4.5 no realce do código nos dois temas
  só envia código ao executor após consentimento e clique explícito
sandbox.browser.test.ts (5 tests) 8196ms
  executa JS real, impede acesso ao pai e entrega testes do DOM
  bloqueia fetch e imagens externas pela CSP e remove script HTML
  interrompe laço infinito com erro acionável
  mantém eventos funcionais depois de o usuário aguardar
  verifica arrays JSON e exige a propriedade declarada no relatório
Test Files 15 passed (15)
Tests 60 passed (60)
```

## Limites da evidência

O teste do cliente remoto intercepta uma resposta503: confirma opt-in, autenticação e apresentação da indisponibilidade, não execução de contêiner. Essa execução tem testes próprios em `executores/testes/`. Os testes de contraste amostram o realce HTML dos dois temas. Chromium desktop não equivale a teclado Android físico, teste completo de memória ou certificação contra código hostil. Limites de iframe/Pyodide e de relatórios declarativos estão descritos em `docs/laboratorios.md`.
