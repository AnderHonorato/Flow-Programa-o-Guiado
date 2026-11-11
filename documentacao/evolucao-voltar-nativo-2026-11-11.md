# Evolução Android — gesto Voltar nativo (11/11/2026)

## Problema e implementação
O histórico interno do React já aceitava o evento `popstate`, mas o projeto Android não possuía o plugin `@capacitor/app` para capturar o gesto/botão físico Voltar. Assim, a WebView podia fechar sem restaurar a tela interna.

Na branch `engenharia/voltar-nativo-capacitor`, a integração registra o evento nativo `backButton` apenas no Android/iOS via Capacitor. Prioridade: fechar a tela de conta, fechar o menu lateral, voltar à tela anterior do histórico Flow e, somente na raiz, sair do aplicativo. O listener é removido ao desmontar e evita registros duplicados.

Arquivos: `aplicativos/web/src/App.tsx` (controle de navegação), `aplicativos/web/package.json` e `package-lock.json` (plugin oficial), `aplicativos/android/capacitor.settings.gradle` e `aplicativos/android/app/capacitor.build.gradle` (integração nativa gerada por `cap sync android`).

## Validação e limites
- `npm run build`: TypeScript e Vite concluídos, 134 módulos.
- `npm run android:sync --workspace aplicativos/web`: plugin `@capacitor/app@7.1.2` reconhecido.
- `npm test -- --run --reporter=dot`: conferir resultado do processo em andamento antes de publicar.
- Instalação no Galaxy A35 e gesto físico: ainda não comprovados; exige APK Android compilado e dispositivo ou emulador.
- Java disponível no PC: versão 8, incompatível com as versões modernas do Gradle/Android; não declarar APK novo enquanto não houver build Android validado.
- O pacote `br.com.ander.flow` e o `versionCode` existente foram preservados; nenhuma instalação ou dado do usuário foi alterado.

## Próxima tarefa
Provisionar JDK compatível e Android SDK de compilação em ambiente isolado, compilar APK de depuração, validar em emulador e investigar assinatura/versão da instalação no Galaxy A35 antes de distribuir. Não substituir o APK 0.6.0.
