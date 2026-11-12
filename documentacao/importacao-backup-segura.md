# Importação segura de backups

## Problema
A importação gravava cada aula imediatamente. Uma falha de cota na segunda aula podia deixar a primeira modificada, sem indicar quais projetos haviam sido importados.

## Alteração
A função `importarProjetos` valida o arquivo inteiro, rejeita aulas duplicadas, prepara as alterações em memória e registra os valores anteriores. Se uma gravação falhar, tenta restaurar todas as alterações já feitas, preservando as edições anteriores. Se a restauração também falhar, informa explicitamente o risco e recomenda exportar uma cópia.

## Integração
Entrada: lista validada de projetos com arquivos e snapshots. Saída: número de aulas importadas ou erro em português. Mantém a API pública, o esquema `v1` e o limite de 20 snapshots.

## Validação
Testes unitários cobrem falha simulada de quota na segunda gravação, restauração da primeira aula e rejeição de aulas duplicadas antes de gravar. Executar `npm test` e `npm run build` no CI. A API localStorage não fornece transações reais: uma falha persistente durante o rollback ainda pode exigir recuperação manual.
