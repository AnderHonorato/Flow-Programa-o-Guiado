import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource-variable/inter';
import '@fontsource/jetbrains-mono/400.css';
import App from './App';
import './estilos/tokens.css';
import './estilos/interface.css';
if ('serviceWorker' in navigator && !import.meta.env.DEV) {
 window.addEventListener('load',()=>void navigator.serviceWorker.register('/sw.js'));
}
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
