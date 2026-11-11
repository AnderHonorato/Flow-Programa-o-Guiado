# Evolução: navegação Voltar/Avançar no Android e web

- Criador: Ander Flow; aplicativo: Flow Programação Guiada.
- Problema: as telas internas eram controladas apenas pelo estado React; o botão Voltar do Android/navegador não restaurava a tela anterior.
- Implementação: `aplicativos/web/src/App.tsx` registra `flowPagina` no histórico, restaura a tela em `popstate`, fecha a navegação lateral e modais de conta e retorna a rolagem ao topo.
- Teste de integração: `testes/navegacao-mobile.browser.mjs`, executado em Chromium real, viewport 390 × 844, verificando toque em Trilhas/Praticar e Voltar/Avançar com `aria-current` correto.
- Validação: `npm run build` aprovado (TypeScript e Vite); `node testes/navegacao-mobile.browser.mjs` aprovado. Backend local na porta 8000 indisponível, mas catálogo incluído permitiu validar navegação offline.
- Segurança: sem alterações em autenticação, banco de dados, assinatura ou permissões Android.
- Limite: sem teste de botão físico Android nem APK instalado; exige emulador/aparelho para validação nativa.
- Próxima tarefa: validar Voltar nativo do Capacitor, verificar assinatura/instalação APK no Galaxy A35 e ampliar gestos acessíveis.
