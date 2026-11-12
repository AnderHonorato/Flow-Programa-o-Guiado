# Flow Programação Guiada — estado da prévia após edição

Criador: Ander Flow. Data: 12/11/2026.

## Reprodução

Na execução [43222838326](https://github.com/AnderHonorato/Flow-Programa-o-Guiado/actions/runs/43222838326), o teste E2E desktop do formulário isolado encontrou o `output` vazio após envio. O mesmo cenário passou no perfil celular. A causa exata do formulário ainda não foi demonstrada; não se deve atribuí-la automaticamente à mudança deste PR.

## Alteração de produção

O laboratório deixa de apresentar **Prévia atualizada** quando o usuário já editou o código e a execução automática ainda está aguardando o debounce. Exibe estado pendente, ou solicita execução manual se a atualização automática estiver desligada. Em Python, indica explicitamente que a execução deve ser iniciada. A prévia continua isolada e o código não é enviado a serviços externos.

## Testes e critérios

- Teste Chromium verifica o estado pendente imediatamente após a edição e aguarda a confirmação da nova prévia e seu DOM atualizado.
- Reexecutar E2E completo, inclusive formulário desktop/celular e isolamento CSP.
- Rodar build Android, checar assinatura, package ID, versionCode e instalar/abrir no emulador antes de qualquer distribuição.
- Não confundir instalação no emulador com validação no Galaxy A35 físico.

## Segurança e entrega

Não alterar `br.com.ander.flow`, assinatura nem dados existentes. PR empilhado sobre #25, sem merge ou promoção de APK até conclusão de todos os gates. Artefatos de depuração do CI não são automaticamente instaláveis no A35.
