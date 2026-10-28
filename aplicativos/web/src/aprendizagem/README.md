# Ensino guiado

`ExemplosGuiados` apresenta o código e as explicações do catálogo editorial com avanço por raciocínio/linha. A navegação não altera o conteúdo do CMS nem concede pontos. O callback opcional `aoConcluir` permite continuar para a etapa de fixação depois de explorar o último exemplo.

Cada uma das 20 aulas publicadas possui um experimento próprio. Os controles atualizam código, resultado e explicação ao mesmo tempo:

- HTML e CSS: marcação real num iframe de origem opaca, sem permissão de scripts, navegação superior ou envio de formulário. A CSP bloqueia rede; valores textuais são escapados e números limitados.
- JavaScript e DOM: modelos fechados calculam os mesmos efeitos mostrados no código; nunca usam `eval`, `Function` ou imports a partir de entradas. O contador responde a cliques reais.
- Python: rastreamento didático de tipos, acumuladores e dicionários. A interface informa que a execução real do programa do estudante acontece no laboratório.
- API: modelo local de método, status, validação e caminhos sucesso/falha. Não envia uma requisição de rede nem atribui um status inventado a um servidor real.

`PreparacaoDesafio` percorre missão, plano de ação e critérios reais declarados na aula. O checkbox final confirma entendimento e habilita a abertura do editor; não é um resultado de teste ou avaliação. `aoRever` volta à explicação e `aoIniciar` abre o laboratório.

Os componentes reiniciam seu estado ao trocar de aula, respeitam movimento reduzido, aceitam teclado e usam uma coluna em telas estreitas.

Verificação: `npx vitest run aplicativos/web/src/aprendizagem/aprendizagem.test.tsx` cobre as 20 aulas, condições de fronteira, tipos, escapes, isolamento do iframe, navegação pedagógica, contador e preparação do desafio.
