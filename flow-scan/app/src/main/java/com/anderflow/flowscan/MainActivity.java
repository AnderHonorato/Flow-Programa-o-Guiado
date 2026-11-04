package com.anderflow.flowscan;

import android.Manifest;
import android.app.Activity;
import android.content.ContentValues;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.ImageDecoder;
import android.graphics.Paint;
import android.graphics.RectF;
import android.graphics.pdf.PdfDocument;
import android.graphics.pdf.PdfRenderer;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.os.ParcelFileDescriptor;
import android.provider.MediaStore;
import android.provider.OpenableColumns;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebSettings;
import android.widget.Toast;

import com.google.android.gms.auth.api.identity.AuthorizationRequest;
import com.google.android.gms.auth.api.identity.AuthorizationResult;
import com.google.android.gms.auth.api.identity.Identity;
import com.google.android.gms.common.api.Scope;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

public class MainActivity extends Activity {
    private static final int CAMERA = 40, ARQUIVOS = 41, AUTORIZACAO = 42;
    private static final String DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
    private WebView pagina;
    private Uri fotoCapturada;
    private final Object trava = new Object();
    private final ArrayList<Bitmap> exportacao = new ArrayList<>();
    private String formato = "pdf", nome = "Digitalizacao";
    private volatile boolean enviando = false;
    private volatile String tokenTemporario = null;

