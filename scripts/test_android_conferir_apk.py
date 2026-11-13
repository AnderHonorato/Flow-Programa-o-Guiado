"""Regressões do gate de distribuição Android (sem SDK)."""
import importlib.util
from pathlib import Path
import unittest

arquivo = Path(__file__).with_name("android-conferir-apk.py")
spec = importlib.util.spec_from_file_location("conferir_apk", arquivo)
modulo = importlib.util.module_from_spec(spec)
spec.loader.exec_module(modulo)

GRADLE = 'applicationId "br.com.ander.flow"\nversionCode 8\nversionName "0.6.2"\n'
BADGING = "package: name='br.com.ander.flow' versionCode='8' versionName='0.6.2'\n"
ASSINATURA = "Signer #1 certificate SHA-256 digest: " + "ab" * 32 + "\n"


class TestarGateAndroid(unittest.TestCase):
    def test_apk_correto_registra_certificado_sem_homologar_a35(self):
        dados = modulo.conferir(GRADLE, BADGING, ASSINATURA)
        self.assertEqual(dados["versionCode"], 8)
        self.assertEqual(dados["compatibilidadeGalaxyA35"], "não verificada")

    def test_rejeita_pacote_diferente(self):
        with self.assertRaises(ValueError):
            modulo.conferir(GRADLE, BADGING.replace("br.com.ander.flow", "outro.app"), ASSINATURA)

    def test_rejeita_version_code_diferente(self):
        with self.assertRaises(ValueError):
            modulo.conferir(GRADLE, BADGING.replace("versionCode='8'", "versionCode='7'"), ASSINATURA)

    def test_rejeita_version_name_diferente(self):
        with self.assertRaises(ValueError):
            modulo.conferir(GRADLE, BADGING.replace("0.6.2", "0.6.0"), ASSINATURA)

    def test_rejeita_certificado_ausente(self):
        with self.assertRaises(ValueError):
            modulo.conferir(GRADLE, BADGING, "")

    def test_rejeita_multiplos_certificados(self):
        with self.assertRaises(ValueError):
            modulo.conferir(GRADLE, BADGING, ASSINATURA + ASSINATURA.replace("#1", "#2"))

    def test_rejeita_gradle_ambiguo(self):
        with self.assertRaises(ValueError):
            modulo.conferir(GRADLE + 'versionName "0.6.3"\n', BADGING, ASSINATURA)


if __name__ == "__main__":
    unittest.main()
