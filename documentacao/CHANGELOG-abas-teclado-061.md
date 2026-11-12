# Incremento 0.6.1 — abas acessíveis do laboratório

Criador: Ander Flow. Produto: Flow Programação Guiada.

## Problema reproduzível
O editor oferecia abas HTML/CSS/JS com `role="tab"`, mas não implementava a navegação por setas prevista para esse padrão. Pessoas com teclado físico ou tecnologias assistivas precisavam percorrer todos os botões com Tab, sem foco único no conjunto.

## Correção
- Uma única aba selecionada participa da ordem de tabulação (`tabIndex=0`); as demais usam `-1`.
- Setas esquerda/direita alternam arquivos com retorno circular.
- Home seleciona o primeiro arquivo e End o último.
- A seleção atualiza o editor, move o foco e mantém o histórico independente de cada arquivo.
- No laboratório Python, apenas `main.py` aparece e não há navegação para arquivos inexistentes.

## Testes e segurança
Teste real no Chromium incluído em `Laboratorio.browser.test.ts`: seleção, foco, arquivo ativo e ordem de tabulação. A verificação completa é responsabilidade do GitHub Actions antes do merge. Nenhuma alteração em package ID, chave Android, armazenamento ou permissões.

## Publicação
A mudança é proposta em PR isolada sobre a PR #26. O APK de CI é apenas diagnóstico/debug, não uma versão homologada para atualização do Galaxy A35. Não distribuir sem comprovação de assinatura compatível.
