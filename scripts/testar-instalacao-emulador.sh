#!/usr/bin/env bash
# Teste de instalacao e inicializacao em Android 15 isolado.
set -euo pipefail
apk="${1:?Informe o caminho do APK}"
saida="${2:-artefatos/emulador}"
apk_anterior="${3:-}"
mkdir -p "$saida"
pacote="br.com.ander.flow"
# Evidencias persistem mesmo se a instalacao falhar antes da abertura.
coletar_evidencias() {
  local resultado=$?
  printf 'codigo_saida=%s\n' "$resultado" > "$saida/resultado.txt"
  adb shell getprop ro.build.version.sdk > "$saida/sdk-emulador.txt" 2>&1 || true
  adb shell getprop ro.product.cpu.abilist > "$saida/abis-emulador.txt" 2>&1 || true
  adb shell dumpsys package "$pacote" > "$saida/pacote-final.txt" 2>&1 || true
  adb logcat -d -t 1200 -v brief > "$saida/logcat-final.txt" 2>&1 || true
}
trap coletar_evidencias EXIT
test -s "$apk"
sha256sum "$apk" > "$saida/apk.sha256"
if [[ -n "${ANDROID_HOME:-}" && -x "$ANDROID_HOME/build-tools/35.0.0/aapt" ]]; then
  "$ANDROID_HOME/build-tools/35.0.0/aapt" dump badging "$apk" > "$saida/apk-metadados.txt"
  grep -q "package: name='$pacote'" "$saida/apk-metadados.txt"
fi
adb wait-for-device
test "$(adb shell getprop sys.boot_completed | tr -d '\r')" = "1"
# Capturar estado anterior sem remover aplicativo nem dados.
adb shell dumpsys package "$pacote" > "$saida/pacote-antes.txt" 2>&1 || true
# Quando fornecido, instala primeiro o APK da versao anterior e valida a
# atualizacao REAL de versao. Ambos sao compilados com a mesma chave de debug
# apenas neste runner; isso nao comprova compatibilidade com o A35 fisico.
if [[ -n "$apk_anterior" ]]; then
  test -s "$apk_anterior"
  aapt_previo="$ANDROID_HOME/build-tools/35.0.0/aapt"
  "$aapt_previo" dump badging "$apk_anterior" > "$saida/apk-anterior-metadados.txt"
  grep -q "package: name='$pacote'" "$saida/apk-anterior-metadados.txt"
  "$aapt_previo" dump badging "$apk" > "$saida/apk-novo-metadados.txt"
  codigo_anterior="$(sed -nE "s/.*versionCode='([0-9]+)'.*/\\1/p" "$saida/apk-anterior-metadados.txt" | head -1)"
  codigo_novo="$(sed -nE "s/.*versionCode='([0-9]+)'.*/\\1/p" "$saida/apk-novo-metadados.txt" | head -1)"
  test -n "$codigo_anterior" && test -n "$codigo_novo"
  if (( codigo_novo <= codigo_anterior )); then
    echo "Falha: versionCode nao cresce ($codigo_anterior -> $codigo_novo)" >&2
    exit 1
  fi
  apksigner="$ANDROID_HOME/build-tools/35.0.0/apksigner"
  "$apksigner" verify --print-certs "$apk_anterior" > "$saida/certificado-anterior.txt"
  "$apksigner" verify --print-certs "$apk" > "$saida/certificado-novo.txt"
  certificado_anterior="$(sed -nE 's/^Signer #1 certificate SHA-256 digest: (.*)$/\\1/p' "$saida/certificado-anterior.txt" | head -1)"
  certificado_novo="$(sed -nE 's/^Signer #1 certificate SHA-256 digest: (.*)$/\\1/p' "$saida/certificado-novo.txt" | head -1)"
  test -n "$certificado_anterior" && test "$certificado_anterior" = "$certificado_novo"
  sha256sum "$apk_anterior" > "$saida/apk-anterior.sha256"
  adb install "$apk_anterior" 2>&1 | tee "$saida/instalacao-anterior.txt"
  grep -q 'Success' "$saida/instalacao-anterior.txt"
