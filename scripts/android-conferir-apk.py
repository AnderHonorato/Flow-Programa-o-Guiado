#!/usr/bin/env python3
"""Bloqueia APKs com pacote/versão divergentes e registra o certificado real."""
import argparse
import hashlib
import json
import pathlib
import re
import subprocess
import sys

PACOTE = "br.com.ander.flow"


def campo_unico(texto, padrao, descricao):
    valores = re.findall(padrao, texto, re.MULTILINE)
    if len(valores) != 1:
        raise ValueError(f"{descricao}: esperado um único valor, encontrados {len(valores)}")
    return valores[0]


def conferir(gradle, badging, assinatura):
    pacote_gradle = campo_unico(gradle, r'^\s*applicationId\s+["\']([^"\']+)["\']\s*$', "applicationId")
    versao = campo_unico(gradle, r'^\s*versionName\s+["\'](\d+\.\d+\.\d+)["\']\s*$', "versionName")
    codigo = int(campo_unico(gradle, r'^\s*versionCode\s+(\d+)\s*$', "versionCode"))
    dados = re.findall(r"^package: name='([^']+)' versionCode='(\d+)' versionName='([^']+)'", badging, re.MULTILINE)
    if len(dados) != 1:
        raise ValueError("aapt: pacote/versão ausente ou ambíguo")
    pacote_apk, codigo_apk, versao_apk = dados[0]
    if pacote_gradle != PACOTE or pacote_apk != PACOTE:
        raise ValueError("package ID divergente; não distribuir")
    if codigo < 1 or int(codigo_apk) != codigo or versao_apk != versao:
        raise ValueError("versionCode/versionName divergentes; não distribuir")
    certificados = re.findall(r"^Signer #\d+ certificate SHA-256 digest: ([0-9a-fA-F:]+)$", assinatura, re.MULTILINE)
    if len(certificados) != 1:
        raise ValueError("assinatura ausente, múltipla ou não verificável")
    certificado = certificados[0].replace(":", "").lower()
    if not re.fullmatch(r"[0-9a-f]{64}", certificado):
        raise ValueError("SHA-256 do certificado inválido")
    return {"packageId": PACOTE, "versionName": versao, "versionCode": codigo,
            "certificadoSha256": certificado, "compatibilidadeGalaxyA35": "não verificada"}


def executar(comando):
    return subprocess.run(comando, check=True, text=True, capture_output=True).stdout


def main():
    parser = argparse.ArgumentParser(description="Confere metadados e assinatura do APK sem instalar.")
    parser.add_argument("apk", type=pathlib.Path)
    parser.add_argument("--gradle", type=pathlib.Path, default=pathlib.Path("aplicativos/android/app/build.gradle"))
    parser.add_argument("--aapt", default="aapt")
    parser.add_argument("--apksigner", default="apksigner")
    args = parser.parse_args()
    if not args.apk.is_file():
        parser.error("APK não encontrado")
    try:
        badging = executar([args.aapt, "dump", "badging", str(args.apk)])
        assinatura = executar([args.apksigner, "verify", "--verbose", "--print-certs", str(args.apk)])
        dados = conferir(args.gradle.read_text(encoding="utf-8"), badging, assinatura)
        dados["apkSha256"] = hashlib.sha256(args.apk.read_bytes()).hexdigest()
        print(json.dumps(dados, ensure_ascii=False, indent=2))
    except (OSError, ValueError, subprocess.CalledProcessError) as erro:
        sys.exit(f"APK rejeitado: {erro}")


if __name__ == "__main__":
    main()
