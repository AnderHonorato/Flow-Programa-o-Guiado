# Gate de metadados e assinatura do APK

O script `scripts/android-conferir-apk.py` verifica o APK **real** com `aapt dump badging` e `apksigner verify --verbose --print-certs`, comparando applicationId, versionName e versionCode com o Gradle. Falha se houver divergência, certificado ausente ou múltiplos certificados. Imprime JSON com SHA-256 do APK e certificado, sem incluir segredos.

Exemplo (SDK instalado):

```bash
python3 -m unittest discover -s scripts -p 'test_android*.py'
python3 scripts/android-conferir-apk.py artefatos/Flow-Programacao-Guiada-v0.6.2-debug.apk --aapt "$ANDROID_HOME/build-tools/35.0.0/aapt" --apksigner "$ANDROID_HOME/build-tools/35.0.0/apksigner" > artefatos/metadados-apk.json
```

**Importante:** aprovação deste gate e instalação em emulador não homologam atualização no Galaxy A35. É necessário comparar o SHA-256 do certificado do aplicativo já instalado no dispositivo, sem desinstalar nem limpar dados. Um APK debug assinado com chave de teste não deve ser publicado como atualização segura. O gate não altera package ID, versionCode, versão, chave ou dados.
