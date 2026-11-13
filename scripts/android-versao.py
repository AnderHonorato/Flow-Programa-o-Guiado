#!/usr/bin/env python3
"""Lê a versão Android canônica sem executar Gradle nem aceitar valores ambíguos."""
import pathlib
import re
import sys

PADRAO = re.compile(r'^\s*versionName\s+["\'](\d+\.\d+\.\d+)["\']\s*$', re.M)
CODIGO = re.compile(r'^\s*versionCode\s+(\d+)\s*$', re.M)


def extrair(texto: str) -> str:
    versoes = PADRAO.findall(texto)
    codigos = CODIGO.findall(texto)
    if len(versoes) != 1 or len(codigos) != 1 or int(codigos[0]) < 1:
        raise ValueError("Gradle deve definir um único versionName X.Y.Z e versionCode positivo")
    return versoes[0]


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("Uso: python3 scripts/android-versao.py caminho/build.gradle")
    try:
        print(extrair(pathlib.Path(sys.argv[1]).read_text(encoding="utf-8")))
    except (OSError, ValueError) as erro:
        sys.exit(f"Versão Android inválida: {erro}")
