# Android — Flow Programação Guiada

O APK usa os mesmos arquivos locais compilados da aplicação web, empacotados pelo Capacitor 7. Não carrega uma URL remota como tela inicial. Identificador `br.com.ander.flow`, versão `0.6.0`, código de versão `6`, Android mínimo 6.0/API 23 e alvo API 35. Para a interface e o Python, mantenha o Android System WebView atualizado (Chrome/WebView 107 ou mais recente).

## Compilar um APK de teste

Requisitos: Node.js 22, JDK 21 completo (com `javac`), SDK Android com `platform-tools`, `platforms;android-35`, `build-tools;34.0.0` (padrão do Android Gradle Plugin) e `build-tools;35.0.0`. Defina `ANDROID_HOME` para a instalação do SDK e aceite suas licenças pelo `sdkmanager --licenses`. O Gradle Wrapper versionado baixa a versão necessária; não é preciso instalar Gradle globalmente.

```bash
npm ci
export ANDROID_HOME=/caminho/para/android-sdk
bash scripts/android-compilar.sh
```

O script provisiona o runtime Python local, compila a web, sincroniza recursos e plugins, executa `assembleDebug` e `lintDebug` e grava:

- `artefatos/Flow-Programacao-Guiada-0.6.0-debug.apk`;
- `artefatos/Flow-Programacao-Guiada-0.6.0-debug.apk.sha256`;
- `artefatos/android-build.log`.

Se o build web já estiver atualizado, use `bash scripts/android-compilar.sh --sem-web`. A CI executa verificação de tipos, testes web, build web, fluxos em navegador com API local e banco temporário, testes da API e build/lint Android, guardando os resultados em um artefato do GitHub Actions. A existência do workflow não significa que ele já foi executado remotamente. Os exemplos de testes gerados pelo template do Capacitor foram removidos: não verificavam o produto e um deles ainda esperava o identificador padrão. A validação nativa automatizada disponível está no script de emulador abaixo.

## Instalar e atualizar

```bash
adb install -r artefatos/Flow-Programacao-Guiada-0.6.0-debug.apk
adb shell am start -n br.com.ander.flow/.MainActivity
```

Também é possível abrir o APK no dispositivo e permitir a instalação para o aplicativo usado para baixá-lo. O APK entregue por este processo é uma compilação de depuração, assinada automaticamente com a chave local de testes do Android. Não é uma assinatura de produção nem é adequado à publicação na Play Store. Atualizações sem perda de dados exigem o mesmo identificador e a mesma chave. Desinstalar apaga os dados locais; use exportação antes disso.

Uma versão de distribuição exige uma chave de produção administrada pelo titular, armazenamento seguro dos segredos de assinatura e novo build release. Nenhuma chave de produção é criada, armazenada no repositório ou substituída por uma chave debug neste projeto.

## Armazenamento, teclado e voz

O conteúdo web fica no APK; IndexedDB persiste no armazenamento privado do WebView, associado à origem local estável do Capacitor e isolado por perfil pela aplicação. A atividade preserva a WebView ao rotacionar e ajusta a janela ao teclado. Essas configurações não substituem o salvamento de rascunhos implementado na aplicação. Backup automático do Android está desativado para não copiar sessões e trabalhos a contas de sistema sem um fluxo de consentimento.

`NarradorNativoPlugin.java` implementa TTS Android, registrado como `NarradorNativo`. Métodos: `vozes()`, `falar({texto,idioma,voz,velocidade,volume,id})` e `parar()`. Eventos: `inicio`, `fim` e `erro`, com `id`; uma interrupção informa `cancelado:true`. O plugin seleciona somente vozes que o mecanismo declara locais em `pt-BR` ou inglês; o aplicativo começa em `pt-BR` e só muda para inglês após escolha explícita e rejeita ausência de voz local com instrução para instalar uma. A disponibilidade depende do aparelho e do mecanismo TTS. Não usa microfone. Como o Android TTS não oferece pausa universal, a interface interrompe e retoma o parágrafo.

## Rede e limites offline

A única permissão de acesso do aplicativo é Internet, sem diálogo de permissão em tempo de execução. A biblioteca AndroidX declara também uma permissão interna para seus receptores. Tráfego HTTP simples e conteúdo misto estão desativados. A API nativa usa `https://flow-programacao-guiada-anderhonoratos-projects.vercel.app/api`, no alias confirmado pela plataforma; o backend precisa aceitar a origem local HTTPS do Capacitor. Nenhuma credencial de IA acompanha o APK. Login remoto, GPT, sincronização e downloads novos dependem de rede; código, conteúdo e runtime Python previamente empacotados permanecem locais. Os arquivos de atribuição e licenças das dependências, fontes e runtime Python são distribuídos em `assets/public/licencas/` dentro do APK.

