"""Testes da extração de versão Android usada na geração do APK."""
import importlib.util
from pathlib import Path
import unittest

CAMINHO = Path(__file__).with_name("android-versao.py")
spec = importlib.util.spec_from_file_location("android_versao", CAMINHO)
modulo = importlib.util.module_from_spec(spec)
spec.loader.exec_module(modulo)


class TestarVersaoAndroid(unittest.TestCase):
    def test_versao_real_do_gradle(self):
        gradle = Path(__file__).resolve().parents[1] / "aplicativos/android/app/build.gradle"
        self.assertEqual(modulo.extrair(gradle.read_text(encoding="utf-8")), "0.6.2")

    def test_rejeita_versao_duplicada(self):
        with self.assertRaises(ValueError):
            modulo.extrair('versionCode 8\nversionName "0.6.2"\nversionName "0.6.3"')

    def test_rejeita_versao_dinamica_e_codigo_ausente(self):
        for texto in ('versionCode 8\nversionName projeto.versao', 'versionName "0.6.2"'):
            with self.subTest(texto=texto), self.assertRaises(ValueError):
                modulo.extrair(texto)

    def test_aceita_versao_sem_alterar_package_id(self):
        self.assertEqual(modulo.extrair("applicationId 'br.com.ander.flow'\nversionCode 9\nversionName '0.6.3'"), "0.6.3")


if __name__ == "__main__":
    unittest.main()
