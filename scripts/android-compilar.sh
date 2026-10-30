#!/usr/bin/env bash
set -euo pipefail

raiz="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [[ "${1:-}" != "" && "${1:-}" != "--sem-web" ]]; then
  echo 'Uso: bash scripts/android-compilar.sh [--sem-web]' >&2
  exit 2
fi

if [[ -z "${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}" ]]; then
  echo 'Defina ANDROID_HOME para o SDK Android (API 35 e build-tools 35.0.0).' >&2
  exit 1
fi
export ANDROID_HOME="${ANDROID_HOME:-$ANDROID_SDK_ROOT}"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
command -v java >/dev/null || { echo 'Instale o JDK 21.' >&2; exit 1; }
command -v javac >/dev/null || { echo 'Instale o JDK 21 completo (incluindo javac) e ajuste JAVA_HOME/PATH; um JRE nao compila o APK.' >&2; exit 1; }
javac -version 2>&1 | grep -Eq '^javac 21\.' || { echo 'Use o JDK 21 para compilar este projeto.' >&2; exit 1; }
cd "$raiz"
mkdir -p artefatos
if [[ "${1:-}" != "--sem-web" ]]; then
  node scripts/provisionar-python.mjs
  npm run build
fi
test -f aplicativos/web/dist/index.html || { echo 'Build web ausente: execute npm run build.' >&2; exit 1; }
cd aplicativos/web
npx --no-install cap sync android
cd ../android
./gradlew --no-daemon --console=plain assembleDebug lintDebug 2>&1 | tee "$raiz/artefatos/android-build.log"
cp app/build/outputs/apk/debug/app-debug.apk "$raiz/artefatos/Flow-Programacao-Guiada-0.6.0-debug.apk"
cd "$raiz/artefatos"
sha256sum Flow-Programacao-Guiada-0.6.0-debug.apk > Flow-Programacao-Guiada-0.6.0-debug.apk.sha256
cat Flow-Programacao-Guiada-0.6.0-debug.apk.sha256
