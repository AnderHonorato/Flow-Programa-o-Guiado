import { useEffect, useId, useState } from 'react';
import type { Aula } from '../../../../contratos/tipos';
import { planoDaMissao } from './planoDaMissao';
import './aprendizagem.css';

/** Preparação pedagógica; os checkboxes são compromissos de estudo, não resultados de testes. */
export default function PreparacaoDesafio({ aula, aoRever, aoIniciar }: { aula: Aula; aoRever: () => void; aoIniciar: () => void }) {
  const [etapa, setEtapa] = useState(0);
  const [entendido, setEntendido] = useState(false);
  const id = useId();
  useEffect(() => { setEtapa(0); setEntendido(false); }, [aula.id]);
  const etapas = ['Entender a missão', 'Planejar a solução', 'Conferir os critérios'];
  return <section className="preparacao-desafio" aria-labelledby={`${id}-titulo`}>
    <div className="aprendizado-cabecalho"><span className="aprendizado-numero" aria-hidden="true">02</span><div><span className="sobretitulo">ANTES DE ABRIR O EDITOR</span><h2 id={`${id}-titulo`}>Uma missão clara. Um passo por vez.</h2></div></div>
    <p>Você já conheceu os conceitos. Agora vamos transformar esse aprendizado em um plano de ação.</p>
    <ol className="preparacao-etapas">{etapas.map((nome, indice) => <li key={nome} className={indice === etapa ? 'atual' : indice < etapa ? 'percorrida' : ''}><span aria-hidden="true">{indice < etapa ? '✓' : indice + 1}</span><span>{nome}{indice === etapa && <small>Etapa atual</small>}</span></li>)}</ol>
    <div className="preparacao-conteudo" key={etapa}>
      {etapa === 0 && <><h3>O que você vai construir</h3><p className="preparacao-missao">{aula.desafio}</p><p><strong>Você vai aplicar:</strong> {aula.objetivo}</p><button type="button" className="botao secundario" onClick={aoRever}>Rever a explicação e os exemplos</button></>}
      {etapa === 1 && <><h3>Como começar sem se perder</h3><ol className="preparacao-plano">{planoDaMissao(aula).map(passo => <li key={passo.titulo}><strong>{passo.titulo}</strong> {passo.orientacao}</li>)}</ol><p className="preparacao-conceito"><strong>A ideia que sustenta o desafio:</strong> {aula.resumo}</p></>}
      {etapa === 2 && <><h3>Como saber se você chegou lá</h3><ul className="preparacao-criterios">{(aula.testes?.length ? aula.testes.map(t => t.descricao) : aula.rubrica).map((criterio, indice) => <li key={`${indice}-${criterio}`}><span aria-hidden="true">◇</span>{criterio}</li>)}</ul><p>“Testar código” confere os critérios automáticos. “Enviar desafio” salva seu trabalho para a revisão pedagógica. Você poderá corrigir o código e testar novamente antes de enviar.</p><label className="preparacao-confirmacao"><input type="checkbox" checked={entendido} onChange={e => setEntendido(e.target.checked)} />Entendi o objetivo e sei qual resultado vou procurar.</label></>}
    </div>
    <div className="exemplo-navegar" data-jarvis-reacao="concentrado" data-jarvis-mensagem="Entender o objetivo agora ajuda a escolher cada linha depois. Bora construir essa ideia!"><button type="button" className="botao secundario" disabled={etapa === 0} onClick={() => setEtapa(n => Math.max(0, n - 1))}>Voltar uma etapa</button>{etapa < 2 ? <button type="button" className="botao primario" onClick={() => setEtapa(n => n + 1)}>Próxima etapa <span aria-hidden="true">→</span></button> : <button type="button" className="botao primario" disabled={!entendido} onClick={aoIniciar}>Começar a construir <span aria-hidden="true">→</span></button>}</div>
  </section>;
}
