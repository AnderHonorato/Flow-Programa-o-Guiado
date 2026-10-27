# Evidências e matriz de aceite — 0.1.0

Relatório de 27/10/2026. Uma verificação automatizada confirma apenas o cenário e o ambiente descritos. Não equivale a teste em aparelho Android físico.

| Requisito | Implementação | Verificação executada | Resultado / evidência |
|---|---|---|---|
| Perfil local, conta e isolamento | `componentes/useFlow.ts`, `offline/armazenamento.ts`, API | Testes de troca A/local/B; cadastro, sessão e RBAC HTTP | Aprovado; suíte frontend e API |
| Primeira aula HTML completa | `conteudos/catalogo.json`, `paginas/Aula.tsx` |10 fluxos E2E desktop/celular, questões, editor e progresso |10 aprovados; `testes/ponta-a-ponta/resultado-final-producao.log` |
| HTML/CSS/JS e DOM reais | `laboratorios/` | Chromium verifica prévia, eventos, console, sandbox e semântica | Aprovado; `docs/evidencias/laboratorio-final.md` |
| Python local e offline | Worker/Pyodide0.29.3 | Download dos6arquivos, cacheHTTP limpo, aba fechada, reabertura offline, WASM executa exercício | Aprovado; `testes/offline/evidencias/pacotes-producao.json` |
| Fila, reenvio e deduplicação | IndexedDB + `/api/tentativas` | Queda de rede, reabertura e POST repetido com mesmo identificador | Aprovado local e produção |
| Revisões, variações e progresso | `offline/revisao.ts` | Intervalos1/3/7/14/30, sementes e conflitos | Aprovado em testes de domínio |
| Narração e fallback | `audio/` + plugin Android Java | Motor WebSpeech controlado: reproduzir/pausar/retomar/repetir | Aprovado no teste; voz física Android ainda não comprovada |
| Mascote original | `mascote/`, `recursos/jarvis-pixel-art/` |11estados×4quadros, SVGs, redução de movimento e controles | Recursos e interação inspecionados |
| Administração, CMS e correção | FastAPI/RBAC/CMS/auditoria | Aluno403, admin manual, falhaGPT503 não aprova, revisão humana auditada | Aprovado;23testes API e `docs/evidencias/publicacao/api-producao.json` |
| Certificados internos | `/api/certificados`, `paginas/Certificados.tsx` | Somente tentativa aprovada com auditoria; revogação remove certificado | Aprovado local e produção; não é diploma |
| Backend/execução remota isolada | `executores/` | Docker real: Python/Node/HTTPloopback, uid, rede, CPU/memória, saída e limpeza |26 testes aprovados registrados; serviço remoto não publicado |
| Contraste e responsividade | Tokens, CSS e CodeMirror | axe em20telas,1440e390px, claro/escuro; foco e overflow | Zero ocorrências nas20telas; `testes/acessibilidade/evidencias/resultado-ui.json` |
| Dependências | Lockfiles npm + dependências Python | Atualização Vitest5.0.5 e auditoria npm completa | Zero alertas npm no relatório final |
| APK real | Capacitor7, SDK35, JDK21 | assembleDebug/lintDebug/apksigner/ZIPdist | Aprovado; `docs/evidencias/android/apk-final.json`; assinatura de teste |
| Instalação/uso Android | Emulador AOSP35 semKVM | Duas tentativas; instalação inicialSuccess, ADB/Androidinstável | Abertura, teclado, orientação e offline nativos **não comprovados** |
| Web e banco publicados | VercelFastAPI + Supabasehonorato.tech | Saúde200, catálogo200, cadastro201, sessão revogada401, revisão humana e certificados | Aprovado; `docs/evidencias/publicacao/` |
| URL em contexto anônimo | Chromium novo sem sessão, TLS habilitado | Página pública, perfil local e aula HTML inicial | Aprovado; `navegador-anonimo.json` e captura |
| Expansão editorial |10trilhas/60módulos catalogados | Auditor verifica20aulas/80atividades/45testes objetivos |40módulos em produção; meta180aulas/450atividades ainda não concluída |

## Resultados locais finais

A suíte integrada de frontend contém63testes em16arquivos e passou também com o Chromium baixado pelo Playwright, além do navegador de sistema. A API contém23testes aprovados. O aviso de depreciação Starlette/TestClient/httpx não é falha de autorização ou execução.

A validação GitHubActions é acompanhada separadamente: primeiras execuções revelaram um crash de Chromium em `about:blank` com iframe opaco. O harness foi corrigido para ter origem HTTP real, como o produto. Logs de tentativas anteriores ficam preservados como diagnóstico, não aprovação.

## Pendências reais

- Configurar `OPENAI_API_KEY` no servidor para chamadas GPT reais. Nenhuma chamada foi feita sem credencial. A revisão humana funciona.
- Hospedar controlador de execução em host dedicado, se for habilitar prática remota. Código e testes estão entregues; API retorna503 enquanto desativado.
- Verificar APK num aparelho Android ou emulador acelerado estável, incluindo voz local, teclado e orientação. Entrega atual é debug.
- Expandir o catálogo com160aulas adicionais e revisar editorialmente o material antes de atingir a meta final. Planejamento não entra na contagem de publicado.
