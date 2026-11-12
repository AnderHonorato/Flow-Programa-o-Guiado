# Flow Programação Guiada — gate de atualização 0.6.1

Criador: Ander Flow. O pacote Android permanece `br.com.ander.flow`.

## Alteração

O CI agora executa um **pré-teste não destrutivo** antes de iniciar o emulador. Ele extrai metadados dos APKs 0.6.0 e 0.6.1 usando `aapt`, verifica os certificados via `apksigner` e bloqueia divergência de pacote, certificado, `versionCode` não crescente, `versionName` não atualizado, ausência de SDK verificável e incompatibilidade evidente de ABIs nativas. Os hashes SHA-256 e o resultado ficam em `artefatos/android/preflight-atualizacao.json`.

## Reproduzir

```bash
node --test testes/android-preflight-atualizacao.test.mjs
node scripts/android-preflight-atualizacao.mjs anterior.apk novo.apk evidencias/preflight.json
```

**Segurança:** o pré-teste não invoca ADB, não instala, não desinstala, não altera dados e não acessa chaves privadas. O teste de instalação e abertura continua separado no emulador Android 15.

**Limite:** ambos os APKs são compilados com a chave temporária de debug do runner. Certificados iguais nesse cenário **não comprovam** compatibilidade com a assinatura do aplicativo já instalado no Galaxy A35 físico. Não promover como APK de distribuição até essa assinatura ser confirmada. Não houve alteração de `applicationId` ou da configuração de assinatura.

**Revisão crítica:** a compatibilidade de ABI é avaliada apenas quando os dois APKs declaram bibliotecas nativas. A ausência de `native-code` não significa falha para APK sem bibliotecas nativas. A verificação de `minSdk` garante presença dos metadados, mas a instalação em Android 15 permanece como gate independente.
