import type { CapacitorConfig } from '@capacitor/cli';

const configuracao: CapacitorConfig = {
  appId: 'br.com.ander.flow',
  appName: 'Flow Programação Guiada',
  webDir: 'dist',
  server: {
    errorPath: 'webview-antiga.html',
  },
  android: {
    path: '../android',
    backgroundColor: '#F5F2ED',
    allowMixedContent: false,
    minWebViewVersion: 107,
    adjustMarginsForEdgeToEdge: 'auto',
  },
};

export default configuracao;
