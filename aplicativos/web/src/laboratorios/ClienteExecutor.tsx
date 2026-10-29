import { useEffect, useRef, useState } from 'react';
import { requisitar, type Sessao } from '../componentes/api';
import Icone from '../componentes/Icone';
import Seletor from '../componentes/Seletor';
interface ResultadoRemoto {
  status: 'concluido' | 'erro' | 'tempo_excedido' | 'saida_excedida';
  codigoSaida: number | null; saida: string; duracaoMs: number;
  respostaHttp?: { status: number; corpo: string; truncada: boolean } | null;
}
const exemploServidor = 'from http.server import BaseHTTPRequestHandler, HTTPServer\nimport json\n\nclass Aplicacao(BaseHTTPRequestHandler):\n    def do_GET(self):\n        if self.path != "/oficinas":\n            self.send_error(404)\n            return\n        corpo = json.dumps({"oficinas": []}).encode()\n        self.send_response(200)\n        self.send_header("Content-Type", "application/json")\n        self.end_headers()\n        self.wfile.write(corpo)\n\nHTTPServer(("127.0.0.1", 8000), Aplicacao).serve_forever()';
export default function ClienteExecutor({ perfilId, codigo }: { perfilId: string; codigo: string }) {
  const [permitido, setPermitido] = useState(false);
  const [linguagem, setLinguagem] = useState<'node' | 'backend-python'>('node');
  const [servidor, setServidor] = useState(exemploServidor);
  const [metodo, setMetodo] = useState<'GET' | 'POST'>('GET');
  const [caminho, setCaminho] = useState('/oficinas');
  const [corpo, setCorpo] = useState('{"nome":"Leitura","vagas":0}');
  const [ocupado, setOcupado] = useState(false);
  const [saida, setSaida] = useState('A execução remota precisa de conexão, conta e serviço configurado.');
  const controle = useRef<AbortController | null>(null);
  useEffect(() => () => controle.current?.abort(), []);
  async function executar() {
    if (!permitido || ocupado) return;
    setOcupado(true);
    const abortar = new AbortController(); controle.current = abortar;
    const limite = setTimeout(() => abortar.abort(), 12000);
    try {
      if (!navigator.onLine) throw new Error('Você está offline. Use a prévia local e execute no servidor quando tiver conexão.');
      let sessao: Sessao | null;
      try { sessao = JSON.parse(sessionStorage.getItem('flow-sessao') || 'null'); } catch { sessao = null; }
      if (!sessao?.token || sessao.usuario?.id !== perfilId) throw new Error('Entre na sua conta para executar no servidor isolado. O código continua neste dispositivo.');
      const codigoEnviar = linguagem === 'node' ? codigo : servidor;
      if (new TextEncoder().encode(codigoEnviar).length > 32768) throw new Error('O executor remoto aceita até 32 KiB de código por execução.');
      if (linguagem === 'backend-python' && (!caminho.startsWith('/') || caminho.startsWith('//') || caminho.includes('://'))) throw new Error('Informe um caminho interno como /oficinas, sem domínio.');
      setSaida('Executando no servidor isolado…');
      const resultado = await requisitar<ResultadoRemoto>('/execucoes', sessao.token, { method: 'POST', signal: abortar.signal, body: JSON.stringify({ linguagem, codigo: codigoEnviar, ...(linguagem === 'backend-python' ? { requisicaoHttp: { metodo, caminho, ...(metodo === 'POST' ? { corpo } : {}) } } : {}) }) });
      setSaida(`${({ concluido: 'Concluído', erro: 'Erro de execução', tempo_excedido: 'Tempo excedido', saida_excedida: 'Saída excedida' })[resultado.status]} · ${resultado.duracaoMs} ms · saída ${resultado.codigoSaida ?? 'sem código'}\n${resultado.saida}${resultado.respostaHttp ? `\n\nHTTP ${resultado.respostaHttp.status}\n${resultado.respostaHttp.corpo}${resultado.respostaHttp.truncada ? '\nResposta limitada a 4 KiB.' : ''}` : ''}`);
    } catch (erro) { if (!abortar.signal.aborted) setSaida(erro instanceof Error ? erro.message : String(erro)); else setSaida('A execução remota foi cancelada ou excedeu o tempo de espera. Seu código local foi preservado.'); }
    finally { clearTimeout(limite); if (controle.current === abortar) controle.current = null; setOcupado(false); }
  }
  return <section className="lab-cliente-api" aria-label="Servidor de exercícios isolado"><h4>Prática online com servidor real</h4><p>Envie o código somente ao acionar a execução. O ambiente remoto dura uma execução, sem persistência ou acesso à internet: limite de 5 segundos e 128 MiB. O serviço pode estar desativado neste ambiente.</p><label><input type="checkbox" checked={permitido} disabled={ocupado} onChange={evento => setPermitido(evento.target.checked)} /> Permitir envio deste código ao executor remoto</label><div className="lab-api-linha"><Seletor rotulo="Ambiente" valor={linguagem} desabilitado={ocupado} aoMudar={valor => setLinguagem(valor as typeof linguagem)} opcoes={[{ valor: 'node', rotulo: 'Node.js · script.js atual' }, { valor: 'backend-python', rotulo: 'Servidor HTTP em Python' }]}/><button type="button" onClick={executar} disabled={!permitido || ocupado}><Icone nome="play" tamanho={15} />{ocupado ? 'Executando…' : 'Executar no servidor isolado'}</button>{ocupado && <button type="button" onClick={() => controle.current?.abort()}>Cancelar espera</button>}</div>{linguagem === 'backend-python' && <><p>O exemplo abaixo é temporário nesta tela. Seu servidor deve escutar 127.0.0.1:8000; a requisição acontece dentro do mesmo ambiente isolado.</p><label>Código do servidor Python<textarea value={servidor} disabled={ocupado} spellCheck={false} onChange={evento => setServidor(evento.target.value)} /></label><div className="lab-api-linha"><Seletor rotulo="Método interno" valor={metodo} desabilitado={ocupado} aoMudar={valor => setMetodo(valor as typeof metodo)} opcoes={['GET', 'POST'].map(valor => ({ valor, rotulo: valor }))}/><label>Caminho interno<input value={caminho} disabled={ocupado} maxLength={1024} onChange={evento => setCaminho(evento.target.value)} /></label></div>{metodo === 'POST' && <label>Corpo JSON interno<textarea value={corpo} maxLength={4096} disabled={ocupado} onChange={evento => setCorpo(evento.target.value)} /></label>}</>}<pre className="lab-executor-saida" aria-live="polite">{saida}</pre></section>;
}
