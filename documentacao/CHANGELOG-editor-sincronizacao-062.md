# Editor — sincronização incremental (0.6.2)

- Atualizações externas de código agora modificam somente o intervalo alterado no CodeMirror, em vez de substituir o documento completo.
- Preserva melhor posição do cursor, seleção, rolagem e histórico de edição durante restaurações e sincronizações.
- Testes automatizados cobrem inserção, remoção, substituição, Unicode e conteúdo idêntico.
- A mudança não altera package ID, assinatura, versionCode nem dados instalados.
- Distribuição Android permanece condicionada à verificação de assinatura do APK existente no Galaxy A35.
