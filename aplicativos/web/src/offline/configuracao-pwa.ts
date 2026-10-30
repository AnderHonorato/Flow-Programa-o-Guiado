/** Funções autocontidas: workbox-build serializa seus corpos no service worker. */
export const runtimePacotes = {
  urlPattern: ({ url, request }: { url: URL; request: Request }) => request.method === 'GET' && !request.headers.has('Authorization') && url.origin === self.location.origin && /^\/(?:assets|recursos|conteudos|pyodide)\//.test(url.pathname),
  handler: async ({ request }: { request: Request }): Promise<Response> => {
    if (request.method !== 'GET' || request.headers.has('Authorization') || request.cache === 'no-cache' || request.cache === 'reload') return fetch(request);
    for (const nome of await caches.keys()) {
      if (!nome.startsWith('flow-pacote-')) continue;
      // O download grava pela URL pública, sem cabeçalhos do consumidor.
      // Imports de worker enviam Origin; Vary: Origin não pode esconder o pacote
      // instalado. Usar a mesma chave preserva a comparação de Vary com a entrada.
      const resposta = await (await caches.open(nome)).match(request.url);
      if (resposta) return resposta;
    }
    return fetch(request);
  },
};
