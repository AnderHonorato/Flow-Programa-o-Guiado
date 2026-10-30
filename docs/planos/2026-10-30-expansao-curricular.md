# Expansão curricular — 0.6.0

Continuação do plano mestre autorizado, após a entrega 0.5.0. O inventário inicial tem20 aulas em20 módulos e80 atividades. O próximo lote publica uma aula nova em cada uma das10 trilhas, ocupando módulos que estavam em produção. As20 aulas existentes preservam IDs, questões e conteúdo para não alterar provas já enviadas.

## Comportamento esperado

Cada aula apresenta contexto, objetivo, pré-requisitos, ensino dividido em blocos, dois exemplos comentados linha a linha, experimento próprio, preparação do desafio, duas questões definitivas, laboratório verificável, variação, pistas e rubrica. A primeira escolha permanece travada; nota e explicações só aparecem ao enviar a avaliação. Usar laboratório antes da prova continua permitido; conclusão mantém os critérios anteriores.

Conteúdos: algoritmos, tabelas HTML acessíveis, CSS Grid, escopo JavaScript, formulários DOM, arquivos JSON em Python, estado de interfaces, validação de API, sessão/autorização e calculadora. Experimentos variam entradas limitadas e explicam os resultados. Python é rastreado no experimento e executado no runtime real do laboratório. HTTP/sessão locais são identificados como simulações, sem alegar servidor ou autenticação reais.

## Implementação

Preservar React/TypeScript/Vite/Capacitor e API FastAPI atuais. Três fontes editoriais independentes registram as novas aulas no gerador; catálogo/inventário continuam gerados e auditáveis. Soluções de QA ficam somente nas fontes de teste, sem referência no bundle do aluno. Novos modelos e planos ligam os controles ao conteúdo de cada aula. Nenhuma migração de banco é necessária.

Corrigir o isolamento do laboratório para impedir submissão/navegação no evento submit, preservando cliques, rótulos e seleção de controles dentro dos formulários. CSP e sandbox continuam bloqueando rede/origem.

## Validação e entrega

Auditar integridade editorial, dependências, exemplos Python e sintaxe JavaScript. Exercitar código inicial e solução de cada aula no laboratório real, em desktop/celular: inicial deve falhar pelo menos um objetivo e solução satisfazer todos. Cobrir regressão de formulário, tipos, suite frontend/API, build, acessibilidade e offline pertinentes. Compilar APK code6, verificar assinatura/conteúdo, publicar no mesmo endereço somente depois da validação, preservar main e PR aberto e atualizar entregas no Drive.

A meta completa continua180 aulas/450 atividades;30 aulas/120 atividades representam este lote, sem contar planejamento como entrega. Conteúdo ainda sem aula conserva o rótulo em produção editorial. Chave GPT, infraestrutura de execução remota e validação física Android continuam dependentes das condições registradas no README.
