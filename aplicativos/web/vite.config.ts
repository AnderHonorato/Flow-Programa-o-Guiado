import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { runtimePacotes } from './src/offline/configuracao-pwa';

export default defineConfig({
  plugins: [react(), VitePWA({
    registerType: 'prompt',
    includeAssets: ['icone.svg', 'icone-192.png', 'icone-512.png'],
    manifest: {
      name: 'Flow Programação Guiada', short_name: 'Flow', lang: 'pt-BR',
      description: 'Uma escola de programação no seu ritmo.',
      theme_color: '#0c1222', background_color: '#0c1222', display: 'standalone',
      icons: [{src:'/icone-192.png',sizes:'192x192',type:'image/png'}, {src:'/icone-512.png',sizes:'512x512',type:'image/png',purpose:'any maskable'}]
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,svg,png,woff2,json}'],
      globIgnores: ['pyodide/**'],
      maximumFileSizeToCacheInBytes: 5_000_000,
      navigateFallbackDenylist: [/^\/api(?:\/|$)/],
      runtimeCaching: [runtimePacotes]
    }
  })],
  server: {proxy: {'/api': 'http://127.0.0.1:8000'}},
  build: {chunkSizeWarningLimit: 800}
});
