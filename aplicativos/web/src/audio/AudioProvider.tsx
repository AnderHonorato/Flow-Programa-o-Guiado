import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { narradorNativo, plataformaNativa, type EventoNativo } from './nativo';
import { dividirTrechos, type Trecho } from './texto';

export type IdiomaAudio = 'pt-BR' | 'en';
export type EstadoAudio = 'parada' | 'preparando' | 'falando' | 'pausada' | 'erro';
export type OrigemAudio = 'aula' | 'termo' | 'assistente';
export interface VozAudio { id: string; nome: string; idioma: string; local: boolean; original?: SpeechSynthesisVoice }
export interface PedidoLeitura { blocos: string[]; origem: OrigemAudio; inicio?: number; aoDestacar?: (indice: number) => void }
export interface AudioContexto {
  estado: EstadoAudio; origem: OrigemAudio | null; indice: number; texto: string; erro: string;
  modo: 'web' | 'nativo' | 'indisponivel'; idioma: IdiomaAudio; definirIdioma: (idioma: IdiomaAudio) => void;
  vozes: VozAudio[]; vozId: string; definirVozId: (id: string) => void;
  velocidade: number; definirVelocidade: (valor: number) => void; volume: number; volumeReproducao: number; definirVolume: (valor: number) => void;
  ler: (pedido: PedidoLeitura) => void; pausar: () => void; retomar: () => void; parar: () => void; repetir: () => void;
}
const ContextoAudio = createContext<AudioContexto | null>(null);
export const useAudio = () => useContext(ContextoAudio);
const normalizar = (idioma: string) => idioma.replaceAll('_', '-').toLowerCase();
export const vozDoIdioma = (voz: Pick<VozAudio, 'idioma'>, idioma: IdiomaAudio) => idioma === 'pt-BR'
  ? normalizar(voz.idioma) === 'pt-br' : /^en(?:-|$)/.test(normalizar(voz.idioma));
export const vozPermitida = (voz: Pick<VozAudio, 'idioma'>) => vozDoIdioma(voz, 'pt-BR') || vozDoIdioma(voz, 'en');
interface Sessao { trechos: Trecho[]; posicao: number; origem: OrigemAudio; aoDestacar?: (indice: number) => void; geracao: number; proximo: boolean; iniciada: boolean }

