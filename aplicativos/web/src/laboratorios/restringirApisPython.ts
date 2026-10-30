// A ponte `import js` usa o mesmo contexto do worker. Restringir estes caminhos
// reduz acesso a dados da origem e criação de outros contextos; não é um sandbox
// completo para código hostil nem impõe limite de memória WebAssembly.
const apisBloqueadas = [
  'indexedDB', 'caches', 'navigator', 'cookieStore', 'sharedStorage', 'openDatabase',
  'requestFileSystem', 'webkitRequestFileSystem',
  'Worker', 'SharedWorker', 'BroadcastChannel',
  'fetch', 'XMLHttpRequest', 'WebSocket', 'WebTransport', 'EventSource', 'importScripts',
] as const;

export function restringirApisPython(contexto: object): void {
  for (const nome of apisBloqueadas) {
    // Sombrear só no global deixa getters nativos recuperáveis via protótipos.
    for (let alvo: object | null = contexto; alvo; alvo = Object.getPrototypeOf(alvo)) {
      const descritor = Object.getOwnPropertyDescriptor(alvo, nome);
      if (alvo !== contexto && !descritor) continue;
      if (descritor?.configurable === false) {
        if ('value' in descritor && descritor.value === undefined && descritor.writable === false) continue;
        throw new Error(`Python indisponível: não foi possível bloquear a API ${nome} neste navegador.`);
      }
      Object.defineProperty(alvo, nome, { value: undefined, configurable: false, writable: false });
    }
  }
}
