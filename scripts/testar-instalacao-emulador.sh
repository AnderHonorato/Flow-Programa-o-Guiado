#!/usr/bin/env bash
# Teste de instalacao e inicializacao em Android 15 isolado.
set -euo pipefail
apk="${1:?Informe o caminho do APK}"
saida="${2:-artefatos/emulador}"
mkdir -p "$saida"
test -s "$apk"
adb wait-for-device
test "$(adb shell getprop sys.boot_completed | tr -d '\r')" = "1"
adb install -r "$apk" 2>&1 | tee "$saida/instalacao.txt"
grep -q 'Success' "$saida/instalacao.txt"
pacote="br.com.ander.flow"
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
echo 'Instalacao, abertura, processo e captura de tela confirmados.'
