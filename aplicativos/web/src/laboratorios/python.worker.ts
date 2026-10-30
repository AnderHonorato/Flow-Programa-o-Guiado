/// <reference lib="webworker" />
import { restringirApisPython } from './restringirApisPython';
interface Pyodide { runPythonAsync: (codigo: string) => Promise<unknown>; setStdout: (opcoes: { batched: (texto: string) => void }) => void; setStderr: (opcoes: { batched: (texto: string) => void }) => void; }
const contexto = self as unknown as DedicatedWorkerGlobalScope;
let runtime: Pyodide | undefined;
let mensagensSaida = 0;
function emitir(tipo: string, texto: string) {
  if (mensagensSaida++ < 200) contexto.postMessage({ tipo, texto: texto.slice(0, 8000) });
  else if (mensagensSaida === 201) contexto.postMessage({ tipo: 'saida', texto: 'Console limitado a 200 mensagens por execução.' });
}
contexto.onmessage = async (evento: MessageEvent<{ codigo: string }>) => {
  try {
    mensagensSaida = 0;
    if (!runtime) {
      contexto.postMessage({ tipo: 'estado', texto: 'Carregando Python local…' });
      // URL é local e fixa. Código do aluno jamais escolhe dependências ou endereços.
      const enderecoRuntime = new URL('/pyodide/pyodide.mjs', contexto.location.origin).href;
      const modulo = await import(/* @vite-ignore */ enderecoRuntime);
      const carregado: Pyodide | undefined = await modulo.loadPyodide({ indexURL: '/pyodide/', stdout: (texto: string) => emitir('saida', texto), stderr: (texto: string) => emitir('erro', texto) });
      if (!carregado) throw new Error('Runtime Python não inicializou.');
      restringirApisPython(globalThis);
      await carregado.runPythonAsync("import sys\n# Sem instalação dinâmica de pacotes ou entrada interativa.\n");
      // Uma falha ao restringir APIs nunca deixa um runtime liberado ao aluno.
      runtime = carregado;
    }
    contexto.postMessage({ tipo: 'estado', texto: 'Executando Python…' });
    const resultado = await runtime.runPythonAsync(evento.data.codigo);
    if (resultado !== undefined) emitir('saida', String(resultado));
    contexto.postMessage({ tipo: 'concluido' });
  } catch (erro) {
    contexto.postMessage({ tipo: 'erro', texto: String(erro) });
    contexto.postMessage({ tipo: 'concluido' });
  }
};
export {};
