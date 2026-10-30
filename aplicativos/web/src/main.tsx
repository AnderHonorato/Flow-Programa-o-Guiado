import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource-variable/inter';
import '@fontsource/jetbrains-mono/400.css';
import App from './App';
import { AudioProvider } from './audio/AudioProvider';
import { JarvisProvider } from './mascote/Jarvis';
import './estilos/tokens.css';
import './estilos/interface.css';
import './estilos/experiencia-app.css';
import './estilos/interacoes.css';
if ('serviceWorker' in navigator && !import.meta.env.DEV) {
 window.addEventListener('load',()=>void navigator.serviceWorker.register('/sw.js'));
}
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><AudioProvider><JarvisProvider><App /></JarvisProvider></AudioProvider></React.StrictMode>);
