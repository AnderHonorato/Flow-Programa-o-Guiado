# Pré-teste de compatibilidade Android 15 — maxSdkVersion

## Problema
O verificador conferia `minSdk`, mas não considerava `maxSdkVersion`. Um APK com limite máximo abaixo da API 35 poderia passar no pré-teste apesar de não ser elegível para instalação no Galaxy A35 com Android 15.

## Alteração
O diagnóstico interpreta `maxSdkVersion` no `aapt dump badging` e bloqueia versões cujo limite declarado seja inferior à API 35 ou inválido. Ausência do campo não impõe limite máximo. O pacote, a assinatura, a versão e as demais verificações permanecem inalterados.

## Verificação
`node --test testes/android-preflight-atualizacao.test.mjs` e workflows `validacao.yml` / `apk-android.yml`. Confirmar conclusão dos jobs antes de promover artefatos.

## Limites e segurança
O perfil Android 15/ARM64 é uma checagem técnica, não um teste no Galaxy A35 físico. O APK de depuração do runner não comprova compatibilidade de assinatura com o aplicativo instalado. Não remover aplicativos, não limpar dados, não alterar a chave e não publicar APK sem validação de distribuição.
