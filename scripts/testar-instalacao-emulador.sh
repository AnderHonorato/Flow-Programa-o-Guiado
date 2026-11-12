#!/usr/bin/env bash
# Teste de instalacao e inicializacao em Android 15 isolado.
set -euo pipefail
apk="${1:?Informe o caminho do APK}"
saida="${2:-artefatos/emulador}"
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
adb install -r "$apk" 2>&1 | tee "$saida/instalacao.txt"
grep -q 'Success' "$saida/instalacao.txt"
# O APK debug deve permitir run-as; gravar um marcador dentro dos dados privados
# permite provar que adb install -r preserva dados, nao apenas que retorna Success.
marcador="flow-preservacao-ci-$(sha256sum "$apk" | cut -c1-16)"
printf '%s' "$marcador" | adb shell run-as "$pacote" sh -c 'cat > files/flow-ci-preservacao.txt'
valor_antes="$(adb shell run-as "$pacote" cat files/flow-ci-preservacao.txt | tr -d '\r')"
test "$valor_antes" = "$marcador"
# Reinstalacao sobre o mesmo pacote: exercita o caminho de atualizacao sem apagar dados.
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
grep -q 'versionCode=6' "$saida/pacote-diagnostico.txt"
grep -q 'versionName=0.6.0' "$saida/pacote-diagnostico.txt"
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
echo 'Instalacao, reinstalacao, abertura, processo e captura de tela confirmados no emulador; nao valida atualizacao sobre assinatura anterior do A35.'
