# Recuperação de código quando o armazenamento falha

## Problema
O armazenamento local pode falhar por cota excedida ou restrições do navegador. Antes, o laboratório não oferecia uma forma de recuperar o código que ainda estava na memória.

## Mudança
O laboratório distingue salvamento pendente, sucesso e falha. Em caso de erro, permite tentar novamente e baixar um JSON local com `aulaId`, `arquivos` e `snapshots` da sessão. A cópia não é enviada ao servidor; o download só acontece após ação do usuário. A edição continua em memória, sem apagar o projeto existente.

## Integração
`aplicativos/web/src/laboratorios/Laboratorio.tsx` usa `salvarProjeto` de `armazenamento.ts`. O JSON contém dados compatíveis com a estrutura de backup de um projeto. Nenhuma API nova ou migração de banco.

## Critérios de aceite
1. Simular `QuotaExceededError` em `Storage.prototype.setItem`.
2. Editar HTML e aguardar aviso de falha.
3. Confirmar disponibilidade do download e nome do arquivo.
4. Restabelecer gravação, clicar em tentar novamente e verificar código persistido.
5. Validar testes de navegador, build web e Android CI antes de integrar.

## Estado
Código e teste enviados em PR isolado; execução de CI para o commit final ainda não confirmada. Não houve APK, deploy ou validação física no Galaxy A35.
