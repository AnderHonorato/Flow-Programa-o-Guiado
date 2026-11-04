# Flow Scan — Digitalizador Android

Aplicativo Android 10+ com interface editorial 2D e animações leves.

## Funcionalidades
- Captura via câmera do sistema, com solicitação de permissão na primeira abertura.
- Importação de JPG, PNG, WEBP, HEIC e até 20 páginas de PDF, usando o seletor seguro do Android, sem precisar de permissão para toda a galeria.
- Recorte poligonal (3 a 14 vértices). Arraste qualquer ponto ou um segmento inteiro; adicione/remova pontos e gire a página.
- Filtros Natural, Nítido, Cinza e Preto & Branco.
- Exportação de PDF multipágina A4, PNG ou JPG. Múltiplas imagens são agrupadas em um ZIP.
- Salvamento local em Downloads/FlowScan e fila de backup privado para o Google Drive.
- Drive via Google Identity Services com escopo mínimo `drive.file`, renovação de token na próxima abertura e reenvio dos arquivos pendentes.

## Backup pelo seletor Android (recomendado)
Toque em **Conectar Drive → Escolher uma pasta do Drive**, selecione uma pasta gravável no provedor Google Drive do Android e permita acesso. O app copia cada arquivo novo para essa pasta e reenvia pendências quando o aplicativo for aberto novamente. O seletor depende de o app Google Drive disponibilizar pastas graváveis pelo Android SAF; em alguns aparelhos o Drive não aparece.

A opção **Autorizar conta Google** existe como alternativa, mas requer a configuração OAuth descrita abaixo.

## Atenção: configuração Google Drive
Para autorizar uploads via OAuth, o Google exige um projeto no Google Cloud:
1. Ativar a **Google Drive API** no Google Cloud Console.
2. Configurar marca e tela de consentimento OAuth; para teste, adicionar sua conta como testadora quando exigido.
3. Criar cliente OAuth do tipo **Android** com o pacote `com.anderflow.flowscan` e o SHA-1 do certificado usado na instalação.
4. Como o APK gerado automaticamente usa assinatura de debug do runner GitHub, cada execução pode produzir um SHA-1 distinto. Para **backup automático confiável e atualizações sem desinstalar**, configure uma assinatura de release estável e armazene seu keystore com segurança (não no GitHub público). Configure esse SHA-1 no Google Cloud antes de distribuir.

Sem a configuração OAuth, **a digitalização e o salvamento local funcionam**, mas o backup automático não poderá receber acesso ao Drive. Nunca informe que houve sincronização sem confirmação de upload.

Os uploads são feitos diretamente do Android ao Drive, sem servidor intermediário. A pasta de destino da conta Google chama-se `Flow Scan`, criada pelo próprio app.

## Compilar
Projeto Gradle em `flow-scan/`. Abra no Android Studio ou execute:
```bash
cd flow-scan
gradle :app:assembleDebug
```
A pipeline `.github/workflows/flow-scan-apk.yml` compila o APK da branch `flow-scan-digitalizador`.

## Limitações desta versão
- O recorte livre preserva o polígono, sem correção perspectiva automática.
- Documentos exportados são renderizados em até aproximadamente 1900 pixels no maior lado. Não há OCR nem texto pesquisável.
- O sync é automático após exportar enquanto o aplicativo estiver aberto e a conta estiver autorizada, com reenvio de pendências na próxima abertura; não há serviço contínuo com o app fechado.
- PDF importado é rasterizado em imagem antes do recorte.
- A câmera pode salvar uma cópia original em Imagens/FlowScan.

## Privacidade
Nenhum arquivo é enviado a servidores de terceiros; os documentos são gravados localmente e enviados diretamente à conta Google autorizada, quando habilitado.
