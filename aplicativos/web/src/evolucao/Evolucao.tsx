import { useEffect, useRef, useState } from 'react';
import type { EstadoLocal } from '../offline/armazenamento';
import { lerRecursoLocal, salvarRecursoLocal } from '../offline/armazenamento';
import { conquistas, evolucao, iconeDisponivel, niveis } from './regras';
import { Emblema } from './Emblema';
import './evolucao.css';

type EstadoEvolucao = Pick<EstadoLocal, 'aulasConcluidas' | 'respostas'>;
const chaveIcone = 'evolucao:icone';

function useIcone(perfilId: string, indice: number) {
  const [selecao, setSelecao] = useState<{ perfilId: string; icone: number }>();
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const perfilAtual = useRef(perfilId); perfilAtual.current = perfilId;
  useEffect(() => {
    let ativo = true;
    setErro(''); setSalvando(false);
    void lerRecursoLocal<unknown>(perfilId, chaveIcone).then(valor => {
      if (ativo) setSelecao({ perfilId, icone: iconeDisponivel(valor, indice) });
    }).catch(() => { if (ativo) setErro('Não foi possível ler seu ícone. Tente novamente ao abrir o perfil.'); });
    const atualizar = (evento: Event) => {
      const detalhe = (evento as CustomEvent<{ perfilId: string; icone: number }>).detail;
      if (detalhe?.perfilId === perfilId) setSelecao({ perfilId, icone: iconeDisponivel(detalhe.icone, indice) });
    };
    window.addEventListener('flow:icone-evolucao', atualizar);
    return () => { ativo = false; window.removeEventListener('flow:icone-evolucao', atualizar); };
  }, [perfilId, indice]);
  async function escolher(valor: number) {
    if (valor !== iconeDisponivel(valor, indice) || salvando) return false;
    setSalvando(true); setErro('');
    try {
      await salvarRecursoLocal(perfilId, chaveIcone, valor);
      if (perfilAtual.current === perfilId) {
        setSelecao({ perfilId, icone: valor });
        window.dispatchEvent(new CustomEvent('flow:icone-evolucao', { detail: { perfilId, icone: valor } }));
        return true;
      }
      return false;
    } catch { if (perfilAtual.current === perfilId) setErro('Não foi possível salvar seu ícone. Tente novamente.'); return false; }
    finally { if (perfilAtual.current === perfilId) setSalvando(false); }
  }
  return { icone: selecao?.perfilId === perfilId ? iconeDisponivel(selecao.icone, indice) : 0, escolher, erro, salvando };
}

export function AvatarEvolucao({ estado, perfilId, tamanho = 48 }: { estado: EstadoEvolucao; perfilId: string; tamanho?: number }) {
  const jornada = evolucao(estado);
  const { icone } = useIcone(perfilId, jornada.indice);
  return <span className="evo-avatar" title={`Ícone ${niveis[icone].nome}`}><Emblema grau={icone} tamanho={tamanho}/></span>;
}

export function ResumoEvolucao({ estado, perfilId, compacto = false }: { estado: EstadoEvolucao; perfilId: string; compacto?: boolean }) {
  const jornada = evolucao(estado);
  return <section className={`evo-resumo ${compacto ? 'evo-resumo--compacto' : ''}`} aria-label="Seu nível de evolução">
    <AvatarEvolucao estado={estado} perfilId={perfilId} tamanho={compacto ? 52 : 94}/>
    <div className="evo-resumo-dados"><span className="evo-sobretitulo">NÍVEL {jornada.numero} · {jornada.xp} XP</span><h2>{jornada.atual.nome}</h2>{!compacto && <p>{jornada.atual.frase}</p>}
      <progress value={jornada.percentual} max={100} aria-label={jornada.proximo ? `Progresso até ${jornada.proximo.nome}` : 'Nível máximo do catálogo de evolução'}/>
      <small>{jornada.proximo ? `${jornada.faltam} XP para ${jornada.proximo.nome}` : 'Todos os níveis de evolução desbloqueados'}</small>
    </div>
  </section>;
}

