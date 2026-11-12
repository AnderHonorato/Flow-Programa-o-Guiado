# Diagnóstico: saída parcial de certificados Android

## Problema reproduzido

O analisador de `apksigner verify --print-certs` filtrava apenas linhas de certificados SHA-256 com sintaxe válida. Se o segundo signatário tivesse a linha incompleta ou malformada, a primeira assinatura poderia ser tratada incorretamente como única.

## Correção

O preflight agora contabiliza declarações de certificado antes de validar os digests. Se alguma declaração não corresponder ao formato aceito, a assinatura não é considerada verificável e a atualização é bloqueada. A correção não modifica o APK, a chave, o package ID nem os dados do aparelho.

## Teste

`node --test testes/android-preflight-atualizacao.test.mjs`

Casos: segundo certificado truncado, vazio, sem delimitador e com indentação inesperada. O teste completo e a instalação em emulador ficam a cargo do CI Android. Aprovação no emulador não comprova compatibilidade com o Galaxy A35 físico.

## Critério de distribuição

Não distribuir novo APK sem build e instalação aprovados, comparação de assinatura e versão com a instalação existente e evidências de SHA-256. Manter todas as versões antigas no Drive.
