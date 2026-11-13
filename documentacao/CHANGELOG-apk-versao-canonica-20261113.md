# Flow Programação Guiada — rastreabilidade do APK

## Corrigido

- O Gradle declara `versionName 0.6.2` e `versionCode 8`, enquanto o script anterior produzia nome e SHA-256 com `0.6.0`. O nome agora deriva da versão nativa.
- O build falha se a versão estiver ausente, duplicada ou fora de `X.Y.Z`, ou se o código de versão for inválido.
- Os testes de regressão são executados pelo próprio script de compilação antes de gerar o APK.

## Segurança e compatibilidade

- `applicationId` `br.com.ander.flow`, assinatura e dados existentes não foram alterados.
- Artefatos `debug` continuam **somente para diagnóstico**. Não são releases homologados para atualização no Galaxy A35.
- Antes de distribuir: verificar certificado instalado, versionCode monotônico, SHA-256, ABI/SDK, instalação com `adb install -r` em emulador limpo e atualização sobre versão anterior assinada pela **mesma** chave, sem apagar dados.
- Preservar versões anteriores no Drive. Não promover um APK de diagnóstico para release.

## Comandos

```bash
python3 -m unittest discover -s scripts -p test_android_versao.py
python3 scripts/android-versao.py aplicativos/android/app/build.gradle
bash scripts/android-compilar.sh
```

O CI Android deverá comprovar execução dos testes e build; a compatibilidade com o Galaxy A35 físico permanece pendente até evidência do certificado do aparelho.
