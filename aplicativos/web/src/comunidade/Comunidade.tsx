import { useEffect, useRef, useState } from 'react';
import type { Flow } from '../componentes/useFlow';
import Icone from '../componentes/Icone';
import { useConsulta } from './consulta';
import { Paginacao, PerfilAprendizagem, RetratoMembro } from './PerfilAprendizagem';
import type { PaginaUsuarios, PerfilComunidade } from './tipos';
import './comunidade.css';
export default function Comunidade({ flow }: { flow: Flow }) { return <PainelComunidade key={flow.sessao?.usuario.id ?? 'visitante'} flow={flow}/>; }
function PainelComunidade({ flow }: { flow: Flow }) {
  const [busca, definirBusca] = useState(''); const [filtro, definirFiltro] = useState(''); const [pagina, definirPagina] = useState(1); const [selecionado, selecionar] = useState<string>();
  const token = flow.sessao?.token;
  const lista = useConsulta<PaginaUsuarios<PerfilComunidade>>('/comunidade?pagina=' + pagina + '&tamanho=20&busca=' + encodeURIComponent(filtro), token, flow.online, !selecionado);
  const detalhe = useConsulta<PerfilComunidade>('/comunidade/' + encodeURIComponent(selecionado ?? ''), token, flow.online, Boolean(selecionado));
  const titulo = useRef<HTMLHeadingElement>(null);
  useEffect(() => { if (selecionado && detalhe.dados) titulo.current?.focus(); }, [selecionado, detalhe.dados]);
  const atual = selecionado ? detalhe : lista;
  return <section className="pagina-comunidade">
    <div className="cabecalho-pagina"><div><span className="sobretitulo">UMA JORNADA COMPARTILHADA</span><h1>Comunidade e ranking</h1><p>Cada pessoa avança no próprio ritmo. Conheça as descobertas da comunidade.</p></div><span className="etiqueta"><Icone nome="escudo" tamanho={16}/>Perfis de aprendizagem</span></div>
    {!token ? <div className="vazio"><Icone nome="perfil" tamanho={38}/><h2>Entre para conhecer a comunidade</h2><p>O ranking e os perfis ficam disponíveis para quem tem uma conta. E-mails e dados administrativos permanecem privados.</p></div> : !flow.online ? <div className="vazio"><Icone nome="rede" tamanho={36}/><h2>A comunidade precisa de conexão</h2><p>Suas aulas continuam disponíveis. Reconecte para consultar o ranking atualizado.</p></div> : <>
      {selecionado ? <button className="botao secundario" type="button" onClick={() => selecionar(undefined)}>← Voltar ao ranking</button> : <form className="membros-busca" onSubmit={e => { e.preventDefault(); definirPagina(1); definirFiltro(busca.trim()); }}><label>Buscar participante<input type="search" value={busca} maxLength={100} onChange={e => definirBusca(e.target.value)} placeholder="Nome de quem aprende"/></label><button className="botao secundario" type="submit"><Icone nome="busca" tamanho={17}/>Buscar</button><button className="botao secundario" type="button" disabled={atual.carregando} onClick={atual.atualizar}>Atualizar ranking</button></form>}
      {atual.carregando && <div className="membros-carregando" role="status"><span aria-hidden="true"/>Consultando conquistas e progresso…</div>}
      {atual.erro && <div className="aviso erro" role="alert"><p>{atual.erro}</p><button className="botao secundario" type="button" onClick={atual.atualizar}>Tentar novamente</button></div>}
      {selecionado && detalhe.dados && <article className="membro-perfil"><header><RetratoMembro usuario={detalhe.dados} tamanho={88}/><div><span className="sobretitulo">NÍVEL {detalhe.dados.nivel} · {detalhe.dados.nomeNivel}</span><h2 ref={titulo} tabIndex={-1}>{detalhe.dados.nome}</h2><span>Posição #{detalhe.dados.posicao} no ranking</span></div></header><PerfilAprendizagem usuario={detalhe.dados}/></article>}
      {!selecionado && lista.dados && <>
        <p className="membros-criterio">Ordenado por experiência conquistada, aulas concluídas e identificador em caso de empate. Ler ou avaliar uma aula não acrescenta XP.</p>
        {!lista.dados.usuarios.length ? <div className="vazio"><h2>Nenhum participante encontrado</h2><p>Tente outro nome ou remova a busca.</p></div> : <ol className="membros-ranking" start={(pagina - 1) * 20 + 1}>{lista.dados.usuarios.map(u => <li key={u.id}><button type="button" className={'membro-linha ' + (u.id === flow.sessao?.usuario.id ? 'membro-linha--voce' : '')} onClick={() => selecionar(u.id)} aria-label={'Ver perfil de ' + u.nome}><span className="membro-posicao">#{u.posicao}</span><RetratoMembro usuario={u}/><span className="membro-identidade"><strong>{u.nome}{u.id === flow.sessao?.usuario.id && <small>Você</small>}</strong><span>Nível {u.nivel} · {u.nomeNivel}</span></span><span className="membro-pontos"><strong>{u.xp.toLocaleString('pt-BR')} XP</strong><span>{u.concluidas} aulas concluídas</span></span><Icone nome="seta" tamanho={18}/></button></li>)}</ol>}
        <Paginacao pagina={pagina} total={lista.dados.total} tamanho={lista.dados.tamanho} ocupado={lista.carregando} aoMudar={definirPagina}/>
      </>}
    </>}
  </section>;
}
