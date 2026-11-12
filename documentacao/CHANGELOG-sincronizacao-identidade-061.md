# Flow Programação Guiada — sincronização segura de tentativas

Criador: Ander Flow. Incremento de segurança e estabilidade da versão 0.6.1.

## Problema reproduzível

Uma resposta atrasada de `GET /api/tentativas` podia atualizar o estado de uma tentativa local apenas pelo `id`, mesmo quando `aulaId`, data ou código diferiam. Respostas antigas também podiam remover feedback e rebaixar uma aprovação para pendente. A confirmação de `POST /api/tentativas` não verificava a aula retornada.

## Correção

- Confirmar a aula da tentativa na resposta de envio, quando fornecida.
- Antes de aplicar estado remoto, conferir identidade completa (`id`, `aulaId`, `criadaEm` e arquivos HTML/CSS/JS/Python).
- Não regredir `aprovada` para `pendente_validacao` por resposta atrasada.
- Preservar feedback existente quando a resposta omitir esse campo.
- Manter tentativas locais e fila intactas diante de respostas incompatíveis.

## Verificação

`npm ci && npx vitest run aplicativos/web/src/offline/armazenamento.test.ts && npm run build`

Critérios: todos os testes passam; o histórico não perde código nem feedback; nenhuma alteração no pacote Android `br.com.ander.flow` ou na assinatura. O APK requer gates separados de compilação, assinatura e emulador. A assinatura do A35 físico não foi validada.
