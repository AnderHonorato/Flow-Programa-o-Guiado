# Flow Programação Guiada — navegação por grafemas

Criador: Ander Flow.

## Correção
As teclas rápidas esquerda/direita do editor agora respeitam grafemas visíveis: acentos combinantes, emojis com tons de pele e sequências familiares com ZWJ. O cálculo restringe a segmentação à linha atual, evitando percorrer o documento inteiro a cada toque. Navegadores sem Intl.Segmenter preservam a proteção anterior de pares UTF-16.

## Validação exigida
- Testes automatizados de navegação, incluindo regressões anteriores.
- Compilação web e APK Android, assinatura e metadados.
- Instalação e abertura em emulador Android 15 com evidências.
- Compatibilidade com a assinatura existente no Galaxy A35 físico antes de distribuir atualizações.

Não alterar package ID, chave de assinatura, dados instalados ou versões antigas. Esta PR não é homologação do APK físico.