O ícone e a abertura usam geometria original do Flow em terracota, vinho e fundo quente, sem os recursos de marca padrão do Capacitor.

## Verificação em emulador

Com um único emulador já inicializado e visível em `adb devices`, execute:

```bash
ANDROID_HOME=/caminho/para/android-sdk node scripts/android-verificar.mjs
```

O teste usa o WebView depurável do APK debug, cria um perfil de teste se necessário e abre a aula inicial. Consulta a disponibilidade real de vozes, toca no editor e digita pelo Android, registra o estado do teclado e gira a tela para conferir a preservação do código. Depois desliga Wi-Fi e dados, fecha o processo e reabre a aula. Confere a persistência de perfil e rascunho e a ausência de rede. Gera capturas, estado do teclado e `verificacao-android.json` em `docs/evidencias/android/`. Uma voz detectada não comprova qualidade ou audibilidade: a audição ainda exige validação humana. O emulador permanece sem rede ao final; reative Wi-Fi/dados manualmente para testar funções online. O teste não deve ser executado em um perfil pessoal: use um emulador destinado à verificação.

## Evidências desta execução

As evidências reais de ambiente, compilação e emulador ficam em `docs/evidencias/android/`. O relatório de entrega registra o checksum do APK resultante e as verificações efetivamente executadas. O emulador deste ambiente não dispõe de `/dev/kvm`; as duas tentativas usaram emulação por software e não concluíram a validação do produto.

[`apk-final.json`](evidencias/android/apk-final.json) registra o APK final, assinatura, metadados e a comparação integral dos arquivos do `dist` com os recursos dentro do APK. A compilação final executou `assembleDebug` e `lintDebug` com sucesso; o lint reportou zero erros e oito avisos. A verificação estática confirmou as 12 licenças, o runtime Python WASM, o endereço da API nativa, a atividade de abertura declarada e o Worker Python com bloqueios de IndexedDB e descritores herdados. Esses bloqueios reduzem acesso à origem; não constituem um sandbox completo. A assinatura de depuração foi verificada nos esquemas v1 e v2.

Uma instalação do APK debug anterior retornou `Success` em `instalacao-apk.log`. Isso confirma somente a aceitação daquele pacote pelo gerenciador de instalação. A abertura falhou com serviço Android indisponível na primeira tentativa; na segunda, a chamada de abertura informou atividade inexistente e o roteiro de verificação encerrou por timeout do ADB. Os registros também mostram falhas de depuração de processos do sistema. Esses resultados não comprovam abertura da tela, teclado, rotação, voz nem persistência offline no Android. Não foi iniciada uma terceira tentativa pesada. O APK final recompilado deve ser instalado e validado em aparelho ou emulador com aceleração; os testes web de persistência offline não substituem essa validação nativa.

## Atualização 0.3.0

A versão 0.3 incluiu foto recortável, avatares Cartoon/Pixel/Games e histórico/celebrações de conquistas. As evidências dessa versão ficam em `docs/evidencias/recompensas-0.3.0/`; os registros Android anteriores continuam preservados como histórico. A validação de execução em aparelho estável segue pendente.


## Atualização 0.4.0

J.A.R.V.I.S reage a ações e termos e mostra “Falando...” apenas após o início real da síntese. Português brasileiro é o padrão estrito; inglês é alternativa explícita, sem tradução do conteúdo. Controles e seletores têm desenho próprio. Compilação e verificação de assinatura não substituem audição e execução em aparelho. Evidências em `docs/evidencias/jarvis-0.4.0/`.


## Atualização 0.5.0

Comunidade/ranking, opiniões de aula e gestão de usuários usam a API pública e exigem conexão/conta. Leituras registradas após20segundos visíveis ficam numa fila offline separada por perfil e são sincronizadas sem XP adicional. A interface verifica restrições a cada20segundos visíveis e ao retomar; o servidor recusa a sessão revogada em cada pedido. Sem rede não há expulsão remota imediata. Nova entrada visual e conquistas Inicial/Rara/Épica/Lendária com movimentos finitos. Evidências em `docs/evidencias/comunidade-0.5.0/`.

## Atualização 0.6.0

Dez aulas novas ampliam o catálogo para30 aulas/120 atividades, com30 experimentos. O laboratório permite eventos nativos de formulário mantendo bloqueio de envio pela CSP. O APK0.6/code6 tem10.968.351 bytes, assinatura debug preservada e SHA256 `e2fdd6501375b9b5861e96da892c401d36934e61bb952317caeaa5ff276fba51`. Os52 arquivos web foram comparados integralmente, sem diferenças. Build/lint aprovados, zero erros/oito avisos. Evidências em `docs/evidencias/curriculo-0.6.0/`. A execução em Android físico continua pendente.
