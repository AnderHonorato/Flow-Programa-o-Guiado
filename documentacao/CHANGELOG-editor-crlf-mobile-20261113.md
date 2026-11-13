# Editor Android — navegação CRLF

- Corrigida navegação por teclado rápido em arquivos Windows com quebra de linha CRLF (`\r\n`), sem posicionar o cursor entre os dois caracteres.
- Cursor deslocado externamente para o interior de CRLF é recuperado sem alterar conteúdo ou seleção persistida.
- Adicionados três testes de regressão para CRLF, LF e emoji adjacente.
- Preservados package ID, assinatura, versionCode e dados do aplicativo. Esta alteração não constitui APK homologado.

## Validação necessária

Executar testes Vitest, build web e Android, verificar assinatura e atualização preservando dados em emulador. Comparar certificado instalado no Galaxy A35 antes de qualquer distribuição.