else
  adb install -r "$apk" 2>&1 | tee "$saida/instalacao.txt"
  grep -q 'Success' "$saida/instalacao.txt"
fi
# O APK debug deve permitir run-as; gravar um marcador dentro dos dados privados
# permite provar que adb install -r preserva dados, nao apenas que retorna Success.
marcador="flow-preservacao-ci-$(sha256sum "$apk" | cut -c1-16)"
printf '%s' "$marcador" | adb shell "run-as '$pacote' sh -c 'mkdir -p files && cat > files/flow-ci-preservacao.txt'"
valor_antes="$(adb shell run-as "$pacote" cat files/flow-ci-preservacao.txt | tr -d '\r')"
test "$valor_antes" = "$marcador"
# Atualizacao sobre a versao anterior quando fornecida; caso contrario,
# reinstalacao do mesmo APK. Nenhuma limpeza ou desinstalacao e executada.
adb install -r "$apk" 2>&1 | tee "$saida/atualizacao.txt"
grep -q 'Success' "$saida/atualizacao.txt"
valor_depois="$(adb shell run-as "$pacote" cat files/flow-ci-preservacao.txt | tr -d '\r')"
if [[ "$valor_depois" != "$marcador" ]]; then
  echo 'Falha: reinstalacao perdeu ou alterou os dados privados do aplicativo' >&2
  exit 1
fi
printf 'marcador_sha256=%s\npreservacao=confirmada\n' "$(printf '%s' "$marcador" | sha256sum | cut -d' ' -f1)" > "$saida/preservacao-dados.txt"
# Nao deixar arquivo de teste nos dados privados do app.
adb shell run-as "$pacote" rm files/flow-ci-preservacao.txt

adb shell dumpsys package br.com.ander.flow > "$saida/pacote-diagnostico.txt"
# Comparar os metadados do pacote instalado com os bytes reais do APK.
if [[ -z "${ANDROID_HOME:-}" ]]; then
  echo 'ANDROID_HOME ausente: impossivel conferir versao instalada' >&2
  exit 1
fi
aapt="$ANDROID_HOME/build-tools/35.0.0/aapt"
test -x "$aapt"
"$aapt" dump badging "$apk" > "$saida/apk-metadados.txt"
versao_codigo="$(sed -nE "s/.*versionCode='([0-9]+)'.*/\1/p" "$saida/apk-metadados.txt" | head -1)"
versao_nome="$(sed -nE "s/.*versionName='([^']+)'.*/\1/p" "$saida/apk-metadados.txt" | head -1)"
test -n "$versao_codigo" && test -n "$versao_nome"
grep -Fq "versionCode=$versao_codigo" "$saida/pacote-diagnostico.txt"
grep -Fq "versionName=$versao_nome" "$saida/pacote-diagnostico.txt"
printf 'versao=%s\nversionCode=%s\n' "$versao_nome" "$versao_codigo" > "$saida/versao-instalada.txt"
adb shell pm path "$pacote" | tee "$saida/pacote.txt"
grep -q 'package:' "$saida/pacote.txt"
adb logcat -c
adb shell am start -W -n "$pacote/.MainActivity" | tee "$saida/abertura.txt"
grep -q 'Status: ok' "$saida/abertura.txt"
sleep 8
adb shell pidof "$pacote" | tee "$saida/processo.txt"
test -s "$saida/processo.txt"
adb shell dumpsys activity activities > "$saida/atividades.txt"
grep -q "$pacote" "$saida/atividades.txt"
adb exec-out screencap -p > "$saida/tela.png"
test -s "$saida/tela.png"
adb logcat -d -t 600 -v brief > "$saida/logcat.txt"
if grep -A 12 'FATAL EXCEPTION' "$saida/logcat.txt" | grep -q 'Process: br.com.ander.flow'; then
  echo 'Falha fatal do Flow detectada no logcat' >&2
  exit 1
fi
echo 'Instalacao, atualizacao, preservacao de dados, abertura e captura confirmadas no emulador; nao valida assinatura anterior do A35.'