/** Uma só sessão de voz coordena a aula e as falas pedidas ao assistente. */
export function AudioProvider({ children }: { children: ReactNode }) {
  const [modo, definirModo] = useState<AudioContexto['modo']>('indisponivel');
  const [vozes, definirVozes] = useState<VozAudio[]>([]);
  const [idioma, setIdioma] = useState<IdiomaAudio>('pt-BR');
  const [vozPreferida, setVozPreferida] = useState('');
  const [velocidade, setVelocidade] = useState(1);
  const [volume, setVolume] = useState(1);
  const [volumeReproducao, setVolumeReproducao] = useState(1);
  const [estado, setEstado] = useState<EstadoAudio>('parada');
  const [origem, setOrigem] = useState<OrigemAudio | null>(null);
  const [indice, setIndice] = useState(-1);
  const [texto, setTexto] = useState('');
  const [erro, setErro] = useState('');
  const voz = vozes.find(v => v.id === vozPreferida && vozDoIdioma(v, idioma)) || vozes.find(v => vozDoIdioma(v, idioma));
  const configuracao = useRef({ modo, idioma, voz, velocidade, volume });
  configuracao.current = { modo, idioma, voz, velocidade, volume };
  const sessao = useRef<Sessao | null>(null);
  const sequencia = useRef(0);
  const idNativo = useRef('');
  const sequenciaNativa = useRef(0);
  const pausada = useRef(false);
  const tempo = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const esperaInicio = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const falar = useRef<() => void>(() => {});
  const terminar = useRef<() => void>(() => {});
  const montado = useRef(true);

  const limparTempo = useCallback(() => { clearTimeout(tempo.current); clearTimeout(esperaInicio.current); tempo.current = undefined; esperaInicio.current = undefined; }, []);
  const cancelar = useCallback(() => {
    const estavaPausada = pausada.current;
    sequencia.current++; sessao.current = null; idNativo.current = ''; pausada.current = false; limparTempo();
    if (configuracao.current.modo === 'nativo') void narradorNativo.parar().catch(() => {});
    else if (typeof speechSynthesis !== 'undefined') { speechSynthesis.cancel(); if (estavaPausada) speechSynthesis.resume(); }
  }, [limparTempo]);
  const parar = useCallback(() => {
    cancelar(); setEstado('parada'); setOrigem(null); setIndice(-1); setTexto(''); setErro('');
  }, [cancelar]);
  const falhar = useCallback((mensagem: string) => {
    cancelar(); if (!montado.current) return;
    setEstado('erro'); setErro(mensagem);
  }, [cancelar]);
  const iniciarReal = useCallback(() => {
    const atual = sessao.current;
    if (!atual) return;
    atual.iniciada = true;
    if (pausada.current) return;
    clearTimeout(esperaInicio.current); setEstado('falando');
    atual.aoDestacar?.(atual.trechos[atual.posicao].indice);
  }, []);
  terminar.current = () => {
    const atual = sessao.current;
    if (!atual) return;
    clearTimeout(esperaInicio.current); atual.proximo = true;
    if (pausada.current) return;
    if (atual.posicao + 1 >= atual.trechos.length) { sessao.current = null; idNativo.current = ''; setEstado('parada'); setOrigem(null); return; }
    setEstado('preparando');
    tempo.current = setTimeout(() => {
      if (sessao.current !== atual || pausada.current) return;
      atual.posicao++; atual.proximo = false; falar.current();
    }, 350);
  };
  falar.current = () => {
    const atual = sessao.current;
    if (!atual || pausada.current) return;
    const { modo: modoAtual, voz: vozAtual, velocidade: taxa, volume: intensidade } = configuracao.current;
    if (!vozAtual || modoAtual === 'indisponivel') { falhar('Instale uma voz em português do Brasil ou selecione inglês nas opções de áudio.'); return; }
    const trecho = atual.trechos[atual.posicao];
    atual.iniciada = false; setVolumeReproducao(intensidade);
    setEstado('preparando'); setIndice(trecho.indice); setTexto(trecho.texto);
    const vigente = () => montado.current && sessao.current === atual && atual.geracao === sequencia.current;
    esperaInicio.current = setTimeout(() => { if (vigente()) falhar('A voz não começou a leitura. Confira as vozes instaladas e tente novamente.'); }, 15000);
    if (modoAtual === 'nativo') {
      const id = `flow-${atual.geracao}-${atual.posicao}-${++sequenciaNativa.current}`;
      idNativo.current = id;
      void narradorNativo.falar({ texto: trecho.texto, idioma: vozAtual.idioma.replaceAll('_', '-'), voz: vozAtual.id, velocidade: taxa, volume: intensidade, id })
        .catch(() => { if (vigente()) falhar('Não foi possível iniciar a voz local. Confira as vozes instaladas no Android.'); });
    } else {
      const fala = new SpeechSynthesisUtterance(trecho.texto);
      fala.lang = vozAtual.idioma.replaceAll('_', '-'); fala.voice = vozAtual.original ?? null; fala.rate = taxa; fala.volume = intensidade;
      fala.onstart = () => { if (vigente()) iniciarReal(); };
      fala.onresume = () => { if (vigente()) iniciarReal(); };
      fala.onend = () => { if (vigente()) terminar.current(); };
      fala.onerror = evento => { if (vigente()) falhar(['canceled', 'interrupted'].includes(evento.error) ? 'A leitura foi interrompida pelo dispositivo. Toque em Ouvir para tentar novamente.' : 'Não foi possível reproduzir a voz. Escolha outra voz instalada ou continue pelo texto.'); };
      try { speechSynthesis.speak(fala); } catch { if (vigente()) falhar('Não foi possível iniciar a narração neste navegador.'); }
    }
  };
  const ler = useCallback((pedido: PedidoLeitura) => {
    cancelar();
    const config = configuracao.current;
    if (!config.voz || config.modo === 'indisponivel') { setEstado('erro'); setErro('Nenhuma voz compatível instalada. O padrão é português do Brasil; inglês pode ser escolhido como alternativa.'); return; }
    const trechos = dividirTrechos(pedido.blocos, config.idioma, pedido.inicio);
    if (!trechos.length) { setEstado('parada'); setOrigem(null); return; }
    sessao.current = { trechos, posicao: 0, origem: pedido.origem, aoDestacar: pedido.aoDestacar, geracao: sequencia.current, proximo: false, iniciada: false };
    setOrigem(pedido.origem); setErro(''); falar.current();
  }, [cancelar]);
  const pausar = useCallback(() => {
    const atual = sessao.current;
    if (!atual || pausada.current) return;
    pausada.current = true; limparTempo(); setEstado('pausada');
    if (configuracao.current.modo === 'nativo') { idNativo.current = ''; void narradorNativo.parar().catch(() => {}); }
    else if (typeof speechSynthesis !== 'undefined') speechSynthesis.pause();
  }, [limparTempo]);
  const retomar = useCallback(() => {
    const atual = sessao.current;
    if (!atual || !pausada.current) return;
    pausada.current = false;
    if (atual.proximo) {
      if (++atual.posicao >= atual.trechos.length) { parar(); return; }
      atual.proximo = false; falar.current();
    } else if (configuracao.current.modo === 'nativo') falar.current();
    else { setEstado(atual.iniciada ? 'falando' : 'preparando'); speechSynthesis.resume(); }
  }, [parar]);
  const repetir = useCallback(() => {
    const atual = sessao.current;
    if (!atual) return;
    const reinicio = atual.trechos[atual.posicao].indice;
    const trechos = atual.trechos.filter(t => t.indice >= reinicio);
    cancelar(); sessao.current = { ...atual, trechos, posicao: 0, geracao: sequencia.current, proximo: false, iniciada: false };
    setErro(''); falar.current();
  }, [cancelar]);
  const definirIdioma = useCallback((valor: IdiomaAudio) => { if (valor !== 'pt-BR' && valor !== 'en') return; parar(); setIdioma(valor); setVozPreferida(''); }, [parar]);
  const definirVozId = useCallback((valor: string) => { parar(); setVozPreferida(valor); }, [parar]);
  const definirVelocidade = useCallback((valor: number) => { if (Number.isFinite(valor)) setVelocidade(Math.min(1.5, Math.max(.75, valor))); }, []);
  const definirVolume = useCallback((valor: number) => { if (Number.isFinite(valor)) setVolume(Math.min(1, Math.max(0, valor))); }, []);

  useEffect(() => {
    montado.current = true;
    let descartado = false;
    const remocoes: (() => void)[] = [];
    const atualizar = (lista: VozAudio[]) => {
      if (descartado) return;
      const permitidas = lista.filter(vozPermitida).sort((a, b) => Number(vozDoIdioma(b, 'pt-BR')) - Number(vozDoIdioma(a, 'pt-BR')) || Number(b.local) - Number(a.local) || a.nome.localeCompare(b.nome));
      definirVozes(permitidas);
    };
    const usarWeb = () => {
      if (descartado || typeof speechSynthesis === 'undefined' || typeof SpeechSynthesisUtterance === 'undefined') return;
      definirModo('web');
      const carregar = () => atualizar(speechSynthesis.getVoices().map(v => ({ id: v.voiceURI, nome: v.name, idioma: v.lang, local: v.localService, original: v })));
      carregar(); speechSynthesis.addEventListener('voiceschanged', carregar);
      remocoes.push(() => speechSynthesis.removeEventListener('voiceschanged', carregar));
    };
    if (plataformaNativa()) {
      void (async () => {
        try {
          const resultado = await narradorNativo.vozes();
          const locais = resultado.vozes.filter(v => v.local && vozPermitida(v));
          if (descartado) return;
          if (!locais.length) { usarWeb(); return; }
          const receber = (evento: EventoNativo, tipo: 'inicio' | 'fim' | 'erro') => {
            if (descartado || !sessao.current || evento.id !== idNativo.current) return;
            if (tipo === 'inicio') iniciarReal();
            else if (tipo === 'erro') falhar('A voz do dispositivo foi interrompida. Confira o mecanismo de voz do Android.');
            else if (evento.cancelado) { if (!pausada.current) parar(); }
            else terminar.current();
          };
          for (const tipo of ['inicio', 'fim', 'erro'] as const) {
            const ouvinte = await narradorNativo.addListener(tipo, evento => receber(evento, tipo));
            if (descartado) { await ouvinte.remove(); return; }
            remocoes.push(() => { void ouvinte.remove(); });
          }
          if (!descartado) { atualizar(locais); definirModo('nativo'); }
        } catch { usarWeb(); }
      })();
    } else usarWeb();
    return () => { descartado = true; montado.current = false; cancelar(); for (const remover of remocoes) remover(); };
  }, [cancelar, falhar, iniciarReal, parar]);

  const valor = useMemo<AudioContexto>(() => ({ estado, origem, indice, texto, erro, modo, idioma, definirIdioma, vozes, vozId: voz?.id ?? '', definirVozId, velocidade, definirVelocidade, volume, volumeReproducao, definirVolume, ler, pausar, retomar, parar, repetir }),
    [estado, origem, indice, texto, erro, modo, idioma, definirIdioma, vozes, voz?.id, definirVozId, velocidade, definirVelocidade, volume, volumeReproducao, definirVolume, ler, pausar, retomar, parar, repetir]);
  return <ContextoAudio.Provider value={valor}>{children}</ContextoAudio.Provider>;
}
