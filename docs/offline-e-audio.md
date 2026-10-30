# Offline, sincronização, revisão e áudio

O navegador guarda progresso, respostas, revisões, tentativas e recursos por `perfilId` no IndexedDB `flow-programacao-guiada`, versão 1. Rascunhos e até 20 versões por aula ficam no armazenamento do laboratório, também separados por perfil. O aplicativo não armazena senha nem chave de IA. Tokens de sessão são responsabilidade da integração e não entram nos backups.

## Integração

`aplicativos/web/src/offline/armazenamento.ts` exporta o contrato de integração e as funções adicionais:

| Função | Uso |
| --- | --- |
| `estadoInicial()` | Estado vazio novo a cada chamada. |
| `combinarEstados(local, remoto)` | União de conclusões e respostas corretas, maior XP, maior etapa e revisão na data mais próxima. Mantém a última aula local quando preenchida. |
| `vincularPerfil(local, conta)` | Copia progresso, envios, recursos e projetos; mantém a origem para recuperação. |
| `exportarPerfil(perfil)` | JSON versão 1 com progresso, tentativas, recursos, rascunhos e versões. Não inclui sessão nem arquivos binários dos pacotes. |
| `importarPerfil(perfil, json)` | Valida o arquivo antes de escrever; combina dados sem sobrescrever código atual. Conflitos de projetos viram versões recuperadas. Limite de 20 MB no JSON. |
| `lerSincronizacao(perfil)` | `local`, `sincronizando`, `sincronizado` ou `erro`, com data e mensagem quando disponíveis. |
| `salvarRecursoLocal`, `lerRecursoLocal`, `listarRecursosLocais`, `removerRecursoLocal` | Preferências e outros dados estruturados por perfil e chave. |

`listarFila` devolve o histórico inteiro. Filtre por `aguardando_sincronizacao` para contar pendências de rede. `enfileirarTentativa` força esse estado inicial: um cliente não pode inventar confirmação remota. O mesmo id com os mesmos arquivos não cria outro envio; o mesmo id com arquivos diferentes causa erro para preservar o original.

### Rede e conflitos

`sincronizarFila(perfilId, token, api = '/api')` compartilha uma execução concorrente por perfil. Para cada tentativa aguardando rede envia `POST /tentativas` com `{id,aulaId,arquivos,criadaEm}` e Bearer; muda o estado apenas após HTTP bem-sucedido e id/status confirmados. Reenvios usam o mesmo id, inclusive quando o servidor recebeu o trabalho mas a resposta se perdeu.

Depois consulta `GET /tentativas` para atualizar avaliação/feedback e recuperar trabalhos da conta em outro dispositivo. Envia `PUT /progresso` com `{estado}`; combina o estado devolvido com a versão local mais recente em transação. O servidor controla a versão e o cálculo de XP; o cliente não soma XP de dispositivos, evitando recompensar o mesmo evento duas vezes.

Falhas de rede, HTTP, sessão ou resposta inválida preservam código e fila. O retorno `{enviadas,pendentes}` contabiliza POSTs confirmados nesta execução e envios que ainda aguardam rede. Um POST cuja resposta se perdeu pode aparecer confirmado no GET sem ser contado em `enviadas`. Consulte `lerSincronizacao` para detectar erro de progresso mesmo se `pendentes` for zero. A janela também recebe o evento `flow:sincronizacao` com `{perfilId,estado,erro?,ultimaSincronizacao?}`.

O hook `componentes/useFlow.ts` evita gravar uma resposta assíncrona de outro perfil e espera gravações locais antes de vincular/sair. `sincronizarFila` já envia o progresso: a interface não deve realizar outro PUT em seguida. Perfil autenticado não é copiado automaticamente para outra conta.

HTTP 401 registra `sessaoExpirada: true` no estado de sincronização e no hook. A interface oferece **Entrar novamente**, preservando o perfil, seus projetos e a fila. Uma sincronização com token renovado aguarda a execução antiga terminar e usa a nova credencial; chamadas concorrentes com o mesmo token compartilham a execução.

### Catálogo publicado

O hook expõe `flow.catalogo` e `flow.aulas`. `offline/catalogo.ts` consulta `GET /api/catalogo`, valida o esquema antes de publicar e guarda a cópia aprovada em IndexedDB na chave `catalogo:publicado` de cada perfil. Ao abrir sem rede ou receber conteúdo inválido, usa a última cópia local validada; sem essa cópia, usa o currículo incluído na instalação. Troca de perfil cancela a requisição anterior. Os exports estáticos de `useFlow.ts` permanecem somente para compatibilidade; telas devem consumir os valores do hook.

