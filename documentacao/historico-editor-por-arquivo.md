# Histórico de edição por arquivo

## Defeito
Ao alternar entre index.html, style.css e script.js, o CodeMirror destruía a visão e recriava o estado, apagando o histórico de desfazer. O botão Desfazer deixava de recuperar alterações anteriores daquele arquivo.

## Correção
- `aplicativos/web/src/laboratorios/EditorCodigo.tsx`: conserva o `EditorState` por arquivo durante a vida do componente, incluindo histórico e seleção; restaura o estado apenas se o texto persistido ainda corresponder. Alterações externas usam `Transaction.addToHistory.of(false)`, para não contaminar o desfazer do usuário. O listener ignora notificações de uma aba que já não está ativa.
- `aplicativos/web/src/laboratorios/Laboratorio.browser.test.ts`: teste de alternância HTML → CSS → HTML → CSS com desfazer independente.

## Critérios de aceite
1. Editar HTML, mudar para CSS e voltar ao HTML mantém o desfazer do HTML.
2. Desfazer HTML não remove mudanças em CSS.
3. Ao voltar ao CSS, o desfazer de CSS continua funcionando.
4. Uma restauração externa de projeto não deve reutilizar estado incompatível.

## Limitações
Estados ficam somente em memória até desmontar o laboratório. Não há persistência do histórico de desfazer entre reinicializações do aplicativo. Testes e build dependem da execução do CI ou de um checkout local. Não altera package ID, assinatura, APK, produção nem dados do usuário.