export function GaleriaEvolucao({ estado, perfilId }: { estado: EstadoEvolucao; perfilId: string }) {
  const jornada = evolucao(estado);
  const medalhas = conquistas(estado);
  const { icone, escolher, erro, salvando } = useIcone(perfilId, jornada.indice);
  const [mensagem, setMensagem] = useState('');
  useEffect(() => setMensagem(''), [perfilId]);
  return <section className="evo-galeria" aria-labelledby="titulo-evolucao">
    <div className="evo-titulo"><div><span className="evo-sobretitulo">CONSTRUA SEU LEGADO</span><h2 id="titulo-evolucao">Sua evolução ganha forma.</h2><p>Cada conceito aprendido deixa uma marca na sua jornada.</p></div><span className="evo-contagem">{medalhas.filter(m => m.obtido).length}/{medalhas.length} emblemas</span></div>
    <ResumoEvolucao estado={estado} perfilId={perfilId}/>
    <div className="evo-regras"><strong>Como evoluir</strong><p>Uma competência registrada vale 100 XP. Cada questão correta, após enviar a avaliação, vale 10 XP. Reabrir aulas, clicar ou sincronizar não multiplica a recompensa.</p><small>Emblemas celebram seu progresso no app. A certificação continua dependendo de aprovação do professor.</small></div>
    <h3>Emblemas de conquista</h3>
    <div className="evo-medalhas">{medalhas.map(m => <article key={m.id} className={`evo-medalha ${m.obtido ? 'evo-medalha--obtida' : ''}`}>
      <Emblema grau={m.grau} desenho={m.desenho} bloqueado={!m.obtido}/><strong>{m.nome}</strong><p>{m.descricao}</p><span className="evo-estado">{m.obtido ? 'Conquistado' : `${m.atual} de ${m.meta}`}</span>
      <progress aria-label={`Progresso: ${m.nome}`} max={m.meta} value={m.atual}/>
    </article>)}</div>
    <div className="evo-titulo-icones"><h3>Seu ícone de jornada</h3><p>Ícones novos surgem com os níveis. Escolha um dos que você já conquistou.</p></div>
    <div className="evo-icones">{niveis.map((nivel, i) => <button key={nivel.nome} type="button" className={`evo-icone ${icone === i ? 'evo-icone--selecionado' : ''}`} disabled={i > jornada.indice || salvando} aria-pressed={icone === i} aria-label={`${nivel.nome}: ${i > jornada.indice ? `bloqueado, requer ${nivel.minimo} XP` : icone === i ? 'ícone em uso' : 'usar ícone'}`} onClick={() => { void escolher(i).then(salvo => { if (salvo) setMensagem(`Ícone ${nivel.nome} selecionado.`); }); }}>
      <Emblema grau={i} tamanho={76} bloqueado={i > jornada.indice}/><strong>{nivel.nome}</strong><small>{i > jornada.indice ? `${nivel.minimo} XP` : icone === i ? 'Em uso' : 'Disponível'}</small>
    </button>)}</div>
    <p className="evo-feedback" role="status">{erro || (salvando ? 'Salvando seu ícone…' : mensagem)}</p>
    <small className="evo-nota-local">Seu ícone fica salvo neste perfil e acompanha a cópia exportada dos seus dados.</small>
  </section>;
}

/** Montar uma vez no shell. Não comemora a hidratação ou a troca de perfil. */
export function CelebracaoEvolucao({ estado, perfilId, pronto = true }: { estado: EstadoEvolucao; perfilId: string; pronto?: boolean }) {
  const jornada = evolucao(estado);
  const medalhas = conquistas(estado).filter(m => m.obtido);
  const assinatura = medalhas.map(m => m.id).join('|');
  const anterior = useRef<{ perfilId: string; nivel: number; medalhas: string[] } | undefined>(undefined);
  const [recompensa, setRecompensa] = useState<{ perfilId: string; nome: string; grau: number; legenda: string }>();
  useEffect(() => {
    if (!pronto) { anterior.current = undefined; return; }
    const ultimo = anterior.current;
    const novas = medalhas.filter(m => !ultimo?.medalhas.includes(m.id));
    if (ultimo?.perfilId === perfilId) {
      if (jornada.indice > ultimo.nivel) setRecompensa({ perfilId, nome: jornada.atual.nome, grau: jornada.indice, legenda: `Você chegou ao nível ${jornada.numero}! Um novo ícone está disponível no perfil.` });
      else if (novas.length) { const medalha = novas[novas.length - 1]; setRecompensa({ perfilId, nome: medalha.nome, grau: medalha.grau, legenda: 'Novo emblema conquistado! Veja sua coleção no perfil.' }); }
    }
    anterior.current = { perfilId, nivel: jornada.indice, medalhas: medalhas.map(m => m.id) };
  }, [perfilId, pronto, jornada.indice, assinatura]);
  useEffect(() => {
    if (!recompensa) return;
    const tempo = window.setTimeout(() => setRecompensa(undefined), 10000);
    return () => window.clearTimeout(tempo);
  }, [recompensa]);
  if (!pronto || recompensa?.perfilId !== perfilId) return null;
  return <aside className="evo-celebracao" aria-label="Recompensa de evolução"><Emblema grau={recompensa.grau} tamanho={80}/><div role="status"><span className="evo-sobretitulo">VOCÊ EVOLUIU</span><strong>{recompensa.nome}</strong><p>{recompensa.legenda}</p></div><button type="button" onClick={() => setRecompensa(undefined)} aria-label="Fechar celebração">×</button></aside>;
}