    @Override public void onCreate(Bundle estado) {
        super.onCreate(estado);
        getWindow().setStatusBarColor(Color.rgb(249,244,237));
        getWindow().setNavigationBarColor(Color.rgb(249,244,237));
        getWindow().getDecorView().setSystemUiVisibility(android.view.View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR |
            android.view.View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);
        pagina = new WebView(this);
        WebSettings s = pagina.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(false);
        s.setMediaPlaybackRequiresUserGesture(true);
        pagina.setBackgroundColor(Color.rgb(249,244,237));
        pagina.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, android.webkit.WebResourceRequest req) {
                return !req.getUrl().toString().startsWith("file:///android_asset/");
            }
        });
        pagina.addJavascriptInterface(new Ponte(), "Android");
        setContentView(pagina);
        pagina.loadUrl("file:///android_asset/index.html");
        if (android.os.Build.VERSION.SDK_INT >= 23 && checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            pagina.postDelayed(() -> requestPermissions(new String[]{Manifest.permission.CAMERA}, CAMERA), 950);
        }
        if (getPreferences(MODE_PRIVATE).getBoolean("drive_ativo", false))
            pagina.postDelayed(() -> autorizarDrive(false), 1750);
    }

    private void script(String texto) {
        runOnUiThread(() -> { if (pagina != null) pagina.evaluateJavascript(texto, null); });
    }
    private void aviso(String texto) {
        script("window.flowScanStatus(" + JSONObject.quote(texto) + ");");
    }
    private void mensagem(String texto) {
        runOnUiThread(() -> Toast.makeText(this, texto, Toast.LENGTH_LONG).show());
        aviso(texto);
    }
    private String nomeSeguro(String s) {
        String t = s == null ? "" : s.trim().replaceAll("[\\\\/:*?\"<>|\\p{Cntrl}]", "-");
        if (t.length() > 65) t = t.substring(0,65);
        return t.isEmpty() ? "Digitalizacao" : t;
    }
    private void camera() {
        if (checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.CAMERA}, CAMERA);
            return;
        }
        try {
            ContentValues valores = new ContentValues();
            valores.put(MediaStore.Images.Media.DISPLAY_NAME, "flow-scan-" + System.currentTimeMillis() + ".jpg");
            valores.put(MediaStore.Images.Media.MIME_TYPE, "image/jpeg");
            valores.put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/FlowScan");
            fotoCapturada = getContentResolver().insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, valores);
            if (fotoCapturada == null) throw new Exception("Nao foi possivel criar a foto");
            Intent intent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
            intent.putExtra(MediaStore.EXTRA_OUTPUT, fotoCapturada);
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
            startActivityForResult(intent, CAMERA);
        } catch (Exception e) { mensagem("Câmera indisponível: " + e.getMessage()); }
    }
    private void importar() {
        Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        i.setType("*/*");
        i.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{"image/jpeg","image/png","image/webp","image/heic","image/heif","application/pdf"});
        i.addCategory(Intent.CATEGORY_OPENABLE);
        i.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
        startActivityForResult(i, ARQUIVOS);
    }
    @Override public void onRequestPermissionsResult(int request, String[] perms, int[] results) {
        super.onRequestPermissionsResult(request,perms,results);
        if(request == CAMERA && results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED)
            aviso("Câmera autorizada. Pronto para digitalizar.");
        else if(request == CAMERA) aviso("A câmera não foi autorizada. Você ainda pode importar arquivos.");
    }
    @Override protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        if (request == AUTORIZACAO) {
            if (result == RESULT_OK && data != null) {
                try {
                    AuthorizationResult r = Identity.getAuthorizationClient(this).getAuthorizationResultFromIntent(data);
                    conectado(r);
                } catch (Exception e) { mensagem("Não foi possível conectar ao Drive."); }
            } else aviso("Conexão com o Drive cancelada.");
            return;
        }
        if (request == CAMERA) {
            Uri foto = fotoCapturada;
            fotoCapturada = null;
            if (result == RESULT_OK && foto != null) processarArquivo(foto);
            else if (foto != null) getContentResolver().delete(foto,null,null);
        } else if (request == ARQUIVOS && result == RESULT_OK && data != null) {
            if (data.getClipData() != null) {
                int qtd = Math.min(30, data.getClipData().getItemCount());
                for(int n=0;n<qtd;n++) processarArquivo(data.getClipData().getItemAt(n).getUri());
            } else if (data.getData() != null) processarArquivo(data.getData());
        }
    }
    private String consultarNome(Uri uri) {
        try(Cursor c=getContentResolver().query(uri,new String[]{OpenableColumns.DISPLAY_NAME},null,null,null)) {
            if (c!=null && c.moveToFirst()) return c.getString(0);
        }catch(Exception ignored){}
        return "Pagina";
    }
    private void processarArquivo(Uri uri) {
        new Thread(() -> {
            try {
                String titulo = consultarNome(uri);
                String mime = getContentResolver().getType(uri);
                if ((mime!=null && mime.equals("application/pdf")) || titulo.toLowerCase().endsWith(".pdf")) {
                    try(ParcelFileDescriptor descriptor = getContentResolver().openFileDescriptor(uri,"r");
                        PdfRenderer render = new PdfRenderer(descriptor)) {
                        int limite = Math.min(render.getPageCount(), 20);
                        for(int i=0;i<limite;i++) {
                            try(PdfRenderer.Page p = render.openPage(i)) {
                                int w = Math.min(p.getWidth()*2,1600);
                                int h = Math.max(1,Math.round(w * (float)p.getHeight()/p.getWidth()));
                                Bitmap bmp = Bitmap.createBitmap(w,h,Bitmap.Config.ARGB_8888);
                                bmp.eraseColor(Color.WHITE);
                                p.render(bmp,null,null,PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY);
                                entregarImagem(bmp,titulo+" · "+(i+1));
                            }
                        }
                    }
                } else {
                    ImageDecoder.Source fonte = ImageDecoder.createSource(getContentResolver(),uri);
                    Bitmap bmp = ImageDecoder.decodeBitmap(fonte,(decoder,info,source) -> {
                        int w=info.getSize().getWidth(), h=info.getSize().getHeight();
                        float escala=Math.min(1f,1800f/Math.max(w,h));
                        decoder.setTargetSize(Math.max(1,Math.round(w*escala)),Math.max(1,Math.round(h*escala)));
                        decoder.setAllocator(ImageDecoder.ALLOCATOR_SOFTWARE);
                    });
                    entregarImagem(bmp,titulo);
                }
            } catch(Exception e) { mensagem("Não foi possível importar: " + e.getMessage()); }
        }, "importador").start();
    }
    private void entregarImagem(Bitmap imagem, String titulo) throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        imagem.compress(Bitmap.CompressFormat.JPEG,88,out);
        imagem.recycle();
        String base64 = Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP);
        script("window.flowScanReceberImagem('data:image/jpeg;base64,"+base64+"',"+JSONObject.quote(titulo)+");");
    }

    public final class Ponte {
        @JavascriptInterface public void camera() { runOnUiThread(() -> camera()); }
        @JavascriptInterface public void importar() { runOnUiThread(() -> importar()); }
        @JavascriptInterface public void conectarDrive() { runOnUiThread(() -> autorizarDrive(true)); }
        @JavascriptInterface public void exportarInicio(String f, String n) {
            synchronized(trava) {
                for(Bitmap b:exportacao) b.recycle();
                exportacao.clear();
                formato=f.toLowerCase();
                nome=nomeSeguro(n);
            }
        }
        @JavascriptInterface public void exportarPagina(String base64) {
            try {
                String payload=base64.substring(base64.indexOf(',')+1);
                byte[] bytes=Base64.decode(payload,Base64.DEFAULT);
                Bitmap bmp=BitmapFactory.decodeByteArray(bytes,0,bytes.length);
                if(bmp==null) throw new Exception("Imagem inválida");
                synchronized(trava){exportacao.add(bmp);}
            } catch(Exception e){aviso("Erro na página: "+e.getMessage());}
        }
        @JavascriptInterface public void exportarFim() {
            final ArrayList<Bitmap> capturas;
            final String f,n;
            synchronized(trava) {
                capturas=new ArrayList<>(exportacao);
                exportacao.clear(); f=formato; n=nome;
            }
            new Thread(() -> {
                try { salvarExportacao(capturas,f,n); }
                catch(Exception e) { mensagem("Falha ao exportar: "+e.getMessage()); }
                finally { for(Bitmap b:capturas) if(!b.isRecycled()) b.recycle(); }
            },"exportador").start();
        }
    }
    private void salvarExportacao(List<Bitmap> paginas,String f,String nome) throws Exception {
        if(paginas.isEmpty()) { aviso("Nenhuma página disponível."); return; }
        byte[] bytes;
        String extensao,mime;
        if(f.equals("pdf")) {
            PdfDocument documento = new PdfDocument();
            for(int i=0;i<paginas.size();i++) {
                Bitmap bmp=paginas.get(i);
                PdfDocument.PageInfo info = new PdfDocument.PageInfo.Builder(595,842,i+1).create();
                PdfDocument.Page paginaPDF=documento.startPage(info);
                Canvas tela=paginaPDF.getCanvas();
                tela.drawColor(Color.WHITE);
                float k=Math.min(555f/bmp.getWidth(),802f/bmp.getHeight());
                float w=bmp.getWidth()*k,h=bmp.getHeight()*k;
                Paint tinta=new Paint(Paint.ANTI_ALIAS_FLAG|Paint.FILTER_BITMAP_FLAG);
                tela.drawBitmap(bmp,null,new RectF((595-w)/2,(842-h)/2,(595+w)/2,(842+h)/2),tinta);
                documento.finishPage(paginaPDF);
            }
            ByteArrayOutputStream out=new ByteArrayOutputStream();
            documento.writeTo(out);documento.close();
            bytes=out.toByteArray();extensao=".pdf";mime="application/pdf";
        } else if(paginas.size()==1) {
            ByteArrayOutputStream out=new ByteArrayOutputStream();
            boolean png=f.equals("png");
            paginas.get(0).compress(png?Bitmap.CompressFormat.PNG:Bitmap.CompressFormat.JPEG,png?100:94,out);
            bytes=out.toByteArray();
            extensao=png?".png":".jpg";mime=png?"image/png":"image/jpeg";
        } else {
            ByteArrayOutputStream out=new ByteArrayOutputStream();
            try(ZipOutputStream zip=new ZipOutputStream(out)) {
                for(int i=0;i<paginas.size();i++) {
                    String ext=f.equals("png")?".png":".jpg";
                    zip.putNextEntry(new ZipEntry(String.format(java.util.Locale.ROOT,"pagina-%02d",i+1)+ext));
                    ByteArrayOutputStream b=new ByteArrayOutputStream();
                    paginas.get(i).compress(f.equals("png")?Bitmap.CompressFormat.PNG:Bitmap.CompressFormat.JPEG,94,b);
                    zip.write(b.toByteArray());zip.closeEntry();
                }
            }
            bytes=out.toByteArray();extensao=".zip";mime="application/zip";
        }
        String nomeArquivo=nome+"-"+System.currentTimeMillis()+extensao;
        ContentValues valores=new ContentValues();
        valores.put(MediaStore.Downloads.DISPLAY_NAME,nomeArquivo);
        valores.put(MediaStore.Downloads.MIME_TYPE,mime);
        valores.put(MediaStore.Downloads.RELATIVE_PATH,Environment.DIRECTORY_DOWNLOADS+"/FlowScan");
        Uri destino=getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI,valores);
        if(destino==null)throw new Exception("Sem acesso à pasta Downloads");
        try(OutputStream out=getContentResolver().openOutputStream(destino)){out.write(bytes);}
        aviso("Salvo em Downloads/FlowScan: "+nomeArquivo);
        File pasta=new File(getFilesDir(),"pendentes");
        if(!pasta.exists() && !pasta.mkdirs()) throw new Exception("Falha ao criar fila de backup");
        File pendente=new File(pasta,nomeArquivo);
        try(FileOutputStream out=new FileOutputStream(pendente)){out.write(bytes);}
        if(getPreferences(MODE_PRIVATE).getBoolean("drive_ativo",false))
            runOnUiThread(() -> autorizarDrive(false));
        else aviso("Arquivo salvo. Conecte o Drive para ativar o backup automático.");
    }
    private void autorizarDrive(boolean mostrar) {
        AuthorizationRequest req=AuthorizationRequest.builder()
            .setRequestedScopes(Arrays.asList(new Scope(DRIVE_SCOPE))).build();
        Identity.getAuthorizationClient(this).authorize(req)
            .addOnSuccessListener(r -> {
                if(r.hasResolution()) {
                    if(!mostrar && !getPreferences(MODE_PRIVATE).getBoolean("drive_ativo",false))return;
                    try { startIntentSenderForResult(r.getPendingIntent().getIntentSender(),AUTORIZACAO,null,0,0,0); }
                    catch(Exception e){ mensagem("Não foi possível abrir autorização do Drive."); }
                } else conectado(r);
            })
            .addOnFailureListener(e -> mensagem("Drive não autorizado: "+e.getMessage()));
    }
    private void conectado(AuthorizationResult r) {
        tokenTemporario=r.getAccessToken();
        if(tokenTemporario==null || tokenTemporario.isEmpty()) {
            aviso("Não foi recebido acesso ao Drive. Confira a configuração OAuth.");
            return;
        }
        getPreferences(MODE_PRIVATE).edit().putBoolean("drive_ativo",true).apply();
        script("window.flowScanDrive(true);");
        aviso("Drive conectado! Enviando documentos pendentes.");
        enviarPendentes();
    }
    private void enviarPendentes() {
        if(enviando || tokenTemporario==null) return;
        enviando=true;
        final String token=tokenTemporario;
        new Thread(() -> {
            try {
                File pasta=new File(getFilesDir(),"pendentes");
                File[] arquivos=pasta.listFiles();
                if(arquivos==null || arquivos.length==0){aviso("Backup do Drive em dia.");return;}
                String folderId=obterPastaDrive(token);
                for(File arquivo:arquivos) {
                    String tipo=arquivo.getName().endsWith(".pdf")?"application/pdf":
                        arquivo.getName().endsWith(".png")?"image/png":
                        arquivo.getName().endsWith(".jpg")?"image/jpeg":"application/zip";
                    enviarArquivoDrive(token,folderId,arquivo,tipo);
                    if(!arquivo.delete()) android.util.Log.w("FlowScan","Pendente sincronizado, mas não removido");
                    aviso("Drive atualizado: "+arquivo.getName());
                }
                aviso("Tudo sincronizado com o Google Drive.");
            } catch(Exception e) { aviso("Backup pendente (sem perder o arquivo local): "+e.getMessage()); }
            finally {enviando=false;}
        },"sincronizador").start();
    }
    private JSONObject chamadaJSON(String metodo,String url,String token,byte[] corpo,String contentType) throws Exception {
        HttpURLConnection c=(HttpURLConnection)new URL(url).openConnection();
        c.setConnectTimeout(20000);c.setReadTimeout(45000);
        c.setRequestMethod(metodo);
        c.setRequestProperty("Authorization","Bearer "+token);
        if(corpo!=null) {
            c.setDoOutput(true);c.setRequestProperty("Content-Type",contentType);
            try(OutputStream out=c.getOutputStream()){out.write(corpo);}
        }
        int status=c.getResponseCode();
        InputStream entrada=status>=200&&status<300?c.getInputStream():c.getErrorStream();
        String resposta="";
        if(entrada!=null) try(InputStream in=entrada){resposta=new String(in.readAllBytes(),StandardCharsets.UTF_8);}
        c.disconnect();
        if(status<200||status>=300) throw new Exception("Google Drive HTTP "+status+" "+(status==401?"(sessão expirada)":""));
        return resposta.isEmpty()?new JSONObject():new JSONObject(resposta);
    }
    private String obterPastaDrive(String token) throws Exception {
        String id=getPreferences(MODE_PRIVATE).getString("pasta_drive",null);
        if(id!=null&&!id.isEmpty())return id;
        JSONObject meta=new JSONObject();
        meta.put("name","Flow Scan");
        meta.put("mimeType","application/vnd.google-apps.folder");
        JSONObject resultado=chamadaJSON("POST","https://www.googleapis.com/drive/v3/files?fields=id",
            token,meta.toString().getBytes(StandardCharsets.UTF_8),"application/json; charset=utf-8");
        id=resultado.getString("id");
        getPreferences(MODE_PRIVATE).edit().putString("pasta_drive",id).apply();
        return id;
    }
    private void enviarArquivoDrive(String token,String pasta,File arquivo,String mime) throws Exception {
        String limite="flow-scan-"+UUID.randomUUID().toString().replace("-","");
        JSONObject meta=new JSONObject().put("name",arquivo.getName()).put("mimeType",mime)
            .put("parents",new JSONArray().put(pasta));
        ByteArrayOutputStream corpo=new ByteArrayOutputStream();
        corpo.write(("--"+limite+"\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n"
            +meta.toString()+"\r\n--"+limite+"\r\nContent-Type: "+mime+"\r\n\r\n").getBytes(StandardCharsets.UTF_8));
        try(FileInputStream in=new FileInputStream(arquivo)){in.transferTo(corpo);}
        corpo.write(("\r\n--"+limite+"--").getBytes(StandardCharsets.UTF_8));
        chamadaJSON("POST","https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name",
            token,corpo.toByteArray(),"multipart/related; boundary="+limite);
    }
    @Override public void onBackPressed() {
        script("window.flowScanVoltar();");
    }
    @Override public void onDestroy() {
        if(pagina!=null){pagina.removeJavascriptInterface("Android");pagina.destroy();pagina=null;}
        super.onDestroy();
    }
}
