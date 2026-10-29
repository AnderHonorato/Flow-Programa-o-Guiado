import { useState } from 'react';
import Seletor from '../componentes/Seletor';
export default function ClienteApi() {
  const [metodo, setMetodo] = useState('GET');
  const [caminho, setCaminho] = useState('/tarefas');
  const [corpo, setCorpo] = useState('{"titulo":"Aprender HTTP"}');
  const [real, setReal] = useState(false);
  const [saida, setSaida] = useState('Envie uma requisição para examinar status, cabeçalhos e JSON.');
  const [ocupado, setOcupado] = useState(false);
  const [tarefas, setTarefas] = useState([{ id: 1, titulo: 'Entender status 200' }]);
  async function enviar() {
    setOcupado(true);
    try {
      if (real) {
        if (!caminho.startsWith('/api/') || caminho.includes('..') || caminho.includes('//')) throw new Error('HTTP real aceita somente caminhos locais começando por /api/.');
        const resposta = await fetch(caminho, { method: metodo, credentials: 'omit', headers: { 'Content-Type': 'application/json' }, ...(metodo !== 'GET' ? { body: corpo } : {}), signal: AbortSignal.timeout(8000) });
        setSaida(`HTTP ${resposta.status}\n${[...resposta.headers].map(([chave, valor]) => `${chave}: ${valor}`).join('\n')}\n\n${(await resposta.text()).slice(0, 30000)}`);
      } else {
        const rota = caminho.split('?')[0];
        if (rota !== '/tarefas') setSaida('SIMULAÇÃO LOCAL · HTTP 404\ncontent-type: application/json\n\n{"erro":"Rota não encontrada. Use /tarefas."}');
        else if (metodo === 'GET') setSaida(`SIMULAÇÃO LOCAL · HTTP 200\ncontent-type: application/json\n\n${JSON.stringify(tarefas, null, 2)}`);
        else {
          const dados = JSON.parse(corpo);
          if (typeof dados.titulo !== 'string' || !dados.titulo.trim()) setSaida('SIMULAÇÃO LOCAL · HTTP 422\n\n{"erro":"titulo é obrigatório"}');
          else { const tarefa = { id: Date.now(), titulo: dados.titulo }; setTarefas(lista => [...lista, tarefa]); setSaida(`SIMULAÇÃO LOCAL · HTTP 201\ncontent-type: application/json\n\n${JSON.stringify(tarefa, null, 2)}`); }
        }
      }
    } catch (erro) { setSaida(`Falha: ${erro instanceof Error ? erro.message : String(erro)}`); }
    finally { setOcupado(false); }
  }
  return <div className="lab-cliente-api"><h4>Cliente HTTP</h4><p>A simulação roda neste dispositivo, com dados em memória. Ela ensina o contrato HTTP; não inicia um servidor.</p><label><input type="checkbox" checked={real} onChange={evento => { setReal(evento.target.checked); setCaminho(evento.target.checked ? '/api/saude' : '/tarefas'); }} /> Usar API real deste aplicativo (sem credenciais)</label><div className="lab-api-linha"><Seletor rotulo="Método" valor={metodo} aoMudar={setMetodo} opcoes={['GET', 'POST'].map(valor => ({ valor, rotulo: valor }))}/><label>Caminho<input value={caminho} onChange={evento => setCaminho(evento.target.value)} /></label><button type="button" onClick={enviar} disabled={ocupado}>{ocupado ? 'Enviando…' : 'Enviar HTTP'}</button></div>{metodo === 'POST' && <label>JSON da requisição<textarea value={corpo} onChange={evento => setCorpo(evento.target.value)} /></label>}<pre aria-live="polite">{saida}</pre></div>;
}