O banco garante transações para o progresso e a fila. IndexedDB e localStorage não compartilham transação: uma falha de cota durante uma importação de vários projetos pode deixar uma cópia parcial no destino. A origem e os arquivos existentes permanecem preservados; refazer a importação permite continuar. Backups podem conter textos e código pessoal: devem ser guardados pelo aluno com cuidado.

## Pacotes e espaço

`offline/pacotes.ts` exporta `baixarPacote(perfil,{id,titulo,aulas,recursos?},aoProgresso?)`, `listarPacotes`, `removerPacote`, `consultarEspaco` e `solicitarArmazenamentoPersistente`.

Os metadados e as aulas ficam no IndexedDB por perfil. Recursos públicos são baixados em um cache novo `flow-pacote-<uuid>`; a instalação só é publicada após todos os downloads. Uma falha na atualização remove o cache incompleto e conserva a instalação anterior. Remover um pacote apaga seu cache e metadados. Os bytes exibidos são o tamanho dos corpos baixados e do JSON, não a ocupação interna exata do navegador.

A tela Perfil oferece baixar/atualizar/remover cada trilha publicada, tamanho e progresso. `pacotePython` exporta a instalação opcional Pyodide 0.29.3: `pyodide.js`, `pyodide.mjs`, `pyodide.asm.js`, `pyodide.asm.wasm`, `python_stdlib.zip` e `pyodide-lock.json`. O download total observado foi 12.302.220 bytes incluindo o JSON de aulas vazio. A atualização explícita usa `cache: no-cache`, que o handler encaminha à rede para não reinstalar os mesmos bytes do cache anterior.

Apenas a mesma origem é permitida; `/api` e origens externas são rejeitadas. Disponibilize Pyodide e dependências em `/pyodide/`, com versão fixa, e passe a lista completa de arquivos efetivamente necessários. Não basta baixar só o carregador JavaScript: o runtime necessita WASM, biblioteca padrão, metadados e pacotes Python usados pela aula. Não declare Python pronto offline sem executar um exercício sem conexão após o download.

CacheStorage depende de HTTPS ou localhost e de suporte do dispositivo. O navegador pode recusar armazenamento persistente ou remover dados por pressão de espaço; manter uma cópia exportada continua recomendado. O backup JSON não inclui binários: os pacotes precisam ser provisionados novamente em outro aparelho. O catálogo e os assets empacotados no APK estão disponíveis desde a instalação; a PWA exige instalação prévia do service worker.

### Service worker recomendado

O principal controla `vite.config.ts` com `vite-plugin-pwa`. Manter `registerType: 'prompt'`, para não atualizar/recarregar o editor sem ação do aluno. Usar `globPatterns` para HTML, JS, CSS, fontes locais, JSON, ícones e imagens; excluir `/pyodide/**` do precache para não forçar download grande a todos. Excluir a API do fallback de navegação com `/^\/api(?:\/|$)/` e nunca armazenar requisições autenticadas.

`offline/configuracao-pwa.ts` exporta `runtimePacotes`, uma rota Workbox com callbacks autocontidos que o gerador pode serializar. Ela consulta caches instalados pelo gerenciador para `/assets/`, `/recursos/`, `/conteudos/` e `/pyodide/`, depois tenta rede. Inserir em `workbox.runtimeCaching` antes de uma rota genérica que possa interceptar esses caminhos:

```ts
import { runtimePacotes } from './src/offline/configuracao-pwa';

workbox: {
  globPatterns: ['**/*.{js,css,html,svg,png,woff2,json}'],
  globIgnores: ['pyodide/**'],
  navigateFallbackDenylist: [/^\/api(?:\/|$)/],
  runtimeCaching: [runtimePacotes],
}
```

URLs de recursos devem ser versionadas ou usar hash de conteúdo. A aplicação deve oferecer ao aluno download explícito de Python e outros pacotes grandes. O handler não baixa nem retém recursos adicionais por conta própria. Testar com o build de produção e service worker ativo; o servidor Vite de desenvolvimento não demonstra funcionamento offline da PWA.

## Revisão espaçada

`offline/revisao.ts` exporta `atualizarRevisao`, `revisoesPendentes` e `gerarVariacao`. Os intervalos são 1, 3, 7, 14 e 30 dias; acerto avança uma etapa, resposta com ajuda recua uma e erro reinicia em um dia. Não há perda de XP ou punição por ausência. Revisões vencidas e erros são priorizados.

