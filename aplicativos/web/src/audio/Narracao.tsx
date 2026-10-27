import { useEffect, useRef, useState } from 'react';
import { narradorNativo, plataformaNativa, type EventoNativo } from './nativo';
import './narracao.css';

interface Props { blocos: string[]; aoDestacar?: (indice: number) => void }
interface Voz { id: string; nome: string; idioma: string; local: boolean; original?: SpeechSynthesisVoice }
type Modo = 'web' | 'nativo' | 'indisponivel';
type EstadoLeitura = 'parada' | 'lendo' | 'pausada' | 'erro';

/** Símbolos em blocos de código não viram uma sequência de caracteres narrada. */
export function prepararTexto(texto: string): string {
  return texto.replace(/```[\s\S]*?```/g, ' Há um exemplo de código para consultar no laboratório. ')
    .replace(/`([^`]+)`/g, '$1').replace(/\bHTML\b/g, 'agá tê eme ele').replace(/\bCSS\b/g, 'cê ésse ésse')
    .replace(/\bDOM\b/g, 'dóm').replace(/\bAPI\b/g, 'a pê i').replace(/\s+/g, ' ').trim();
}

export default function Narracao({ blocos, aoDestacar }: Props) {
  const [modo, definirModo] = useState<Modo>('indisponivel');
  const [vozes, definirVozes] = useState<Voz[]>([]);
  const [vozId, definirVozId] = useState('');
  const [velocidade, definirVelocidade] = useState(1);
  const [volume, definirVolume] = useState(1);
  const [estado, definirEstado] = useState<EstadoLeitura>('parada');
  const [indice, definirIndice] = useState(-1);
  const [erro, definirErro] = useState('');
  const ativo = useRef(false);
  const pausado = useRef(false);
  const indiceAtual = useRef(0);
  const proximoIndice = useRef<number | null>(null);
  const geracao = useRef(0);
  const idNativo = useRef('');
  const temporizador = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const falarAtual = useRef<(indice: number) => void>(() => {});
  const concluirAtual = useRef<() => void>(() => {});
  const destacarAtual = useRef(aoDestacar);
  destacarAtual.current = aoDestacar;
  const assinaturaBlocos = blocos.join('\u0000');
  const voz = vozes.find(v => v.id === vozId);

  function limparTemporizador() {
    if (temporizador.current !== undefined) clearTimeout(temporizador.current);
    temporizador.current = undefined;
  }

  function interromper() {
    ativo.current = false; pausado.current = false; geracao.current++;
    idNativo.current = ''; proximoIndice.current = null; limparTemporizador();
    if (modo === 'nativo') void narradorNativo.parar().catch(() => {});
    else if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
  }

  function falhar(mensagem: string) {
    ativo.current = false; pausado.current = false; limparTemporizador();
    definirEstado('erro'); definirErro(mensagem);
  }

  function iniciarParagrafo(posicao: number) {
    if (posicao >= blocos.length) { ativo.current = false; definirEstado('parada'); return; }
    const texto = prepararTexto(blocos[posicao]);
    if (!texto) {
      indiceAtual.current = posicao;
      proximoIndice.current = posicao + 1;
      temporizador.current = setTimeout(() => falarAtual.current(posicao + 1), 350);
      return;
    }
    const ciclo = geracao.current;
    ativo.current = true; pausado.current = false; indiceAtual.current = posicao; proximoIndice.current = null;
    definirErro(''); definirEstado('lendo'); definirIndice(posicao);
    const destacar = () => {
      if (!ativo.current || ciclo !== geracao.current) return;
      destacarAtual.current?.(posicao);
    };
    if (modo === 'nativo') {
      const id = `flow-${ciclo}-${posicao}-${Date.now()}`;
      idNativo.current = id;
      destacar();
      void narradorNativo.falar({ texto, idioma: voz?.idioma || 'pt-BR', voz: voz?.id, velocidade, volume, id })
        .catch(() => { if (ativo.current && ciclo === geracao.current) falhar('A voz local não está disponível. Instale uma voz em português nas configurações do Android e tente novamente.'); });
    } else if (modo === 'web') {
      const fala = new SpeechSynthesisUtterance(texto);
      fala.lang = voz?.idioma || 'pt-BR'; fala.voice = voz?.original ?? null;
      fala.rate = velocidade; fala.volume = volume;
      fala.onstart = destacar;
      fala.onend = () => { if (ativo.current && ciclo === geracao.current) concluirAtual.current(); };
      fala.onerror = evento => {
        if (ativo.current && ciclo === geracao.current && !['canceled', 'interrupted'].includes(evento.error)) {
          falhar('Não foi possível reproduzir a voz. Escolha outra voz ou continue a leitura do texto.');
        }
      };
      try { speechSynthesis.speak(fala); } catch { falhar('Não foi possível iniciar a narração neste navegador.'); }
    }
  }
  falarAtual.current = iniciarParagrafo;
  concluirAtual.current = () => {
    proximoIndice.current = indiceAtual.current + 1;
    if (pausado.current) return;
    temporizador.current = setTimeout(() => {
      temporizador.current = undefined;
      if (ativo.current && !pausado.current && proximoIndice.current !== null) falarAtual.current(proximoIndice.current);
    }, 350);
  };

  useEffect(() => {
    let descartado = false;
    const remocoes: (() => void)[] = [];
    const atualizarVozes = (lista: Voz[]) => {
      if (descartado) return;
      const ordenadas = [...lista].sort((a, b) => Number(b.local) - Number(a.local) || Number(/^pt-BR$/i.test(b.idioma)) - Number(/^pt-BR$/i.test(a.idioma)) || a.nome.localeCompare(b.nome));
      definirVozes(ordenadas);
      definirVozId(anterior => ordenadas.some(v => v.id === anterior) ? anterior : ordenadas.find(v => v.local && /^pt(-|$)/i.test(v.idioma))?.id || ordenadas.find(v => /^pt(-|$)/i.test(v.idioma))?.id || ordenadas[0]?.id || '');
    };
    const usarWeb = () => {
      if (descartado || typeof speechSynthesis === 'undefined' || typeof SpeechSynthesisUtterance === 'undefined') return;
      definirModo('web');
      const carregar = () => atualizarVozes(speechSynthesis.getVoices().map(v => ({ id: v.voiceURI, nome: v.name, idioma: v.lang, local: v.localService, original: v })));
      carregar(); speechSynthesis.addEventListener('voiceschanged', carregar);
      remocoes.push(() => speechSynthesis.removeEventListener('voiceschanged', carregar));
    };
    const receberFim = (evento: EventoNativo) => {
      if (!descartado && ativo.current && !pausado.current && !evento.cancelado && evento.id === idNativo.current) concluirAtual.current();
    };
    if (plataformaNativa()) {
      void (async () => {
        try {
          const resultado = await narradorNativo.vozes();
          const locais = resultado.vozes.filter(v => v.local && /^pt(-|$)/i.test(v.idioma));
          if (!locais.length) { usarWeb(); return; }
          const ouvintes = await Promise.all([
            narradorNativo.addListener('fim', receberFim),
            narradorNativo.addListener('erro', evento => { if (!descartado && ativo.current && evento.id === idNativo.current) falhar('A voz do dispositivo foi interrompida. Tente novamente ou leia o texto.'); }),
          ]);
          for (const ouvinte of ouvintes) {
            if (descartado) void ouvinte.remove();
            else remocoes.push(() => { void ouvinte.remove(); });
          }
          if (descartado) return;
          atualizarVozes(locais); definirModo('nativo');
        } catch { usarWeb(); }
      })();
    } else usarWeb();
    return () => { descartado = true; for (const remover of remocoes) remover(); };
  }, []);

  // Trocar painéis mantém a leitura se o componente continuar montado; sair da aula a encerra.
  useEffect(() => {
    definirIndice(-1); definirEstado('parada');
    return () => {
      ativo.current = false; geracao.current++; idNativo.current = ''; limparTemporizador();
      if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
      if (plataformaNativa()) void narradorNativo.parar().catch(() => {});
    };
  }, [assinaturaBlocos]);

  function ouvir(posicao = 0) { interromper(); iniciarParagrafo(posicao); }
  function pausar() {
    if (!ativo.current) return;
    pausado.current = true; limparTemporizador(); definirEstado('pausada');
    if (modo === 'nativo') { idNativo.current = ''; void narradorNativo.parar().catch(() => {}); }
    else speechSynthesis.pause();
  }
  function retomar() {
    pausado.current = false; definirEstado('lendo');
    if (proximoIndice.current !== null) iniciarParagrafo(proximoIndice.current);
    else if (modo === 'nativo') iniciarParagrafo(indiceAtual.current);
    else speechSynthesis.resume();
  }

  return <section className="narracao" aria-label="Narração e leitura da aula">
    <div className="narracao-controles">
      <button type="button" disabled={modo === 'indisponivel' || !blocos.length} onClick={() => ouvir()}>Ouvir aula</button>
      {estado === 'lendo' && <button type="button" onClick={pausar}>Pausar</button>}
      {estado === 'pausada' && <button type="button" onClick={retomar}>Retomar</button>}
      <button type="button" disabled={modo === 'indisponivel' || indice < 0} onClick={() => ouvir(Math.max(0, indiceAtual.current))}>Repetir trecho</button>
      <button type="button" disabled={estado === 'parada'} onClick={() => { interromper(); definirEstado('parada'); }}>Parar</button>
    </div>
    <div className="narracao-ajustes">
      <label>Velocidade <select value={velocidade} onChange={e => definirVelocidade(Number(e.target.value))}>
        {[0.75, 1, 1.25, 1.5].map(v => <option key={v} value={v}>{v.toLocaleString('pt-BR')}×</option>)}
      </select></label>
      <label>Voz <select value={vozId} disabled={!vozes.length} onChange={e => definirVozId(e.target.value)}>
        {!vozes.length && <option value="">Padrão do dispositivo</option>}
        {vozes.map(v => <option key={v.id} value={v.id}>{v.nome} ({v.idioma}){v.local ? ' · local' : ' · pode exigir internet'}</option>)}
      </select></label>
      <label>Volume <input type="range" min="0" max="1" step="0.1" value={volume} onChange={e => definirVolume(Number(e.target.value))} /></label>
    </div>
    <p className="narracao-disponibilidade" role="status">
      {modo === 'indisponivel' ? 'Narração indisponível neste dispositivo. Você pode continuar pelo texto abaixo.' : voz?.local ? 'Voz local instalada. A disponibilidade sem internet depende do dispositivo.' : 'Esta voz pode exigir internet. Para ouvir offline, instale uma voz local em português.'}
      {modo === 'nativo' && ' Ao retomar, o parágrafo atual será reiniciado.'}
      {estado === 'pausada' && ' Leitura pausada.'}
    </p>
    {(estado === 'lendo' || estado === 'pausada') && <small>As alterações de voz, velocidade e volume valem a partir do próximo trecho. Use Repetir trecho para aplicá-las agora.</small>}
    {erro && <p role="alert">{erro}</p>}
    <div className="narracao-paragrafos">
      {blocos.map((bloco, i) => <div key={i} className={`narracao-paragrafo${indice === i && estado !== 'parada' ? ' narracao-atual' : ''}`} aria-current={indice === i && estado !== 'parada' ? 'true' : undefined}>
        <p>{bloco}</p>
        <button type="button" className="narracao-ler-trecho" aria-label={`Ler a partir do parágrafo ${i + 1}`} disabled={modo === 'indisponivel'} onClick={() => ouvir(i)}>Ouvir este trecho</button>
      </div>)}
    </div>
  </section>;
}
