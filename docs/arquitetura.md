# Arquitetura

Monorepo React19/TypeScript/Vite7 para webPWA, reutilizado no APKCapacitor7. A API FastAPI usa SQLAlchemy2 e Alembic; SQLite no desenvolvimento e Postgres17 no Supabase em produção. A entrada `app.py` permite publicar API e arquivos estáticos no mesmo projetoVercel, preservando uma origem para o cliente web. Android carrega arquivos locais e usa o endereço canônico da API porHTTPS.

Catálogo versionado vive em JSON autoral e pode receber atualização do CMS. A cópia incorporada e o último catálogo público validado garantem leitura offline. IndexedDB guarda progresso, fila, pacotes e certificados por perfil; rascunhos do editor e snapshots possuem chaves por perfil/aula e participam da exportação/vinculação. ServiceWorker exclui dados autenticados do cacheHTTP.

Envios usam identificadores idempotentes. Offline ficam aguardando sincronização; somente resposta confirmada do servidor muda o estado para pendente. O administrador pode chamar GPT explicitamente ou revisar manualmente. A aprovação auditada permite emitir reconhecimento interno da aula. Não existe certificação automática porXP ou tempo de tela.

CodeMirror renderiza o editor e iframe isolado executa HTML/CSS/JS. Pyodide executa Python em Worker local. O serviço `executores/` é outro processo/host, opt-in e sem segredos nos containers; não há execução de código de aluno no processo da API.

Contratos: `contratos/tipos.ts`, `contratos/integracao.md`, modelos Pydantic e OpenAPI em `/docs`. Fontes/tokens/ícones são compartilhados. Documentos específicos descrevem as restrições de rede, voz, cache, execução e versão de teste Android.
