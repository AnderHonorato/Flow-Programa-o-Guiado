# Diagnostico de instalacao Android (Galaxy A35)

Ferramenta local nao destrutiva para investigar o erro **App nao instalado**.

## Antes de instalar
Conecte o celular por USB, ative depuracao USB e autorize o computador no proprio aparelho. O Android SDK Platform Tools (adb) precisa estar no PATH.

Verifique a conexao e a instalacao atual, sem modificar o aparelho:

```powershell
node scripts/android-diagnosticar-instalacao.mjs --somente-diagnostico
```

Teste a instalacao preservando os dados existentes:

```powershell
node scripts/android-diagnosticar-instalacao.mjs distribuicao/Flow-Programacao-Guiada-0.6.0-debug.apk
```

Se houver mais de um dispositivo, use `--serial IDENTIFICADOR` (obtido por `adb devices -l`).

## Como interpretar
- `ASSINATURA_DIFERENTE`: uma versao anterior do app usa outra chave de assinatura. APKs debug de computadores diferentes podem ter chaves diferentes. **Nao desinstale automaticamente**: preserve os dados e use um APK assinado com a mesma chave para atualizar.
- `VERSAO_ANTIGA`: versionCode menor que o instalado.
- `RESTRICAO_ANDROID`: politica do Android ou perfil de trabalho bloqueia a instalacao. Nao contorne protecoes.
- `APK_INVALIDO`: confira checksum e integridade do arquivo.
- `DISPOSITIVO_INDISPONIVEL`: confira autorizacao e conexao USB.

A ferramenta nunca executa `adb uninstall`, `pm clear` ou desativa verificacoes de seguranca. Ela executa `adb install -r -t` somente quando o usuario pede a instalacao. Os diagnosticos identificam causas possiveis; nao provam que o Galaxy A35 especifico esta corrigido.

## Validacao automatizada
```powershell
node --test testes/android-diagnosticar-instalacao.test.mjs
npm run build
```
