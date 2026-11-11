# Evolução — teclado auxiliar do editor no celular

## Problema

No Android, o teclado virtual não oferece facilmente chaves, colchetes, aspas, Tab e movimentação precisa do cursor. Isso prejudica a prática de HTML, CSS, JavaScript e Python em telas pequenas.

## Implementação

- `aplicativos/web/src/laboratorios/EditorCodigo.tsx`: barra de teclas rápidas integrada ao CodeMirror. Insere símbolos na seleção, posiciona o cursor entre pares, preserva o foco e separa operações no histórico de desfazer.
- `aplicativos/web/src/laboratorios/laboratorio.css`: barra horizontal com botões de 44 px apenas em telas de até 760 px com toque; respeita tema e redução de movimento.
- `aplicativos/web/src/laboratorios/Laboratorio.browser.test.ts`: teste no Chromium com contexto mobile e toque, validando inserção, desfazer e espaços.

## Entradas e saídas

Entrada: toque em Tab, símbolos ou setas; seleção atual do editor. Saída: alteração local do documento CodeMirror, que aciona o fluxo já existente de salvamento e prévia. Não envia dados para servidores.

## Limites

Não muda o identificador, a assinatura ou o versionCode do Android. O erro de instalação no Galaxy A35 permanece pendente de diagnóstico no dispositivo físico. Nenhum APK novo deve ser distribuído apenas com base no teste web.
