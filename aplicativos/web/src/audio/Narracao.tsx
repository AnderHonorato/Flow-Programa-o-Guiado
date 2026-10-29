import { useEffect, useRef, useState, type CSSProperties } from 'react';
import Icone from '../componentes/Icone';
import Seletor from '../componentes/Seletor';
import { AudioProvider, useAudio, vozDoIdioma } from './AudioProvider';
import './narracao.css';
export { prepararTexto } from './texto';
interface Props { blocos: string[]; aoDestacar?: (indice: number) => void }

export default function Narracao(props: Props) {
  const audio = useAudio();
  return audio ? <Leitura {...props}/> : <AudioProvider><Leitura {...props}/></AudioProvider>;
}
function Leitura({ blocos, aoDestacar }: Props) {
  const audio = useAudio()!;
  const audioAtual = useRef(audio);
  audioAtual.current = audio;
  const [ultimoIndice, definirUltimoIndice] = useState(-1);
  const assinatura = blocos.join('\u0000');
  useEffect(() => {
    definirUltimoIndice(-1);
    return () => { if (audioAtual.current.origem === 'aula') audioAtual.current.parar(); };
  }, [assinatura]);
  const vozes = audio.vozes.filter(v => vozDoIdioma(v, audio.idioma));
  const voz = vozes.find(v => v.id === audio.vozId);
  const disponivel = audio.modo !== 'indisponivel' && Boolean(voz);
  const daAula = audio.origem === 'aula';
  const ativa = daAula && ['preparando', 'falando', 'pausada'].includes(audio.estado);
  const indice = daAula ? audio.indice : ultimoIndice;
  const ouvir = (inicio = 0) => {
    definirUltimoIndice(inicio);
    audio.ler({ blocos, origem: 'aula', inicio, aoDestacar: posicao => { definirUltimoIndice(posicao); aoDestacar?.(posicao); } });
  };
  const situacao = daAula ? audio.estado === 'falando' ? 'Lendo com você' : audio.estado === 'preparando' ? 'Preparando a voz' : audio.estado === 'pausada' ? 'Leitura pausada' : 'Pronto para ouvir' : 'Pronto para ouvir';
  return <section className="narracao" aria-label="Narração e leitura da aula">
    <div className={`narracao-painel ${daAula && audio.estado === 'falando' ? 'narracao-painel--falando' : ''}`}>
      <div className="narracao-cabecalho"><span className="narracao-simbolo"><Icone nome="som" tamanho={23}/></span><div><span className="narracao-assinatura">J.A.R.V.I.S · LEITURA GUIADA</span><strong>{situacao}</strong></div><span className="narracao-ondas" aria-hidden="true">{[0, 1, 2, 3, 4].map(i => <i key={i} style={{ animationDelay: `${i * 90}ms` }}/>)}</span></div>
      <p className="narracao-convite">Ouça, acompanhe o destaque e avance no seu ritmo.</p>
      <div className="narracao-controles">
        <button className="narracao-botao narracao-botao--principal" type="button" disabled={!disponivel || !blocos.length} onClick={() => ouvir()}><Icone nome="play" tamanho={18}/>Ouvir aula</button>
        {ativa && audio.estado !== 'pausada' && <button className="narracao-botao" type="button" onClick={audio.pausar}><Icone nome="pausa" tamanho={17}/>Pausar</button>}
        {ativa && audio.estado === 'pausada' && <button className="narracao-botao" type="button" onClick={audio.retomar}><Icone nome="play" tamanho={17}/>Retomar</button>}
        <button className="narracao-botao" type="button" disabled={!disponivel || indice < 0} onClick={() => ouvir(Math.max(0, indice))}><Icone nome="revisao" tamanho={17}/>Repetir trecho</button>
        <button className="narracao-botao" type="button" disabled={!ativa && audio.estado !== 'erro'} onClick={audio.parar}><span className="narracao-parar" aria-hidden="true"/>Parar</button>
      </div>
      <div className="narracao-ajustes">
        <Seletor rotulo="Idioma da voz" valor={audio.idioma} aoMudar={valor => audio.definirIdioma(valor === 'en' ? 'en' : 'pt-BR')} opcoes={[{ valor: 'pt-BR', rotulo: 'Português Brasil · padrão' }, { valor: 'en', rotulo: 'Inglês · alternativa' }]}/>
        <Seletor rotulo="Voz" valor={audio.vozId} desabilitado={!vozes.length} aoMudar={audio.definirVozId} opcoes={vozes.length ? vozes.map(v => ({ valor: v.id, rotulo: `${v.nome} · ${v.local ? 'local' : 'online'}` })) : [{ valor: '', rotulo: 'Nenhuma voz compatível instalada' }]}/>
        <Seletor rotulo="Velocidade" valor={String(audio.velocidade)} aoMudar={valor => audio.definirVelocidade(Number(valor))} opcoes={[.75, 1, 1.25, 1.5].map(v => ({ valor: String(v), rotulo: `${v.toLocaleString('pt-BR')}×${v === 1 ? ' · normal' : ''}` }))}/>
        <label className="narracao-volume"><span><Icone nome="som" tamanho={16}/>Volume <output>{Math.round(audio.volume * 100)}%</output></span><input aria-label="Volume da narração" type="range" min="0" max="1" step="0.1" value={audio.volume} onChange={e => audio.definirVolume(Number(e.target.value))} style={{ '--volume': `${audio.volume * 100}%` } as CSSProperties}/></label>
      </div>
      <p className="narracao-disponibilidade" role="status">
        {audio.modo === 'indisponivel' ? 'Narração indisponível neste dispositivo. Você pode continuar pelo texto abaixo.' : !voz ? `Nenhuma voz em ${audio.idioma === 'pt-BR' ? 'português do Brasil' : 'inglês'} foi encontrada. Instale uma voz desse idioma nas configurações de síntese de voz do dispositivo. Nenhum outro idioma será usado automaticamente.` : voz.local ? 'Voz local instalada. A disponibilidade sem internet depende do dispositivo.' : 'Esta voz pode exigir internet. Instale uma voz local em português do Brasil para ouvir offline.'}
        {audio.idioma === 'en' && ' Inglês é uma voz alternativa: o texto da aula continua em português e não é traduzido.'}
        {audio.modo === 'nativo' && ' Ao retomar, o parágrafo atual será reiniciado.'}
        {ativa && audio.estado === 'pausada' && ' Leitura pausada.'}
      </p>
      {ativa && <small className="narracao-instrucao">Velocidade e volume serão aplicados ao próximo trecho. Repetir trecho aplica agora.</small>}
      {audio.erro && <p className="narracao-erro" role="alert">{audio.erro}</p>}
    </div>
    <p className="narracao-dica-selecao"><Icone nome="busca" tamanho={16}/>Selecione uma palavra da aula para explorar o significado com J.A.R.V.I.S.</p>
    <div className="narracao-paragrafos" data-jarvis-conteudo="true">
      {blocos.map((bloco, i) => <div key={i} className={`narracao-paragrafo${indice === i && ativa ? ' narracao-atual' : ''}`} aria-current={indice === i && ativa ? 'true' : undefined}>
        <p>{bloco}</p>
        <button type="button" className="narracao-ler-trecho" aria-label={`Ler a partir do parágrafo ${i + 1}`} disabled={!disponivel} onClick={() => ouvir(i)}><Icone nome="som" tamanho={14}/>Ouvir este trecho</button>
      </div>)}
    </div>
  </section>;
}
