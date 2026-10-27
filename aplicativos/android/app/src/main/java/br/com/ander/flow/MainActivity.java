package br.com.ander.flow;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle estadoSalvo) {
        registerPlugin(NarradorNativoPlugin.class);
        super.onCreate(estadoSalvo);
    }
}
