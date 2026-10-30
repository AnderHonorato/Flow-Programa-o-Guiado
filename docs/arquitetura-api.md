# API persistente e correção administrada

A implementação usa FastAPI, SQLAlchemy 2, Alembic, Argon2id e SDK oficial OpenAI. SQLite atende desenvolvimento e uma instância; Postgres é a configuração indicada para produção. O backend nunca executa código de aluno. Não existe conta administrativa padrão nem senha embarcada.

## Executar

Na raiz do monorepo:

```sh
python -m pip install -r servidor/requirements-desenvolvimento.txt
python -m servidor.administrar migrar
python -m servidor.administrar criar-admin --email admin@exemplo.com --nome Ander
python -m uvicorn servidor.principal:app --host 0.0.0.0 --port 8000
python -m pytest -c servidor/pytest.ini servidor/testes -q
```

A CLI solicita senha sem eco e registra a ação. Ao promover conta existente, altera a senha e revoga suas sessões anteriores. Não há endpoint para autopromoção. O processo lê variáveis do ambiente; arquivos `.env` precisam ser carregados pelo terminal/provedor, não são carregados implicitamente. Referência em `.env.exemplo`.

Migrações também são aplicadas no início da API. O comando Alembic é `python -m alembic -c servidor/alembic.ini upgrade head`. Para inspecionar reversão em banco descartável, `downgrade base`; a reversão inicial remove tabelas e exige backup antes de qualquer uso operacional. O teste cria, reverte e reaplica o esquema em um banco separado.

`servidor/Dockerfile` empacota API; `servidor/Dockerfile.completo` compila React e empacota API + site. O contexto é a raiz do repositório. SQLite dentro do contêiner usa `/dados/flow.db` e precisa de volume persistente; sem volume, use Postgres externo em `DATABASE_URL`. Dockerfile usa usuário sem privilégios. `PORT` é respeitada. Build web já presente é servido na raiz; rotas `/api/*` inexistentes continuam JSON 404.

## Identidade e acesso

`POST /api/contas` recebe `{nome,email,senha}` e retorna 201 com `{token,usuario:{id,nome,email,papel}}`. `POST /api/sessao` recebe `{email,senha}` e retorna o mesmo formato. Senha tem entre 10 e 128 caracteres. E-mail é normalizado. Campos extras como `papel` são recusados. `GET /api/eu` retorna o usuário e `DELETE /api/sessao` revoga imediatamente a sessão atual (204).

O cliente envia `Authorization: Bearer TOKEN`. O token opaco usa 48 bytes aleatórios; o banco guarda somente SHA-256 do token e validade. A senha usa Argon2id via biblioteca consolidada. Sessão expirada ou revogada retorna 401, aluno em rota administrativa retorna 403. Login/cadastro têm limite de 20 requisições/minuto/IP por processo. Em múltiplas réplicas, usar limitador compartilhado no proxy. Configure HTTPS no provedor e origens CORS explícitas. Corpo máximo 2 MB e arquivos máximos 100 mil caracteres cada.

Recuperação de senha por e-mail não está configurada: não existe botão/API que simule envio. Nenhuma chave OpenAI é devolvida ao cliente.

## Progresso e conflitos

`GET /api/progresso` e `PUT /api/progresso` retornam:

```json
{
  "estado": {
    "aulasConcluidas": ["html-1"],
    "respostas": {"html-q1": true},
    "revisoes": {"html-1": {"etapa": 1, "proxima": "2026-10-28T12:00:00Z"}},
    "xp": 110,
    "ultimaAula": "html-1"
  },
  "versao": 2,
  "conflitos": [],
  "eventosRecebidos": ["evento-dispositivo-1"]
}
```

Payload exato de PUT (estado e eventos são opcionais e podem ser enviados juntos):

```json
{
  "versaoBase": 1,
  "estado": {
    "aulasConcluidas": ["html-1"],
    "respostas": {"html-q1": true},
    "revisoes": {},
    "xp": 110,
    "ultimaAula": "html-1"
  },
  "eventos": [{
    "id": "evento-dispositivo-1",
    "tipo": "aula_concluida",
    "alvo": "html-1",
    "criadoEm": "2026-10-25T12:00:00Z"
  }]
}
```

