#!/usr/bin/env bash
set -euo pipefail

PACOTE="com.anderflow.flowscan"
adb install -r apk/app-debug.apk
adb shell pm clear "$PACOTE"
adb logcat -c
adb shell am start -n "$PACOTE/.MainActivity"
sleep 8
pid="$(adb shell pidof "$PACOTE" | tr -d '\r')"
test -n "$pid" || { echo "Falha: app não iniciou"; adb logcat -d | tail -200; exit 1; }
echo "Aplicativo iniciou (PID=$pid)"

mkdir -p evidencias
adb exec-out screencap -p > evidencias/inicio-android.png || true
adb shell uiautomator dump /sdcard/flowscan-ui.xml || true
adb pull /sdcard/flowscan-ui.xml evidencias/tela.xml || true

python3 - <<'PY'
import re,subprocess,pathlib
p=pathlib.Path("evidencias/tela.xml")
texto=p.read_text(errors="replace") if p.exists() else ""
itens=re.findall(r'<node[^>]+>',texto)
visiveis=re.findall(r'text="([^"]{3,})"',texto)
print("Texto na tela real:",visiveis[:40])

def tocar(no):
    m=re.search(r'bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"',no)
    if not m:return False
    x1,y1,x2,y2=map(int,m.groups())
    subprocess.run(["adb","shell","input","tap",str((x1+x2)//2),str((y1+y2)//2)],check=True)
    return True

# Primeiro acesso: confirmar que a tela de permissões apareceu quando aplicável.
pedidos=[x for x in itens if "permissioncontroller" in x or "permission_allow" in x]
if pedidos:
    print("Permissões: janela de autorização detectada.")
    for no in itens:
        if 'permission_allow_foreground_only_button' in no or 'permission_allow_button' in no:
            if tocar(no): print("Autorização da câmera acionada");break
else: print("Permissões: nenhuma janela aberta na coleta (pode ter sido respondida).")
PY

sleep 3
adb shell uiautomator dump /sdcard/flowscan-ui2.xml || true
adb pull /sdcard/flowscan-ui2.xml evidencias/tela2.xml || true

python3 - <<'PY'
import re,subprocess,pathlib,time
texto=pathlib.Path("evidencias/tela2.xml").read_text(errors="replace") if pathlib.Path("evidencias/tela2.xml").exists() else ""
itens=re.findall(r'<node[^>]+>',texto)
for chave in ("Importar arquivo ou imagem","Escanear com a câmera"):
    achado=False
    for no in itens:
        if chave not in no: continue
        m=re.search(r'bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"',no)
        if not m:continue
        x1,y1,x2,y2=map(int,m.groups())
        subprocess.run(["adb","shell","input","tap",str((x1+x2)//2),str((y1+y2)//2)],check=True)
        print("Toque efetuado:",chave);achado=True
        time.sleep(2)
        subprocess.run(["adb","shell","input","keyevent","4"],check=True)
        time.sleep(1)
        break
    if not achado:
        print("Aviso: não foi encontrado o elemento no UIAutomator:",chave)
PY

sleep 3
pid="$(adb shell pidof "$PACOTE" | tr -d '\r' || true)"
if [ -z "$pid" ]; then
  echo "ERRO: Flow Scan parou após a interação."
  adb logcat -d -t 4000 | tail -200
  exit 1
fi

adb logcat -d -t 9000 > evidencias/logcat.txt || true
if grep -A 15 'FATAL EXCEPTION' evidencias/logcat.txt | grep -q 'Process: com.anderflow.flowscan'; then
  echo "Erro fatal do Flow Scan no logcat."
  grep -A 25 'FATAL EXCEPTION' evidencias/logcat.txt | tail -180
  exit 1
fi

echo "SMOKE ANDROID: PASSOU — instalou, abriu e permaneceu em execução."
