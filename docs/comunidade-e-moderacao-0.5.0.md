# Comunidade, administração e experiência — 0.5.0

O link público permanece https://flow-programacao-guiada-anderhonoratos-projects.vercel.app e funciona fora da rede local. A barra lateral oferece **Compartilhar app**, com endereço copiável e abertura do app online.

## Comunidade e ranking

A barra lateral inclui **Comunidade e ranking**. Somente contas autenticadas e ativas consultam a lista, busca, paginação e perfis com XP sincronizado, nível, aulas concluídas, leituras registradas e reconhecimentos internos. E-mails, fotos pessoais e informações de moderação ficam fora dessa resposta. O ranking é ordenado por XP, quantidade de aulas concluídas e identificador para desempate.

Uma leitura conta após 20 segundos visíveis na etapa Aprender, uma vez por abertura da aula. O evento fica numa fila IndexedDB separada por perfil e é enviado de forma idempotente quando há conta/conexão. A visita é um indicador de uso; não prova compreensão, não acrescenta XP e não funciona como mecanismo antifraude. Progresso legado/offline mantém sua compatibilidade. Certificados continuam derivados exclusivamente de aprovação administrativa auditada, sem equivalência a diploma.

## Opinião ao fim da aula

Cada aula oferece pontuação de 1 a 5 estrelas e comentário. O aluno envia por uma conta conectada e pode atualizar sua opinião; o rascunho permanece separado por perfil/aula na sessão do navegador. **Administração → Opiniões das aulas** mostra autor, aula, estrelas, comentário, datas, média e busca/paginação. Essa opinião não altera a prova definitiva, a nota acadêmica nem o XP.

## Gestão de usuários e acesso

**Administração → Usuários** permite listar, buscar e consultar a aprendizagem, banir, inativar ou reativar contas com motivo e prazo. Há opções por horas, dias ou sem prazo. As ações são autorizadas e auditadas no servidor. O aluno recebe motivo e prazo após informar credenciais corretas ou quando sua sessão já aberta faz nova consulta.

Banir/inativar revoga todas as sessões existentes. Cada pedido autenticado verifica o estado atual. O cliente verifica GET/eu a cada 20 segundos enquanto visível e ao retomar foco; também trata bloqueios devolvidos pelas outras chamadas. A sessão sai da interface preservando trabalho local da conta, separado do perfil visitante. Sem rede não existe expulsão remota instantânea; os pedidos ao servidor já são recusados. Fim do prazo/reativação permitem novo login, mas não restauram tokens antigos.

Excluir aluno exige confirmação do e-mail e motivo; remove conta, sessões, progresso, envios, leituras e opiniões. O histórico administrativo necessário é preservado com vínculo pessoal nulo. A própria conta administrativa não pode ser restringida/excluída pela interface; contas administrativas não são apagadas, preservando autoria e certificados. Todas as ações destrutivas exigem operação explícita; não são executadas por automação sobre usuários reais durante a entrega.

## Entrada e conquistas

A entrada ficou mais visual, com arte autoral e texto curto. Continua possível começar no dispositivo ou entrar na conta. O carregamento de entrada acompanha operações reais: credenciais, validação de sessão/permissões e abertura do progresso. Não há percentual fictício nem alegação de antivírus ou detecção universal de roubo de dados.

Conquistas têm categorias Inicial, Rara, Épica e Lendária, com camadas visuais, órbitas, cristais e partículas progressivas. As revelações terminam em até três segundos, respeitam movimento reduzido e preservam fila, datas, replay e XP.

## API e migração

Novas rotas: GET /comunidade e /comunidade/{id}; GET /admin/usuarios e /admin/usuarios/{id}; PATCH /admin/usuarios/{id}/estado; DELETE /admin/usuarios/{id}; POST /leituras; GET/PUT /aulas/{id}/avaliacao; GET /admin/avaliacoes-aulas (todas sob /api).

Migração Alembic `8510c0a5e001`, aditiva sobre `7101d6a5cf57`. Adiciona estado/motivo/prazo de conta, revogação de sessão e tabelas leituras/avaliacoes_aulas. PostgreSQL de produção foi migrado numa transação usando `servidor/migracoes/0.5.0-postgres-flow.sql`, no schema privado flow. RLS ativo, acesso concedido somente ao backend; anon/authenticated não têm leitura direta. Advisors de segurança sem avisos na conferência. A API anterior permaneceu saudável após a migração.

O login mantém limites por origem e acrescenta oito tentativas inválidas por identificador em cinco minutos, persistidas em auditoria com identificador resumido. Senhas e tokens não entram nesse registro. Operações com corpo, inclusive DELETE, respeitam o limite de 2 MB.

Após aplicar restrições, um rollback de código deve manter a verificação de acesso da versão 0.5; autenticação antiga não entende os novos bloqueios. O downgrade estrutural foi testado em banco local, mas não é um procedimento para desfazer moderação em produção.

## Verificação

175 testes frontend, 78 API e 34 fluxos E2E aprovados, incluindo opinião entre aluno/admin, leitura real sincronizada, bloqueio de sessão aberta, reativação sem ressuscitar token, exclusão protegida e login visual. Verificação de tipos e build de produção aprovados.

QA visual controlado: 18 estados de entrada/recompensas, 56 estados dos novos componentes e 24 estados integrados, em 320/390/768/1440 px, temas claro/escuro; zero violações axe, overflow ou erros JavaScript. Os dados desses cenários são de teste. E2E usa API/banco local reais; seus relógios virtuais avançam os períodos de leitura/verificação sem mudar a lógica do produto.

Android: versão 0.5.0/code5, APK de teste 10.652.421 bytes, SHA256 `29ab9cc3683effb95c1618a1fbd1f6d0e0c7f63941b1079313e7cb8e4a12d9cb`. Mesma assinatura debug; 52 arquivos web comparados byte a byte, sem diferenças. Lint: zero erros/oito avisos. Execução em aparelho/emulador estável e audição física continuam pendentes. Os limites editoriais/GPT/executor descritos no README permanecem.

## Publicação conferida

Deployment de produção `dpl_5F52seL4Nr8CXaZvCzefDkx9oNXE`, READY, aplicação `6897a47af1734f71fce8da6439b2c163f09a27af`. [App público](https://flow-programacao-guiada-anderhonoratos-projects.vercel.app) · [APK 0.5.0](https://github.com/AnderHonorato/Flow-Programa-o-Guiado/releases/tag/v0.5.0-teste).

A API pública foi exercitada com duas contas temporárias próprias: leitura idempotente, opinião visível à administração e isolada entre contas, proibição de moderação por aluno, banimento com motivo/prazo, inativação, reativação sem restaurar token e exclusão com confirmação. As duas contas temporárias foram removidas e a sessão administrativa de teste encerrada. Nenhuma conta real foi moderada pela verificação.

O site publicado passou em seis telas móveis/desktop (entrada, comunidade de visitante e opinião da aula): axe0, overflow0, erros JavaScript0. O link de compartilhamento foi conferido. O APK público foi baixado e o SHA256 confirmou os bytes locais. Evidências em `producao-api.json`, `publicado/` e `download-release.json`.

A consulta final ao PostgreSQL confirmou zero contas temporárias restantes. A CI usa fixtures SQLite para as contas de cenário, preservando o teste separado de cadastro público e evitando colisões entre testes no limitador real de autenticação. [Execução da CI](https://github.com/AnderHonorato/Flow-Programa-o-Guiado/actions/runs/40950177173). O commit posterior à aplicação altera somente a preparação dos testes; o bundle público e o APK continuam os mesmos.
