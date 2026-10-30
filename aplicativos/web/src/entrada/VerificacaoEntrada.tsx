import Icone from '../componentes/Icone';
import './entrada.css';

export type EtapaEntrada = 'credenciais' | 'sessao' | 'perfil' | 'pronto';
const etapas = [
  { id: 'credenciais', titulo: 'Conferindo acesso', detalhe: 'Verificando as credenciais informadas.' },
  { id: 'sessao', titulo: 'Validando sessão e permissões', detalhe: 'Consultando o estado da conta no servidor.' },
  { id: 'perfil', titulo: 'Abrindo seu progresso', detalhe: 'Preparando seus dados de aprendizagem.' },
] as const;

/** O estado é controlado pelas operações reais do fluxo de autenticação. */
export default function VerificacaoEntrada({ etapa, erro }: { etapa: EtapaEntrada; erro?: string }) {
  const atual = etapa === 'pronto' ? etapas.length : etapas.findIndex(item => item.id === etapa);
  return <section className={`entrada-verificacao ${erro ? 'entrada-verificacao--erro' : ''}`} aria-label="Verificação de entrada" aria-busy={etapa !== 'pronto' && !erro}>
    <div className="entrada-verificacao-topo"><span className="entrada-verificacao-nucleo" aria-hidden="true"><Icone nome={erro ? 'escudo' : etapa === 'pronto' ? 'check' : 'raio'} tamanho={23}/></span><div><span>SEU ESPAÇO DE APRENDIZAGEM</span><strong role="status" aria-live="polite" aria-atomic="true">{erro ? 'Não foi possível concluir a entrada' : etapa === 'pronto' ? 'Tudo pronto para continuar' : etapas[atual].titulo}</strong></div></div>
    <ol className="entrada-verificacao-etapas">{etapas.map((item, i) => <li key={item.id} className={i < atual ? 'concluida' : i === atual ? 'atual' : ''} aria-current={i === atual && etapa !== 'pronto' ? 'step' : undefined}>
      <span className="entrada-verificacao-marca" aria-hidden="true">{i < atual ? <Icone nome="check" tamanho={14}/> : String(i + 1).padStart(2, '0')}</span><span><strong>{item.titulo}</strong><small>{item.detalhe}</small></span><span className="entrada-verificacao-situacao">{i < atual ? 'Concluído' : i === atual ? erro ? 'Interrompido' : 'Em andamento' : 'Aguardando'}</span>
    </li>)}</ol>
    {erro && <p className="entrada-verificacao-erro" role="alert">{erro}</p>}
  </section>;
}
