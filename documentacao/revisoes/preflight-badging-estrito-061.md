# Revisão do pré-teste Android — metadados do aapt

## Problema reproduzido

O parser anterior interpretava uma declaração `maxSdkVersion` inválida como ausência de limite. Também considerava um `native-code` inválido como APK universal. Essas interpretações podiam liberar indevidamente um pacote incompatível com o Galaxy A35.

## Correção

A leitura de `aapt dump badging` agora falha fechada em caso de declaração inválida ou duplicada de pacote, SDK máximo ou arquiteturas nativas. A ausência legítima de `native-code` continua permitida para APKs universais.

## Verificação

Executar `node --test testes/android-preflight-atualizacao.test.mjs`. O workflow Android compila o APK, verifica a assinatura, compara com o APK anterior e instala/abre no emulador Android 15. Esse teste **não** valida a assinatura já instalada no Galaxy A35 físico.

## Segurança e distribuição

Sem troca do pacote `br.com.ander.flow`, sem alteração de chave, sem desinstalação e sem exclusão de dados. O APK de CI é de depuração; não promover a release nem enviar ao Drive como instalável homologado até comprovar assinatura e compatibilidade com a instalação física.
