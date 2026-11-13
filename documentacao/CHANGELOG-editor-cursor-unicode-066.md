# Editor mobile — navegação Unicode

- Corrigido deslocamento das teclas ← e → sobre emojis e caracteres fora do plano básico Unicode.
- Evita posicionar o cursor entre as metades de um par substituto UTF-16.
- Mantém package ID, assinatura, dados e versionCode sem alterações nesta revisão.
- Testes unitários para ASCII, emoji, limites e caracteres internacionais.

## Segurança e validação
Nenhuma permissão nova, segredo ou alteração de armazenamento. A publicação de APK exige build, assinatura e instalação/abertura no emulador e conferência de compatibilidade com a instalação física.
