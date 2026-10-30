package br.com.ander.flow;

import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.speech.tts.Voice;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

/** Ponte TTS local: nenhum audio ou texto e enviado a um servidor pelo plugin. */
@CapacitorPlugin(name = "NarradorNativo")
public class NarradorNativoPlugin extends Plugin {
    private TextToSpeech narrador;
    private Boolean inicializado;
    private final List<Runnable> aguardando = new ArrayList<>();

    @Override
    public void load() {
        getActivity().runOnUiThread(() -> {
            narrador = new TextToSpeech(getContext(), estado -> getActivity().runOnUiThread(() ->
                concluirInicializacao(estado == TextToSpeech.SUCCESS)));
            narrador.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                @Override public void onStart(String id) { emitir("inicio", id, null, false); }
                @Override public void onDone(String id) { emitir("fim", id, null, false); }
                @Override public void onError(String id) { emitir("erro", id, "Falha na voz local.", false); }
                @Override public void onStop(String id, boolean interrompida) { emitir("fim", id, null, true); }
            });
        });
    }

    private void concluirInicializacao(boolean pronto) {
        inicializado = pronto;
        List<Runnable> pendentes = new ArrayList<>(aguardando);
        aguardando.clear();
        for (Runnable pendente : pendentes) pendente.run();
    }

    private void emitir(String evento, String id, String erro, boolean cancelado) {
        JSObject dados = new JSObject();
        dados.put("id", id);
        dados.put("cancelado", cancelado);
        if (erro != null) dados.put("erro", erro);
        notifyListeners(evento, dados);
    }

    private void quandoPronto(PluginCall chamada, Runnable acao) {
        getActivity().runOnUiThread(() -> {
            Runnable executar = () -> {
                if (!Boolean.TRUE.equals(inicializado) || narrador == null) {
                    chamada.reject("Nenhum mecanismo de voz local esta disponivel.", "TTS_INDISPONIVEL");
                    return;
                }
                acao.run();
            };
            if (inicializado == null) aguardando.add(executar);
            else executar.run();
        });
    }

    private boolean idiomaPermitido(Locale idioma) {
        return ("pt".equals(idioma.getLanguage()) && "BR".equals(idioma.getCountry()))
            || "en".equals(idioma.getLanguage());
    }

    private boolean mesmoIdioma(Locale voz, Locale pedido) {
        return "en".equals(pedido.getLanguage()) ? "en".equals(voz.getLanguage())
            : "pt".equals(voz.getLanguage()) && "BR".equals(voz.getCountry());
    }

    @PluginMethod
    public void vozes(PluginCall chamada) {
        quandoPronto(chamada, () -> {
            JSArray lista = new JSArray();
            Set<Voice> vozes = narrador.getVoices();
            if (vozes != null) {
                for (Voice voz : vozes) {
                    if (!idiomaPermitido(voz.getLocale()) || voz.isNetworkConnectionRequired()) continue;
                    JSObject item = new JSObject();
                    item.put("id", voz.getName());
                    item.put("nome", voz.getName());
                    item.put("idioma", voz.getLocale().toLanguageTag());
                    item.put("local", !voz.isNetworkConnectionRequired());
                    lista.put(item);
                }
            }
            JSObject resultado = new JSObject();
            resultado.put("vozes", lista);
            chamada.resolve(resultado);
        });
    }

    @PluginMethod
    public void falar(PluginCall chamada) {
        String texto = chamada.getString("texto", "").trim();
        if (texto.isEmpty() || texto.length() > TextToSpeech.getMaxSpeechInputLength()) {
            chamada.reject("O trecho esta vazio ou excede o limite do mecanismo TTS.", "TEXTO_INVALIDO");
            return;
        }
        quandoPronto(chamada, () -> {
            Locale idioma = Locale.forLanguageTag(chamada.getString("idioma", "pt-BR").replace('_', '-'));
            if (!idiomaPermitido(idioma)) {
                chamada.reject("Selecione portugues do Brasil ou ingles para a leitura.", "IDIOMA_NAO_PERMITIDO");
                return;
            }
            String vozId = chamada.getString("voz");
            Voice escolhida = null;
            Set<Voice> vozes = narrador.getVoices();
            if (vozes != null) {
                for (Voice voz : vozes) {
                    if (voz.isNetworkConnectionRequired() || !idiomaPermitido(voz.getLocale()) || !mesmoIdioma(voz.getLocale(), idioma)) continue;
                    if (vozId != null ? voz.getName().equals(vozId) : voz.getLocale().equals(idioma)) {
                        escolhida = voz;
                        break;
                    }
                }
                if (escolhida == null && vozId == null) {
                    for (Voice voz : vozes) {
                        if (!voz.isNetworkConnectionRequired() && idiomaPermitido(voz.getLocale()) && mesmoIdioma(voz.getLocale(), idioma)) {
                            escolhida = voz;
                            break;
                        }
                    }
                }
            }
            if (escolhida == null || narrador.setVoice(escolhida) != TextToSpeech.SUCCESS) {
                chamada.reject("Instale uma voz local em portugues do Brasil ou ingles nas configuracoes de sintese de voz do Android.", "VOZ_LOCAL_INDISPONIVEL");
                return;
            }
            Double velocidade = chamada.getDouble("velocidade", 1.0);
            Double volume = chamada.getDouble("volume", 1.0);
            if (velocidade.isNaN() || velocidade.isInfinite() || volume.isNaN() || volume.isInfinite()) {
                chamada.reject("Velocidade ou volume invalido.", "OPCOES_INVALIDAS");
                return;
            }
            narrador.setSpeechRate((float) Math.max(0.5, Math.min(2.0, velocidade)));
            Bundle parametros = new Bundle();
            parametros.putFloat(TextToSpeech.Engine.KEY_PARAM_VOLUME, (float) Math.max(0, Math.min(1, volume)));
            String id = chamada.getString("id", UUID.randomUUID().toString());
            if (narrador.speak(texto, TextToSpeech.QUEUE_FLUSH, parametros, id) == TextToSpeech.ERROR) {
                chamada.reject("O mecanismo local nao iniciou a leitura.", "TTS_ERRO");
                return;
            }
            chamada.resolve();
        });
    }

    @PluginMethod
    public void parar(PluginCall chamada) {
        quandoPronto(chamada, () -> {
            narrador.stop();
            chamada.resolve();
        });
    }

    @Override
    protected void handleOnDestroy() {
        concluirInicializacao(false);
        if (narrador != null) {
            narrador.stop();
            narrador.shutdown();
            narrador = null;
        }
        super.handleOnDestroy();
    }
}