Tipos de evento: `aula_concluida` usa `alvo=aulaId`; `resposta` usa `alvo=questaoId,valor=boolean`; `revisao` usa `alvo=aulaId,valor={etapa,proxima}`; `ultima_aula` usa `alvo=aulaId`. Datas são ISO 8601. IDs são únicos por usuário. Repetir evento idêntico não concede XP adicional nem incrementa versão. Reusar ID para outro conteúdo retorna 409 e reverte a transação inteira. Limite de 500 eventos por lote; IDs até 100 caracteres.

Merge faz união das aulas, mantém evidência de resposta correta e maior etapa/data de revisão. Respostas divergentes e versões diferentes da revisão são retidas em `conflitos`; eventos originais ficam no banco. `ultimaAula` usa a última informação não vazia recebida. `versaoBase` informa o contexto do dispositivo; uma versão antiga é mesclada em vez de rejeitada. XP é recalculado no servidor: 100 por aula única e 10 por resposta correta única. `xp` enviado pelo dispositivo não é confiado. Progresso local é autodeclarado para continuidade de estudo, não constitui certificado de avaliação pedagógica. Aprovação administrativa também registra conclusão. Código completo e tentativas não são mesclados destrutivamente.

SQLite usa `BEGIN IMMEDIATE` nas escritas; Postgres usa bloqueio do usuário nas transações de sincronização. Cada leitura é filtrada pelo dono autenticado, sem aceitar um `usuarioId` arbitrário do cliente.

## Tentativas e avaliação

`POST /api/tentativas`:

```json
{
  "id": "uuid-gerado-no-dispositivo",
  "aulaId": "html-1",
  "arquivos": {"html": "<h1>Olá</h1><p>Texto</p>", "css": "", "js": "", "python": null},
  "criadaEm": "2026-10-25T12:00:00Z"
}
```

A aula deve existir em módulo publicado. A API guarda instantâneo do enunciado/rubrica e versão do catálogo recebida. Retorna 201 com `{id,idServidor,usuarioId,aulaId,arquivos,criadaEm,recebidaEm,status,feedback,enunciado,versao}`. `id` é o ID do dispositivo, único por dono; `idServidor` é global. Repetir conteúdo/ID devolve a mesma tentativa. Mesmo ID com novo código retorna 409, preservando a versão anterior. `GET /api/tentativas` devolve array somente das próprias tentativas, paginado com `limite` (1–500, padrão 100) e `deslocamento`.

Estado inicial é `pendente_validacao`. O servidor não chama GPT no envio nem na sincronização. Sem conexão, o cliente mantém `aguardando_sincronizacao` na fila local. `GET /api/admin/tentativas` aceita filtros `status`, `usuarioId`, `aulaId`, `inicio`, `fim`, `limite` e `deslocamento`.

Um administrador aciona `POST /api/admin/tentativas/{idServidor}/corrigir`, com corpo opcional `{confirmarReavaliacao:false}`. Tentativa já avaliada exige `true` para nova avaliação. O adaptador usa `responses.parse`, JSON Schema do Pydantic, `store:false`, timeout de 40 segundos e sem retries automáticos. Envia objetivo, enunciado, rubrica e arquivos; não envia nome, e-mail ou usuário. Os arquivos são tratados no prompt como dados não confiáveis. Resultado malformado, timeout, erro de fornecedor ou ausência de chave retorna 503, limpa a marca de processamento e mantém o resultado anterior (pendente em novas tentativas). Nenhuma falha aprova aluno.

A avaliação válida retorna:

```json
{
  "nota": 8.5,
  "criterios": [{"criterio": "Título principal", "atendido": true, "observacao": "h1 presente."}],
  "pontosFortes": ["Conteúdo organizado."],
  "falhas": [],
  "dicas": ["Experimente adicionar uma seção."],
  "proximaRevisaoDias": 3,
  "confianca": 0.9,
  "limites": "Análise estática; código não executado.",
  "aprovado": true
}
```

Nota é 0–10; confiança 0–1; revisão 1–90 dias. Aprovação GPT exige nota ≥ 7, todos critérios atendidos e confiança ≥ 0,7; senão vira `revisar`. `aprovado:true` gera estado `aprovada` e registra progresso. Análise estática não substitui teste objetivo do laboratório nem garante execução correta. O servidor registra solicitação, erro ou conclusão em auditoria. Uma marca temporal impede correções simultâneas; após interrupção, pode ser retomada após dois minutos. Revisão humana feita durante uma chamada tem prioridade: resultado GPT atrasado recebe 409 e é descartado.

