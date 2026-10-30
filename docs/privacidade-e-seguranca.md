# Privacidade e segurança

As senhas são verificadas com Argon2id no servidor; sessões usam tokens aleatórios armazenados por resumo SHA256 e são revogáveis. O aplicativo guarda sessão no sessionStorage, não senha ou chave de IA. O servidor consulta o papel e o proprietário do registro a cada operação. Cadastro público nunca concede administração.

O banco de produção pertence ao projeto exclusivo Flow, organização honorato.tech, região SãoPaulo. Tabelas ficam no schema privado `flow`, sem permissão de DataAPI para `anon`/`authenticated`, com RLS e papel exclusivo do backend. O papel de execução não pode criar estruturas. Credencial do banco é variável sensível da Vercel, não arquivo de código. Migrações foram aplicadas antes do runtime serverless, que usa NullPool e prepared statements desativados para Supavisor.

IndexedDB e rascunhos separam perfis; exportação de dados pode conter o código e texto do aluno. O usuário deve guardar suas cópias com cuidado. Sessão expirada preserva o trabalho e solicita reautenticação. O navegador pode remover armazenamento não persistente; o perfil permite solicitar proteção e exportar cópia.

O iframe tem origem opaca, sandbox sem same-origin, CSP sem rede e limpeza de HTML ativo. Instrumentação de laços/funções orienta limites no DOM. Ela não transforma o navegador em sandbox de servidor com cotas rígidas de memória. Python usa Worker descartável, prazo de execução e restrições de APIs; os limites e testes estão no relatório do laboratório.

O controlador remoto é separado da API e desativado por padrão. Containers de aluno não recebem segredos, volume do host ou socketDocker; limites de CPU/memória/processos/rede/saída são aplicados. O controlador exige host dedicado, pois quem controla o socketDocker tem alto privilégio sobre esse host. Não o hospede junto ao banco ou a serviços com segredos.

CorreçãoGPT só é acionada por administrador autenticado. O servidor reduz o contexto e valida o retorno estruturado; falha não aprova. Confiança do modelo não substitui revisão humana. Os testes do SDK usam transporte controlado; a credencial real ainda precisa ser configurada na hospedagem.

A primeira versão não tem provedor de recuperação de senha/e-mail configurado. Contas não devem ser anunciadas como verificadas por e-mail. Configurar um provedor e retenção/backup antes de operação institucional ampla. Métricas transitórias de processo podem reiniciar com coldstarts; dados de usuários/progresso/tentativas permanecem no Postgres.

Os anexos visuais incluem marcas de terceiros apenas como referências. A identidade, os ícones e o mascote do Flow são próprios; fontes e runtime acompanham as respectivas licenças.
