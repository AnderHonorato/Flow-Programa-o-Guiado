import { useState } from 'react';
import type { Flow } from '../componentes/useFlow';
import Icone from '../componentes/Icone';
import { useConsulta } from '../comunidade/consulta';
import { dataLocal, Paginacao } from '../comunidade/PerfilAprendizagem';
import type { PaginaOpinioes } from '../comunidade/tipos';
import '../comunidade/comunidade.css';
import './administracao.css';
export default function AdminAvaliacoes({ flow }: { flow: Flow }) {
  if (flow.sessao?.usuario.papel !== 'admin') return <div className="vazio"><h2>Opiniões restritas à administração</h2><p>Entre com uma conta autorizada para consultar os comentários.</p></div>;
  return <Opinioes key={flow.sessao.usuario.id} flow={flow}/>;
}
function Opinioes({ flow }: { flow: Flow }) {
  const [busca, definirBusca] = useState(''); const [filtro, definirFiltro] = useState(''); const [pagina, definirPagina] = useState(1);
  const consulta = useConsulta<PaginaOpinioes>('/admin/avaliacoes-aulas?pagina=' + pagina + '&tamanho=20&busca=' + encodeURIComponent(filtro), flow.sessao!.token, flow.online);
  return <section className="admin-opinioes" aria-label="Avaliações das aulas">
    <div className="admin-modulo-cabecalho"><div><h2>A voz de quem aprende</h2><p>Notas e comentários enviados no final das aulas. Essas opiniões não alteram a nota das provas ou o XP.</p></div><button type="button" className="botao secundario" disabled={consulta.carregando || !flow.online} onClick={consulta.atualizar}>Atualizar opiniões</button></div>
    {!flow.online && <p className="aviso" role="status">Conecte-se para consultar as avaliações enviadas à administração.</p>}
    <form className="membros-busca" onSubmit={e => { e.preventDefault(); definirPagina(1); definirFiltro(busca.trim()); }}><label>Buscar por aula ou participante<input type="search" value={busca} maxLength={100} onChange={e => definirBusca(e.target.value)}/></label><button className="botao secundario" disabled={!flow.online}><Icone nome="busca" tamanho={16}/>Buscar opiniões</button></form>
    {consulta.carregando && <div className="membros-carregando" role="status"><span aria-hidden="true"/>Consultando as avaliações…</div>}
    {consulta.erro && <div className="aviso erro" role="alert"><p>{consulta.erro}</p><button type="button" className="botao secundario" onClick={consulta.atualizar}>Tentar novamente</button></div>}
    {consulta.dados && <><div className="admin-opinioes-resumo"><strong>{consulta.dados.media === null ? '—' : consulta.dados.media.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}<small>/5</small></strong><div><span>Média das avaliações</span><small>{consulta.dados.total} opinião{consulta.dados.total === 1 ? '' : 's'} encontrada{consulta.dados.total === 1 ? '' : 's'}{filtro ? ' nesta busca' : ''}</small></div></div>
      {consulta.dados.avaliacoes.length ? <div className="admin-opinioes-lista">{consulta.dados.avaliacoes.map(a => <article key={a.id} className="admin-opiniao"><header><div><span className="sobretitulo">OPINIÃO SOBRE A AULA</span><h3>{a.tituloAula}</h3><span>{a.usuarioNome} · {dataLocal(a.atualizadaEm)}</span></div><strong className="admin-estrelas" aria-label={a.nota + ' de 5 estrelas'}><span aria-hidden="true">{'★'.repeat(a.nota)}{'☆'.repeat(5 - a.nota)}</span><small>{a.nota}/5</small></strong></header><p>{a.comentario}</p></article>)}</div> : <div className="vazio"><h3>As opiniões chegarão por aqui</h3><p>Quando um estudante avaliar uma aula, a pontuação e o comentário aparecerão nesta aba.</p></div>}
      <Paginacao pagina={pagina} total={consulta.dados.total} tamanho={consulta.dados.tamanho} ocupado={consulta.carregando} aoMudar={definirPagina}/>
    </>}
  </section>;
}