`PATCH /api/admin/tentativas/{idServidor}` recebe `{status,feedback,justificativa,versaoBase?}`. Status permitido: `aprovada`, `revisar`, `pendente_validacao`; feedback usa schema acima; justificativa tem mínimo 5 caracteres. `versaoBase` obsoleta devolve 409. Feedback, justificativa e autor são auditados. Histórico de feedback GPT fica na auditoria; revisões não apagam código enviado.

## CMS e observabilidade

`GET /api/admin/catalogo` retorna `{catalogo,versao}`. `PUT /api/admin/catalogo` recebe `{catalogo,versaoBase}`. O esquema é o definido em `contratos/integracao.md`; valida aulas completas, ao menos dois exemplos/questões, resposta única correta, rubricas e identificadores. Módulo publicado vazio é recusado. O banco acrescenta versão imutável; versão anterior na escrita causa 409. `GET /api/admin/catalogo/versoes` lista últimas 100 versões. Para arquivar, remova da versão atual ou retorne o módulo a `em_producao`; versões anteriores permanecem. `GET /api/catalogo` fornece o catálogo atual aos clientes online; o arquivo JSON é a origem inicial e fallback offline. Questões são formativas e suas respostas acompanham aulas offline; não use o catálogo público para exames sigilosos.

`GET /api/admin/usuarios` lista contas sem hashes. `GET /api/admin/metricas` conta usuários, tentativas por estado, aulas concluídas, questões ainda com erro e estatísticas HTTP reais do processo. Métricas HTTP reiniciam com processo; métricas pedagógicas vêm do banco. `GET /api/admin/auditoria` lista ações recentes. Nenhum log inclui senhas, tokens ou chave. `GET /api/saude` verifica conexão com banco e informa se GPT está configurado, sem expor credencial.

## Evidências e limites

Os testes em `servidor/testes/teste_api.py` usam HTTP real da aplicação com banco SQLite temporário migrado. Cobrem cadastro, Argon2id, expiração/revogação, RBAC, tentativa de autopromoção, isolamento entre contas, IDs repetidos/conflitantes, sincronização, concorrência, CMS incompleto/versões, revisão humana, auditoria/métricas, reversão/reaplicação de migrações e limites.

O SDK oficial OpenAI é exercitado por `httpx.MockTransport`: avalia serialização/JSON Schema, respostas válidas, formato inválido, nota inválida, erros 429/500, baixa confiança, minimização de dados e persistência pendente. Esse teste não usa rede nem finge correção real do fornecedor. Nesta entrega não foi fornecida `OPENAI_API_KEY`; chamada GPT real permanece não verificada até configurar credencial exclusivamente no servidor e realizar avaliação manual. Não há execução remota de backend para código de aluno nesta API; esse executor deve ser um serviço isolado separado.

Resultados executados em 25/10/2026 neste ambiente: **18 testes aprovados com SQLite** e **18 aprovados com Postgres 17 real em contêiner**, incluindo envios concorrentes e revisão humana durante correção. `python -m compileall -q servidor` passou e `python -m pip check` informou ausência de dependências quebradas. Houve somente aviso de depreciação do transporte TestClient/httpx da versão Starlette instalada; sem falhas. O contêiner Postgres de testes foi removido após a execução.

Para repetir contra Postgres descartável, configure `FLOW_TESTE_POSTGRES_URL=postgresql+psycopg://usuario:senha@host/banco_testes` e execute o mesmo pytest. A conta precisa poder criar/remover schemas: cada caso usa schema aleatório e o remove ao terminar. Não use uma conta de produção para testes.

Em runtime serverless ou pooler transacional Postgres, configure `BANCO_POOL_NULO=1`: a API usa SQLAlchemy NullPool e desativa prepared statements do psycopg. A migração deve rodar na etapa de release; após isso é possível configurar `MIGRAR_AO_INICIAR=0` no runtime para evitar migrações concorrentes em cold starts. A configuração padrão continua aplicando migrações na inicialização.

Em rede com CA corporativo, os Dockerfiles aceitam secret BuildKit opcional: `docker build --secret id=ca_cert,src=/etc/ssl/certs/ca-certificates.crt -f servidor/Dockerfile -t flow-api .`. O certificado é montado apenas durante instalação; não se desativa verificação TLS nem se incorpora credencial.
