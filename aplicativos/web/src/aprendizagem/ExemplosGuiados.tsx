import { useEffect, useId, useState } from 'react';
import type { Aula } from '../../../../contratos/tipos';
import { calcularExperimento, modeloDaAula, valoresIniciais } from './modeloExperimento';
import './aprendizagem.css';
import Seletor from '../componentes/Seletor';

export function ExperimentoGuiado({ aula }: { aula: Aula }) {
  const modelo = modeloDaAula(aula);
  const [valores, setValores] = useState(() => valoresIniciais(modelo));
  const [cliques, setCliques] = useState(0);
  const id = useId();
  useEffect(() => { setValores(valoresIniciais(modeloDaAula(aula))); setCliques(0); }, [aula.id]);
  const resultado = calcularExperimento(aula, valores, cliques);
  return <section className="experimento-guiado" aria-labelledby={`${id}-titulo`}>
    <div className="aprendizado-cabecalho"><span className="aprendizado-numero" aria-hidden="true">↗</span><div><span className="sobretitulo">AGORA, EXPLORE COM AS MÃOS</span><h3 id={`${id}-titulo`}>{modelo.titulo}</h3></div></div>
    <p>{modelo.instrucao}</p>
    <div className="experimento-controles">{modelo.controles.map(controle => controle.tipo === 'escolha'
      ? <Seletor key={controle.id} id={`${id}-${controle.id}`} rotulo={controle.rotulo} valor={String(valores[controle.id] ?? controle.inicial)} opcoes={(controle.opcoes ?? []).map(o => ({ valor: o.valor, rotulo: o.texto }))} aoMudar={valor => setValores(v => ({ ...v, [controle.id]: valor }))}/>
      : <label key={controle.id} htmlFor={`${id}-${controle.id}`}><span>{controle.rotulo}{controle.tipo === 'numero' && <strong>{valores[controle.id] ?? controle.inicial}</strong>}</span><input id={`${id}-${controle.id}`} aria-label={controle.rotulo} type={controle.tipo === 'numero' ? 'range' : 'text'} min={controle.minimo} max={controle.maximo} maxLength={100} value={valores[controle.id] ?? controle.inicial} onChange={e => setValores(v => ({ ...v, [controle.id]: e.target.value }))}/></label>)}</div>
    {aula.id === 'dom-eventos' && <div className="experimento-eventos"><button type="button" className="botao primario" onClick={() => setCliques(n => n + 1)}>Adicionar interessado</button><button type="button" className="botao secundario" onClick={() => setCliques(0)}>Reiniciar contagem</button></div>}
    <div className="experimento-grade"><div><span className="experimento-legenda">CÓDIGO DO MODELO</span><pre tabIndex={0}><code>{resultado.codigo}</code></pre></div><div className="experimento-retorno"><span className="experimento-legenda">OBSERVE O RESULTADO</span>{resultado.documento && <iframe title={`Experimento guiado: ${aula.titulo}`} srcDoc={resultado.documento} sandbox="" referrerPolicy="no-referrer" />}<output className="experimento-saida" aria-live="polite" aria-atomic="true">{resultado.resultado}</output></div></div>
    <p className="experimento-porquê"><strong>Por que aconteceu?</strong> {resultado.explicacao}</p>
    <button type="button" className="experimento-restaurar" data-jarvis-reacao="curioso" data-jarvis-mensagem="Experimento restaurado! Uma nova hipótese, outra descoberta." onClick={() => { setValores(valoresIniciais(modelo)); setCliques(0); }}>Restaurar o experimento</button>
  </section>;
}

/** Os exemplos editoriais continuam sendo a fonte do ensino; a navegação só os torna exploráveis. */
export default function ExemplosGuiados({ aula, aoConcluir }: { aula: Aula; aoConcluir?: () => void }) {
  const [exemploIndice, setExemploIndice] = useState(0);
  const [passo, setPasso] = useState(0);
  const [compreendido, setCompreendido] = useState(false);
  const id = useId();
  useEffect(() => { setExemploIndice(0); setPasso(0); setCompreendido(false); }, [aula.id]);
  const exemplo = aula.exemplos[exemploIndice] || aula.exemplos[0];
  const explicacoes = exemplo?.explicacao.length ? exemplo.explicacao : [aula.resumo];
  const explicacao = explicacoes[Math.min(passo, explicacoes.length - 1)];
  const linha = Number(explicacao.match(/^Linha\s+(\d+)/i)?.[1] || 0);
  const ultimo = passo >= explicacoes.length - 1;
  return <div className="aprendizagem-guiada" data-jarvis-conteudo>
    {exemplo && <section className="exemplo exemplo-guiado" aria-labelledby={`${id}-titulo`}>
      <div className="aprendizado-cabecalho"><span className="aprendizado-numero" aria-hidden="true">01</span><div><span className="sobretitulo">ENTENDA ANTES DE RESPONDER</span><h2 id={`${id}-titulo`}>{exemplo.titulo}</h2></div></div>
      <p>Avance pelo raciocínio e acompanhe a linha destacada. Você pode voltar sempre que precisar.</p>
      {aula.exemplos.length > 1 && <div className="exemplo-seletor" role="group" aria-label="Exemplos da aula">{aula.exemplos.map((item, indice) => <button type="button" key={item.titulo} aria-pressed={exemploIndice === indice} onClick={() => { setExemploIndice(indice); setPasso(0); }}>{indice + 1}. {item.titulo}</button>)}</div>}
      <div className="exemplo-progresso" role="progressbar" aria-label="Passos do exemplo" aria-valuemin={1} aria-valuemax={explicacoes.length} aria-valuenow={passo + 1} aria-valuetext={`Passo ${passo + 1} de ${explicacoes.length}`}><span style={{ width: `${((passo + 1) / explicacoes.length) * 100}%` }} /></div>
      <pre className="exemplo-codigo" tabIndex={0} aria-label="Código explicado linha por linha"><code>{exemplo.codigo.split('\n').map((conteudo, indice) => <span className={`exemplo-linha ${linha === indice + 1 ? 'exemplo-linha--ativa' : ''}`} key={indice}><span className="exemplo-linha-numero" aria-hidden="true">{indice + 1}</span><span>{conteudo || ' '}</span>{'\n'}</span>)}</code></pre>
      <div className="exemplo-raciocinio" aria-live="polite" aria-atomic="true"><span>PASSO {passo + 1} DE {explicacoes.length}</span><p>{explicacao}</p></div>
      <div className="exemplo-navegar" data-jarvis-reacao="explicando" data-jarvis-mensagem="Um passo de cada vez. Compare a explicação com a linha destacada: o código vai contando a história."><button type="button" className="botao secundario" disabled={passo === 0} onClick={() => setPasso(n => Math.max(0, n - 1))}>Passo anterior</button>{!ultimo ? <button type="button" className="botao primario" onClick={() => setPasso(n => Math.min(explicacoes.length - 1, n + 1))}>Próximo passo <span aria-hidden="true">→</span></button> : exemploIndice < aula.exemplos.length - 1 ? <button type="button" className="botao primario" onClick={() => { setExemploIndice(n => n + 1); setPasso(0); }}>Explorar próximo exemplo <span aria-hidden="true">→</span></button> : <button type="button" className="botao primario" onClick={() => { setCompreendido(true); aoConcluir?.(); }}>{compreendido ? 'Exemplos explorados ✓' : 'Entendi os exemplos'}</button>}</div>
    </section>}
    <ExperimentoGuiado aula={aula} />
  </div>;
}