As variações recebem competência, semente e número de tentativa: a mesma entrada gera a mesma atividade. Tentativas consecutivas alternam formato e parâmetros. O resultado inclui enunciado, código, resposta e explicação. Revisão por autorreflexão agenda a memória; ela não substitui testes objetivos ou a validação pedagógica de um projeto.

## Narração

`audio/Narracao.tsx` tem exatamente as props `{blocos:string[],aoDestacar?:(indice:number)=>void}`. Renderiza os próprios parágrafos; a interface não precisa renderizá-los novamente. Inicia somente após ação do usuário. Oferece ouvir, pausar, retomar, parar, repetir trecho, voz, velocidade, volume e ouvir a partir de qualquer parágrafo, com 350 ms entre blocos. Velocidade e volume mudam no próximo trecho; repetir aplica imediatamente. Trocar voz ou idioma encerra a leitura atual. O volume efetivo também depende do sistema operacional.

O destaque ocorre por parágrafo. Blocos de código cercados por três crases são indicados como exemplos a consultar no laboratório, em vez de narrar símbolos. Um AudioProvider compartilhado coordena aula, termos e assistente; cada novo pedido explícito substitui a sessão anterior e invalida seus callbacks. O mascote só vibra e indica fala após `onstart`/`inicio`, para ao pausar/encerrar/falhar e indica volume zero conforme o volume realmente aplicado ao trecho. O callback também permite destacar conteúdo. Para continuar ao alternar painéis, mantenha o componente montado e altere sua visibilidade; trocar de aula ou desmontar encerra a leitura.

Na web usa `SpeechSynthesis`, atualiza a lista no evento `voiceschanged` e aceita somente `pt-BR` ou inglês. O padrão é estritamente `pt-BR`; inglês requer escolha explícita e não traduz o texto. Dentro do idioma escolhido prefere `localService: true`. Sem voz brasileira, a reprodução fica desabilitada até instalar uma ou escolher inglês. Essa propriedade identifica a classificação fornecida pelo navegador; não garante disponibilidade offline universal. Se não houver voz local, informa a possibilidade de precisar de internet. Se não houver suporte à síntese, os textos continuam disponíveis com uma mensagem de fallback. Não exige microfone e não usa reprodução automática. O app não faz uma requisição de áudio ao seu servidor; uma voz classificada como online pode processar o texto pelo serviço de síntese do navegador/dispositivo.

No Android prefere a ponte Capacitor `NarradorNativo`, implementada pelo módulo Android, com `vozes`, `falar`, `parar` e eventos `inicio`/`fim`/`erro`. Usa vozes locais em português do Brasil ou inglês e faz fallback para WebSpeech quando a ponte não tem voz compatível. A API Android não tem pausa real: pausar interrompe, retomar reinicia o parágrafo atual; a interface informa isso. Eventos de fim com `cancelado:true` não avançam a aula. O plugin requer registro no `MainActivity`; não há dependência npm extra além de `@capacitor/core`.

## Verificação

Testes unitários usam Vitest, fake-indexeddb e jsdom. Cobrem isolamento, deduplicação, falhas de rede e HTTP, feedback remoto, combinação de progresso, vínculo, backup com projetos, rejeição de dados corrompidos, instalação e falha de pacotes, revisão adaptável, reprodutibilidade, ausência de voz e controles de reprodução/parágrafos.

Áudio real, vozes instaladas e comportamento offline de cada navegador/dispositivo exigem verificação no equipamento. Os testes automatizados usam uma fronteira simulada de síntese; não são evidência de naturalidade da voz ou de suporte universal. O APK deve ser validado em emulador ou aparelho com voz PT-BR local instalada.

Em 27/10/2026, `testes/offline/pacotes-producao.mjs` verificou em Chromium com build de produção: download, remoção e reinstalação da trilha HTML pela interface; instalação dos seis arquivos Python; limpeza do cache HTTP; fechamento e reabertura da página sem rede; leitura dos seis arquivos pelo service worker; execução real de Python em Worker/WebAssembly com o teste objetivo de saldo aprovado. Evidências em `testes/offline/evidencias/pacotes-producao.json` e `python-sem-internet.png`. Essa execução não substitui a verificação de voz ou de Android.

Para repetir, faça o build, sirva `aplicativos/web/dist` em localhost com service worker habilitado e execute `FLOW_OFFLINE_URL=http://127.0.0.1:4184 node testes/offline/pacotes-producao.mjs`. A execução cria um contexto de navegador novo e substitui apenas seus próprios arquivos de evidência.
