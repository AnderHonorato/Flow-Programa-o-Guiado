# Evolucao Android — APK de diagnostico isolado

## Problema
A compilacao Android dependia do sucesso dos testes de navegador no mesmo job de CI. Quando um teste web falhava, nao havia APK novo para inspecionar o erro de instalacao no Galaxy A35.

## Implementacao
O arquivo `.github/workflows/apk-android.yml` compila a interface, sincroniza o Capacitor e gera o APK debug em um job independente. A verificacao inspeciona assinatura, identificador `br.com.ander.flow` e SHA-256 antes de disponibilizar um artefato temporario do GitHub Actions.

## Uso e limites
No GitHub Actions, execute o workflow **Compilar APK Android isoladamente** na branch de trabalho ou abra um PR que modifique arquivos Android/web. O resultado fica nos artefatos da execucao por 14 dias, sem substituir a versao publica. APK de depuracao nao e versao de distribuicao: assinatura diferente pode causar `INSTALL_FAILED_UPDATE_INCOMPATIBLE`. Nao desinstale aplicativos nem apague dados automaticamente.

## Criterios verificaveis
- `npm run build` aprovado e `assembleDebug` concluido.
- `apksigner verify` aprovado.
- `aapt dump badging` confirma identificador do aplicativo.
- Checksum SHA-256 disponivel junto do APK.
- Instalar em emulador e registrar codigo de erro antes de recomendar distribuicao.

## Estado em 2026-11-11
Build web local aprovado. Git diff verificado. Compilacao Android local indisponivel porque o PC so possui Java 8 e nao tem SDK Android completo. Instalacao do Temurin 21 por winget falhou por falta de instalador aplicavel. Workflow ainda precisa passar no CI. Nenhum APK foi enviado ao Drive ou promovido a producao.
