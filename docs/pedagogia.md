# Diagnóstico e reconhecimento interno

O diagnóstico é opcional e tem cinco questões: escolha de estrutura HTML, verdadeiro/falso sobre CSS, previsão de saída JavaScript, completar uma seleção DOM e encontrar um bug Python. Cada resposta recebe explicação. A primeira lacuna recomenda uma aula publicada da trilha correspondente; com cinco acertos, a sugestão é aplicar a base em funções JavaScript. Começar do zero, pular e explorar outras trilhas permanecem disponíveis. O resultado não bloqueia aulas, não muda XP e não declara domínio ou aprovação formal.

`Diagnostico` recebe `{aoAbrir: (aula: Aula) => void, aoPular: () => void}`. A recomendação usa o catálogo incluído, com apenas módulos publicados. O fluxo principal deve oferecer o diagnóstico no início e permitir refazê-lo.

`Certificados` recebe `{flow: Flow}` e pode ser incluído no perfil. Ele consulta `GET /api/certificados` com o token autenticado e guarda a última resposta recebida em IndexedDB, isolada por perfil. Falhas, sessão expirada e modo offline mantêm essa cópia com aviso de possível desatualização. Resposta vazia válida substitui a cópia anterior, permitindo refletir uma revogação. Uma cópia local pode ter sido alterada pelo dono do dispositivo e não é uma assinatura digital ou verificação pública.

## Regra do servidor

A montagem é `app.include_router(criar_rotas_certificados(autenticar, banco))`, com import de `servidor.rotas.certificados`. As dependências são as mesmas funções de autenticação e banco já usadas pela API. Não há tabela ou migração adicional.

A rota filtra tentativas do usuário autenticado cujo estado atual é `aprovada`, exigindo também auditoria de aprovação `revisao_humana` ou `gpt_concluido` atribuída a administrador. A correção GPT já é iniciada explicitamente pelo administrador. Estado local, XP, diagnóstico, tentativa pendente, feedback com aprovação isolada e alteração de progresso nunca bastam. Sem auditoria válida não há emissão.

O documento usa título e objetivo do enunciado capturado no envio, titular autenticado, data da primeira auditoria de aprovação e código determinístico da tentativa no servidor mais essa data. O código identifica o registro interno; não é assinatura criptográfica nem consulta pública de autenticidade. Uma tentativa atualmente revogada deixa de aparecer na consulta. Nova consulta substitui a cópia offline, que pode continuar desatualizada enquanto não houver conexão.

O reconhecimento abrange apenas uma aula/oficina aprovada. Nunca declara trilha inteira concluída, especialmente quando existem módulos em produção. Não equivale a diploma ou certificação profissional. Exportação e impressão usam HTML com todos os campos escapados e política de conteúdo que bloqueia scripts e recursos externos.
