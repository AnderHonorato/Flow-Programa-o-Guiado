# Flow Programação Guiada — gate técnico Galaxy A35 (12/11/2026)

Criador: Ander Flow. Versão de desenvolvimento: 0.6.1 (`versionCode=7`). Identificador preservado: `br.com.ander.flow`.

## Problema reproduzível

O pré-teste comparava apenas a interseção das arquiteturas dos APKs anterior e novo. Dois APKs exclusivamente x86_64 poderiam ser aprovados, embora incompatíveis com o Galaxy A35 ARM64. Também não barrava `minSdk` superior ao Android 15 (API 35).

## Correção

O pré-teste agora rejeita `minSdk > 35`, bibliotecas nativas sem `arm64-v8a`, lista de ABIs inválida e digest SHA-256 de certificado truncado. APKs sem bibliotecas nativas continuam permitidos. A checagem permanece não destrutiva e conserva o fluxo de atualização e preservação de dados do emulador.

## Gates e limitações

Executar `node --test testes/android-preflight-atualizacao.test.mjs` e o workflow `apk-android.yml`, incluindo assinatura, `aapt`, instalação, atualização e abertura em emulador API 35. Este perfil é uma aproximação técnica, **não** identifica a assinatura atualmente instalada no A35 físico. Um APK debug assinado no runner não pode ser promovido como atualização segura do aparelho sem correspondência comprovada da chave. Não remover o aplicativo nem limpar seus dados.

## Entrega

Manter PR isolada até CI aprovado; não alterar `versionCode` sem uma nova versão de distribuição. Sem APK de produção homologado, preservar os arquivos antigos no Google Drive e não criar uma falsa versão instalável.
