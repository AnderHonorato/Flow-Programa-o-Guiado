import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import type { Flow } from '../componentes/useFlow';
import { requisitar } from '../componentes/api';
import Icone from '../componentes/Icone';
import type { OpiniaoAula } from '../comunidade/tipos';
import './AvaliacaoDaAula.css';
interface Props { aulaId: string; titulo: string; flow: Flow }
interface Rascunho { nota: number; comentario: string }
function lerRascunho(chave: string): Rascunho {
  try {
    const r = JSON.parse(sessionStorage.getItem(chave) ?? 'null');
    if (r && Number.isInteger(r.nota) && r.nota >= 0 && r.nota <= 5 && typeof r.comentario === 'string' && r.comentario.length <= 2000) return r;
  } catch { /* O formulário continua disponível sem armazenamento. */ }
  return { nota: 0, comentario: '' };
}
export default function AvaliacaoDaAula(props: Props) { return <FormularioAvaliacao key={props.flow.perfilId + ':' + props.aulaId} {...props}/>; }
function FormularioAvaliacao({ aulaId, titulo, flow }: Props) {
  const chave = 'flow.opiniao:' + flow.perfilId + ':' + aulaId;
  const [rascunho, definirRascunho] = useState(() => lerRascunho(chave));
  const [carregando, definirCarregando] = useState(false); const [enviando, definirEnviando] = useState(false); const [erro, definirErro] = useState(''); const [mensagem, definirMensagem] = useState(''); const [enviada, definirEnviada] = useState<OpiniaoAula | null>(null);
  const alterado = useRef(Boolean(rascunho.nota || rascunho.comentario));
  const controleEnvio = useRef<AbortController | null>(null); const tituloId = useId(); const ajudaId = useId();
  const token = flow.sessao?.token;
  useEffect(() => {
    const controle = new AbortController();
    definirErro(''); definirEnviada(null);
    if (!token || !flow.online) { definirCarregando(false); return () => controle.abort(); }
    definirCarregando(true);
    void requisitar<OpiniaoAula | null>('/aulas/' + encodeURIComponent(aulaId) + '/avaliacao', token, { signal: controle.signal }).then(a => {
      if (controle.signal.aborted) return;
      definirEnviada(a);
      if (a && !alterado.current) definirRascunho({ nota: a.nota, comentario: a.comentario });
    }).catch(e => { if (!controle.signal.aborted) definirErro(e instanceof Error ? e.message : 'Não foi possível consultar sua opinião.'); })
      .finally(() => { if (!controle.signal.aborted) definirCarregando(false); });
    return () => controle.abort();
  }, [aulaId, token, flow.online]);
  useEffect(() => {
    if (!alterado.current) return;
    try { if (rascunho.nota || rascunho.comentario) sessionStorage.setItem(chave, JSON.stringify(rascunho)); else sessionStorage.removeItem(chave); } catch { /* Continua na memória. */ }
  }, [chave, rascunho]);
  useEffect(() => () => controleEnvio.current?.abort(), []);
  function mudar(proximo: Rascunho) { alterado.current = true; definirRascunho(proximo); definirMensagem(''); }
  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token || !flow.online || enviando || rascunho.nota < 1 || rascunho.comentario.trim().length < 3) return;
    const controle = new AbortController(); controleEnvio.current = controle; definirEnviando(true); definirErro(''); definirMensagem('');
    try {
      const a = await requisitar<OpiniaoAula>('/aulas/' + encodeURIComponent(aulaId) + '/avaliacao', token, { method: 'PUT', signal: controle.signal, body: JSON.stringify({ nota: rascunho.nota, comentario: rascunho.comentario.trim() }) });
      if (controle.signal.aborted) return;
      definirEnviada(a); alterado.current = false; definirMensagem('Opinião enviada à administração. Obrigado por ajudar a melhorar esta aula!');
      try { sessionStorage.removeItem(chave); } catch { /* Envio confirmado no servidor. */ }
    } catch (e) { if (!controle.signal.aborted) definirErro(e instanceof Error ? e.message : 'Não foi possível enviar. Seu comentário continua aqui.'); }
    finally { if (!controle.signal.aborted) definirEnviando(false); }
  }
  return <section className="opiniao-aula" aria-labelledby={tituloId}>
    <div className="opiniao-aula-cabecalho"><span className="opiniao-aula-icone"><Icone nome="som" tamanho={24}/></span><div><span className="sobretitulo">SUA EXPERIÊNCIA IMPORTA</span><h2 id={tituloId}>Avalie esta aula</h2></div></div>
    <p id={ajudaId}>Como foi aprender em <strong>{titulo}</strong>? Sua nota e seu comentário chegam à administração. Essa opinião não muda a nota da prova ou o XP.</p>
    {!token ? <p className="opiniao-aula-aviso">Entre em uma conta para enviar sua opinião. Você pode preparar o comentário abaixo.</p> : !flow.online ? <p className="opiniao-aula-aviso" role="status">Sem conexão. Seu rascunho fica nesta sessão; reconecte para enviar à administração.</p> : null}
    {carregando && <p className="texto-auxiliar" role="status">Consultando sua avaliação anterior…</p>}
    <form onSubmit={e => void enviar(e)} aria-describedby={ajudaId}>
      <fieldset disabled={enviando} className="opiniao-aula-pontuacao"><legend>Que nota você dá para esta aula?</legend><div className="opiniao-aula-estrelas">{[1, 2, 3, 4, 5].map(n => <button key={n} type="button" aria-label={n + (n === 1 ? ' estrela' : ' estrelas')} aria-pressed={rascunho.nota === n} className={rascunho.nota >= n ? 'opiniao-estrela--ativa' : ''} onClick={() => mudar({ ...rascunho, nota: n })}><svg width="28" height="28" viewBox="0 0 24 24" fill={rascunho.nota >= n ? 'currentColor' : 'none'} aria-hidden="true"><path d="m12 2 3.1 6.3 7 .9-5.1 5 .9 7L12 18l-6.2 3.2.9-7-5.1-5 7-.9Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg></button>)}</div><span className="opiniao-aula-nota">{rascunho.nota ? rascunho.nota + ' de 5 · ' + ['','Precisa melhorar','Faltou alguma coisa','Foi uma boa aula','Aprendi bastante','Adorei aprender assim'][rascunho.nota] : 'Toque em uma estrela para escolher a nota.'}</span></fieldset>
      <label>Conte como foi sua experiência<textarea value={rascunho.comentario} disabled={enviando} minLength={3} maxLength={2000} required onChange={e => mudar({ ...rascunho, comentario: e.target.value })} placeholder="O que ajudou você a aprender? O que poderia ficar melhor?"/></label><span className="opiniao-aula-contador">{rascunho.comentario.length}/2000 caracteres · não inclua senhas ou informações privadas.</span>
      {erro && <p className="erro" role="alert">{erro}</p>}{mensagem && <p className="opiniao-aula-sucesso" role="status"><Icone nome="check" tamanho={18}/>{mensagem}</p>}
      <div className="opiniao-aula-enviar"><button type="submit" className="botao primario" disabled={!token || !flow.online || enviando || carregando || !rascunho.nota || rascunho.comentario.trim().length < 3}>{enviando ? 'Enviando opinião…' : enviada ? 'Atualizar opinião da aula' : 'Enviar opinião da aula'}<Icone nome="seta" tamanho={17}/></button>{enviada && <small>Você já avaliou esta aula. Um novo envio atualiza sua opinião.</small>}</div>
    </form>
  </section>;
}
