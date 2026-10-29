import { DesenhoAvatar } from '../perfil/DesenhoAvatar';
import { Emblema } from '../evolucao/Emblema';
import type { PerfilComunidade } from './tipos';
export function dataLocal(valor: string | null | undefined) {
  if (!valor) return 'Sem prazo';
  const data = new Date(valor);
  return Number.isFinite(data.getTime()) ? data.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'Data indisponível';
}
function tempoRegistrado(segundos: number) { return segundos < 60 ? segundos + ' s' : Math.floor(segundos / 60) + ' min' + (segundos % 60 ? ' ' + segundos % 60 + ' s' : ''); }
export function RetratoMembro({ usuario, tamanho = 56 }: { usuario: Pick<PerfilComunidade, 'avatar' | 'nivel'>; tamanho?: number }) {
  const avatar = usuario.avatar;
  return <span className="membro-retrato" aria-hidden="true">{avatar?.tipo === 'desenho'
    ? <DesenhoAvatar id={avatar.valor} tamanho={tamanho}/>
    : <Emblema grau={avatar?.tipo === 'emblema' && /^[0-7]$/.test(avatar.valor) ? Number(avatar.valor) : Math.min(7, Math.max(0, (usuario.nivel || 1) - 1))} tamanho={tamanho}/>}</span>;
}
export function PerfilAprendizagem({ usuario }: { usuario: PerfilComunidade }) {
  return <div className="membro-perfil-dados">
    <div className="membro-metricas"><div><strong>{usuario.xp.toLocaleString('pt-BR')}</strong><span>XP conquistados</span></div><div><strong>{usuario.concluidas}</strong><span>Aulas concluídas</span></div><div><strong>{usuario.leituras}</strong><span>Leituras registradas</span></div><div><strong>{usuario.certificadosTotal ?? usuario.certificados?.length ?? 0}</strong><span>Reconhecimentos internos</span></div></div>
    <div className="membro-detalhes-grade">
      <section><h3>O que mais explorou</h3><p className="texto-auxiliar">Leituras com pelo menos 20 segundos de estudo ativo registrados. São um indicador de uso.</p>{usuario.maisLidas?.length ? <ol className="membro-historico">{usuario.maisLidas.map(a => <li key={a.aulaId}><strong>{a.titulo}</strong><span>{a.leituras} leitura{a.leituras === 1 ? '' : 's'} · {tempoRegistrado(a.segundos)} registrados</span></li>)}</ol> : <p>Ainda não há leituras registradas nesta conta.</p>}</section>
      <section><h3>Aulas que já concluiu</h3>{usuario.aulasConcluidas?.length ? <ul className="membro-historico">{usuario.aulasConcluidas.map(a => <li key={a.id}><strong>{a.titulo}</strong><span>Competência registrada</span></li>)}</ul> : <p>As próximas conquistas começam com a primeira aula.</p>}</section>
      <section><h3>Certificados e reconhecimentos</h3><p className="texto-auxiliar">Reconhecimentos internos de aulas aprovadas pela administração. Não equivalem a diploma.</p>{usuario.certificados?.length ? <ul className="membro-historico">{usuario.certificados.map(c => <li key={c.codigo}><strong>{c.titulo}</strong><span>{dataLocal(c.emitidoEm)}</span><code>{c.codigo}</code></li>)}</ul> : <p>Nenhum reconhecimento emitido até agora.</p>}</section>
    </div>
  </div>;
}
export function Paginacao({ pagina, total, tamanho = 20, ocupado, aoMudar }: { pagina: number; total: number; tamanho?: number; ocupado: boolean; aoMudar: (n: number) => void }) {
  const paginas = Math.max(1, Math.ceil(total / tamanho));
  return <nav className="membros-paginacao" aria-label="Paginação de resultados"><button className="botao secundario" type="button" disabled={ocupado || pagina <= 1} onClick={() => aoMudar(pagina - 1)}>Anterior</button><span role="status">Página {pagina} de {paginas} · {total} registro{total === 1 ? '' : 's'}</span><button className="botao secundario" type="button" disabled={ocupado || pagina >= paginas} onClick={() => aoMudar(pagina + 1)}>Próxima</button></nav>;
}
