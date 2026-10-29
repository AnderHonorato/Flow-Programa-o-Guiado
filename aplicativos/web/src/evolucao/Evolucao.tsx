import { useEffect, useState } from 'react';
import type { EstadoLocal } from '../offline/armazenamento';
import { lerRecursoLocal } from '../offline/armazenamento';
import { conquistas, evolucao, iconeDisponivel, niveis } from './regras';
import { Emblema } from './Emblema';
import { DesenhoAvatar } from '../perfil/DesenhoAvatar';
import { nomeAvatar, validarAvatar } from '../perfil/avatar';
import { ColecaoEmblemas, CelebracaoRecompensas } from './Recompensas';
import type { EstadoRecompensas } from './historico';
import './evolucao.css';

type EstadoEvolucao = EstadoRecompensas & Pick<EstadoLocal, 'avatar'>;

/** Preserva a escolha feita nas versões anteriores, sem substituir uma foto nova. */
function useIconeLegado(perfilId: string, indice: number) {
  const [selecao, setSelecao] = useState<{ perfilId: string; icone: number }>();
  useEffect(() => {
    let ativo = true;
    void lerRecursoLocal<unknown>(perfilId, 'evolucao:icone').then(valor => {
      if (ativo) setSelecao({ perfilId, icone: iconeDisponivel(valor, indice) });
    }).catch(() => {});
    return () => { ativo = false; };
  }, [perfilId, indice]);
  return selecao?.perfilId === perfilId ? iconeDisponivel(selecao.icone, indice) : 0;
}

export function AvatarEvolucao({ estado, perfilId, tamanho = 48 }: { estado: EstadoEvolucao; perfilId: string; tamanho?: number }) {
  const jornada = evolucao(estado);
  const legado = useIconeLegado(perfilId, jornada.indice);
  const [fotoInvalida, setFotoInvalida] = useState<string>();
  const avatar = validarAvatar(estado.avatar, jornada.indice) ? estado.avatar : undefined;
  const fotoFalhou = fotoInvalida === `${perfilId}:${avatar?.atualizadoEm}:${avatar?.valor}`;
  const titulo = avatar ? fotoFalhou ? 'Foto indisponível · emblema da jornada' : nomeAvatar(avatar) : `Ícone ${niveis[legado].nome}`;
  return <span className="evo-avatar" title={titulo}>
    {avatar?.tipo === 'foto' && !fotoFalhou ? <img className="evo-foto-perfil" src={avatar.valor} width={tamanho} height={tamanho} alt="Sua foto de perfil" onError={() => setFotoInvalida(`${perfilId}:${avatar.atualizadoEm}:${avatar.valor}`)}/> : avatar?.tipo === 'desenho' ? <DesenhoAvatar id={avatar.valor} tamanho={tamanho}/> : <Emblema grau={avatar?.tipo === 'emblema' ? Number(avatar.valor) : legado} tamanho={tamanho}/>}
  </span>;
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
  const medalhas = conquistas(estado);
  return <section className="evo-galeria" aria-labelledby="titulo-evolucao">
    <div className="evo-titulo"><div><span className="evo-sobretitulo">CONSTRUA SEU LEGADO</span><h2 id="titulo-evolucao">Sua evolução ganha forma.</h2><p>Cada conceito aprendido deixa uma marca na sua jornada.</p></div><span className="evo-contagem">{medalhas.filter(m => m.obtido).length}/{medalhas.length} emblemas</span></div>
    <ResumoEvolucao estado={estado} perfilId={perfilId}/>
    <div className="evo-regras"><strong>Como evoluir</strong><p>Uma competência registrada vale 100 XP. Cada questão correta, após enviar a avaliação, vale 10 XP. Reabrir aulas, trocar de avatar ou rever uma animação não multiplica a recompensa.</p><small>Emblemas celebram seu progresso no app. A certificação continua dependendo de aprovação do professor.</small></div>
    <ColecaoEmblemas estado={estado}/>
  </section>;
}

export const CelebracaoEvolucao = CelebracaoRecompensas;
