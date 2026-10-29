import { useEffect, useRef, useState } from 'react';
import { requisitar } from '../componentes/api';
import type { Flow } from '../componentes/useFlow';
import Seletor from '../componentes/Seletor';
import Icone from '../componentes/Icone';
import { useConsulta } from '../comunidade/consulta';
import { dataLocal, Paginacao, PerfilAprendizagem, RetratoMembro } from '../comunidade/PerfilAprendizagem';
import type { PaginaUsuarios, UsuarioAdmin } from '../comunidade/tipos';
import '../comunidade/comunidade.css';
import './administracao.css';
export default function AdminUsuarios({ flow }: { flow: Flow }) {
  if (flow.sessao?.usuario.papel !== 'admin') return <div className="vazio"><h2>Gestão restrita à administração</h2><p>Entre com uma conta autorizada para consultar os usuários.</p></div>;
  return <Usuarios key={flow.sessao.usuario.id} flow={flow}/>;
}
function Usuarios({ flow }: { flow: Flow }) {
  const [busca, definirBusca] = useState(''); const [filtro, definirFiltro] = useState(''); const [estado, definirEstado] = useState(''); const [pagina, definirPagina] = useState(1); const [selecionado, selecionar] = useState<string>();
  const token = flow.sessao!.token;
  const lista = useConsulta<PaginaUsuarios<UsuarioAdmin>>('/admin/usuarios?pagina=' + pagina + '&tamanho=20&busca=' + encodeURIComponent(filtro) + '&estado=' + estado, token, flow.online, !selecionado);
  const detalhe = useConsulta<UsuarioAdmin>('/admin/usuarios/' + encodeURIComponent(selecionado ?? ''), token, flow.online, Boolean(selecionado));
  const atual = selecionado ? detalhe : lista;
  return <section className="admin-usuarios" aria-label="Gestão de usuários">
    <div className="admin-modulo-cabecalho"><div><h2>Usuários e acesso</h2><p>Consulte a aprendizagem e gerencie o acesso com motivo e histórico.</p></div><button className="botao secundario" type="button" disabled={!flow.online || atual.carregando} onClick={atual.atualizar}>Atualizar usuários</button></div>
    {!flow.online && <div className="aviso" role="status">Conecte-se para consultar ou alterar contas. Nenhuma ação é aplicada offline.</div>}
    {selecionado ? <button className="botao secundario" type="button" onClick={() => selecionar(undefined)}>← Voltar aos usuários</button> : <form className="membros-busca" onSubmit={e => { e.preventDefault(); definirPagina(1); definirFiltro(busca.trim()); }}><label>Buscar nome ou e-mail<input value={busca} maxLength={100} type="search" onChange={e => definirBusca(e.target.value)}/></label><Seletor rotulo="Situação da conta" valor={estado} aoMudar={v => { definirPagina(1); definirEstado(v); }} opcoes={[{ valor: '', rotulo: 'Todas as situações' }, { valor: 'ativo', rotulo: 'Ativas' }, { valor: 'banido', rotulo: 'Banidas' }, { valor: 'inativo', rotulo: 'Inativas' }]}/><button className="botao secundario" type="submit" disabled={!flow.online}><Icone nome="busca" tamanho={16}/>Buscar usuários</button></form>}
    {atual.carregando && <div className="membros-carregando" role="status"><span aria-hidden="true"/>Consultando usuários…</div>}
    {atual.erro && <div className="aviso erro" role="alert"><p>{atual.erro}</p><button className="botao secundario" type="button" onClick={atual.atualizar}>Tentar novamente</button></div>}
    {selecionado && detalhe.dados && <DetalhesUsuario key={detalhe.dados.id} usuario={detalhe.dados} flow={flow} aoAlterar={detalhe.atualizar} aoExcluir={() => { selecionar(undefined); lista.atualizar(); }}/>}
    {!selecionado && lista.dados && <>{lista.dados.usuarios.length ? <div className="admin-usuarios-lista">{lista.dados.usuarios.map(u => <button className="admin-usuario-linha" type="button" key={u.id} aria-label={'Gerenciar usuário ' + u.nome} onClick={() => selecionar(u.id)}><RetratoMembro usuario={u} tamanho={48}/><span><strong>{u.nome}{u.id === flow.sessao?.usuario.id ? ' · sua conta' : ''}</strong><small>{u.email}</small></span><span className={'admin-estado admin-estado--' + u.estado}>{u.estado === 'ativo' ? 'Ativa' : u.estado === 'banido' ? 'Banida' : 'Inativa'}</span><Icone nome="seta" tamanho={17}/></button>)}</div> : <div className="vazio"><h3>Nenhum usuário encontrado</h3><p>Revise o nome, o e-mail ou o filtro de situação.</p></div>}<Paginacao pagina={pagina} total={lista.dados.total} tamanho={lista.dados.tamanho} ocupado={lista.carregando} aoMudar={definirPagina}/></>}
  </section>;
}
function DetalhesUsuario({ usuario, flow, aoAlterar, aoExcluir }: { usuario: UsuarioAdmin; flow: Flow; aoAlterar: () => void; aoExcluir: () => void }) {
  const [acao, definirAcao] = useState<'ativo' | 'banido' | 'inativo'>(usuario.estado);
  const [duracao, definirDuracao] = useState('24h'); const [quantidade, definirQuantidade] = useState(7);
  const [motivo, definirMotivo] = useState(''); const [confirmacao, definirConfirmacao] = useState('');
  const [excluindo, definirExcluindo] = useState(false); const [ocupado, definirOcupado] = useState(false); const [erro, definirErro] = useState(''); const [mensagem, definirMensagem] = useState('');
  const requisicao = useRef<AbortController | null>(null); const titulo = useRef<HTMLHeadingElement>(null);
  useEffect(() => { titulo.current?.focus(); return () => requisicao.current?.abort(); }, []);
  const propria = usuario.id === flow.sessao?.usuario.id;
  async function salvar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!flow.sessao || !flow.online || ocupado || propria) return;
    const controle = new AbortController(); requisicao.current = controle; definirOcupado(true); definirErro(''); definirMensagem('');
    try {
      if (excluindo) {
        await requisitar('/admin/usuarios/' + encodeURIComponent(usuario.id), flow.sessao.token, { method: 'DELETE', signal: controle.signal, body: JSON.stringify({ motivo: motivo.trim(), confirmacao }) });
        if (!controle.signal.aborted) { flow.setAviso('Conta apagada. As sessões e os dados privados vinculados foram removidos.'); aoExcluir(); }
      } else {
        const horas = duracao === '1h' ? 1 : duracao === '24h' ? 24 : duracao === '7d' ? 168 : duracao === 'personalizado' ? quantidade * 24 : null;
        const ate = acao === 'ativo' || horas === null ? null : new Date(Date.now() + horas * 3600000).toISOString();
        await requisitar('/admin/usuarios/' + encodeURIComponent(usuario.id) + '/estado', flow.sessao.token, { method: 'PATCH', signal: controle.signal, body: JSON.stringify({ estado: acao, motivo: motivo.trim(), ate }) });
        if (!controle.signal.aborted) { definirMensagem(acao === 'ativo' ? 'Conta reativada. Será necessário entrar novamente.' : 'Acesso atualizado e sessões revogadas.'); flow.setAviso(acao === 'ativo' ? 'Conta reativada. O titular precisa entrar novamente.' : 'Situação atualizada. As sessões desse usuário foram revogadas.'); definirMotivo(''); aoAlterar(); }
      }
    } catch (e) { if (!controle.signal.aborted) definirErro(e instanceof Error ? e.message : 'Não foi possível aplicar esta ação.'); }
    finally { if (!controle.signal.aborted) definirOcupado(false); }
  }
  return <article className="membro-perfil admin-usuario-detalhe">
    <header><RetratoMembro usuario={usuario} tamanho={78}/><div><span className="sobretitulo">{usuario.papel === 'admin' ? 'ADMINISTRADOR' : 'ESTUDANTE'}</span><h2 ref={titulo} tabIndex={-1}>{usuario.nome}</h2><span>{usuario.email}</span></div><span className={'admin-estado admin-estado--' + usuario.estado}>{usuario.estado === 'ativo' ? 'Ativa' : usuario.estado === 'banido' ? 'Banida' : 'Inativa'}</span></header>
    <div className="admin-acesso-atual"><div><span>Criada em</span><strong>{dataLocal(usuario.criadoEm)}</strong></div><div><span>Prazo da restrição</span><strong>{usuario.estado === 'ativo' ? 'Sem restrição' : dataLocal(usuario.ate)}</strong></div>{usuario.motivo && <p><strong>Motivo registrado:</strong> {usuario.motivo}</p>}</div>
    <PerfilAprendizagem usuario={usuario}/>
    {propria ? <p className="aviso">Você está vendo sua própria conta. Bloqueio e exclusão da própria sessão não estão disponíveis nesta tela.</p> : <section className={'admin-moderacao ' + (excluindo ? 'admin-moderacao--exclusao' : '')} aria-labelledby="titulo-moderacao">
      <h3 id="titulo-moderacao">{excluindo ? 'Apagar esta conta' : 'Gerenciar acesso'}</h3>
      <p>{excluindo ? 'A exclusão remove a conta e os dados privados vinculados. Essa ação não pode ser desfeita por esta tela. O histórico administrativo necessário é preservado.' : 'Banir ou inativar impede o acesso e revoga as sessões existentes. O motivo será mostrado ao titular ao tentar entrar.'}</p>
      <form onSubmit={e => void salvar(e)}>
        {!excluindo && <><Seletor rotulo="Nova situação" valor={acao} desabilitado={ocupado} aoMudar={v => definirAcao(v as typeof acao)} opcoes={[{ valor: 'ativo', rotulo: 'Ativa · permitir entrada' }, { valor: 'banido', rotulo: 'Banida · bloquear acesso' }, { valor: 'inativo', rotulo: 'Inativa · suspender acesso' }]}/>{acao !== 'ativo' && <><Seletor rotulo="Tempo da restrição" valor={duracao} desabilitado={ocupado} aoMudar={definirDuracao} opcoes={[{ valor: '1h', rotulo: '1 hora' }, { valor: '24h', rotulo: '24 horas' }, { valor: '7d', rotulo: '7 dias' }, { valor: 'personalizado', rotulo: 'Escolher quantidade de dias' }, { valor: 'permanente', rotulo: 'Sem prazo definido' }]}/>{duracao === 'personalizado' && <label>Duração em dias<input type="number" min={1} max={3650} step={1} value={quantidade} disabled={ocupado} onChange={e => definirQuantidade(Number(e.target.value))} required/></label>}</>}</>}
        <label>Motivo da ação<textarea minLength={5} maxLength={1000} value={motivo} disabled={ocupado} required onChange={e => definirMotivo(e.target.value)} placeholder="Explique o motivo com clareza para o titular."/></label>
        {excluindo && <label>Digite o e-mail para confirmar a exclusão<input type="email" value={confirmacao} disabled={ocupado} onChange={e => definirConfirmacao(e.target.value)} autoComplete="off" required/><small>Confirmação: {usuario.email}</small></label>}
        {erro && <p className="erro" role="alert">{erro}</p>}{mensagem && <p role="status">{mensagem}</p>}
        {usuario.papel === 'admin' && <p className="texto-auxiliar">Contas administrativas não podem ser apagadas por esta tela, para preservar autorias e auditorias. A suspensão de acesso continua sujeita às proteções do servidor.</p>}
        <div className="botoes"><button className={'botao ' + (excluindo ? 'admin-botao-excluir' : 'primario')} disabled={ocupado || !flow.online || motivo.trim().length < 5 || (excluindo && confirmacao !== usuario.email)}>{ocupado ? 'Aplicando ação…' : excluindo ? 'Apagar usuário definitivamente' : 'Salvar situação da conta'}</button><button type="button" className="botao secundario" disabled={ocupado || (!excluindo && usuario.papel === 'admin')} onClick={() => { definirExcluindo(!excluindo); definirErro(''); definirConfirmacao(''); definirMotivo(''); }}>{excluindo ? 'Cancelar exclusão' : 'Quero apagar esta conta'}</button></div>
      </form>
    </section>}
  </article>;
}
