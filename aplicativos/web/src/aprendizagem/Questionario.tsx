import type { CSSProperties } from 'react';
import { useEffect, useRef, useState } from 'react';
import type { Aula } from '../../../../contratos/tipos';
import type { Flow } from '../componentes/useFlow';
import Icone from '../componentes/Icone';
import { analisar } from './avaliacao';
import './avaliacao.css';

export default function Questionario({ aula, flow, aoRever, aoContinuar }: { aula: Aula; flow: Flow; aoRever: () => void; aoContinuar: () => void }) {
  const prova = flow.estado.avaliacoes?.[aula.id] ?? { escolhas: {} };
  const resultado = analisar(aula, prova);
  const questoes = prova.correcao ?? aula.questoes;
  const [analisando, setAnalisando] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const resumo = useRef<HTMLDivElement>(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => { if (prova.enviadaEm) resumo.current?.focus(); }, [prova.enviadaEm]);
  const respondidas = Object.keys(prova.escolhas).filter(id => questoes.some(q => q.id === id)).length;
  function enviar() {
    if (!resultado.completa || prova.enviadaEm || analisando) return;
    setAnalisando(true);
    // Libera a pintura do estado ocupado antes de calcular e registrar a análise local.
    timer.current = setTimeout(() => { flow.enviarAvaliacao(aula); setAnalisando(false); }, 80);
  }
  return <section className="avaliacao" aria-label="Avaliação da aula" aria-busy={analisando}>
    <header className="avaliacao-intro">
      <span className="sobretitulo">MISSÃO DE COMPREENSÃO</span>
      <h2>Agora é com você.</h2>
      <p>Leia com calma. Ao tocar em uma alternativa, sua escolha fica definitiva nesta avaliação, inclusive ao sair e voltar. A nota e a explicação aparecem somente depois de enviar todas as respostas.</p>
      <button className="link-botao" onClick={aoRever}>Rever a explicação antes de responder <Icone nome="livro" tamanho={16}/></button>
      <div className="avaliacao-andamento"><span>{respondidas} de {questoes.length} respostas marcadas</span><progress aria-label="Respostas marcadas" max={questoes.length} value={respondidas}/></div>
    </header>
    {questoes.map((q, i) => {
      const escolha = prova.escolhas[q.id];
      return <fieldset className="questao" key={q.id} aria-describedby={`instrucao-${q.id}`}>
        <legend><span>{String(i + 1).padStart(2, '0')}</span> {q.enunciado}</legend>
        <p id={`instrucao-${q.id}`} className="escolha-instrucao">{escolha === undefined ? 'Escolha uma alternativa. Você não poderá trocá-la.' : prova.enviadaEm ? 'Resposta enviada e analisada.' : 'Escolha registrada. O resultado será revelado ao enviar a avaliação.'}</p>
        {q.alternativas.map((a, j) => <button key={j} type="button" data-jarvis-reacao="concentrado" data-jarvis-mensagem="Escolha registrada. Guardo meu suspense até você enviar todas as respostas!" aria-pressed={escolha === j} disabled={escolha !== undefined || analisando}
          className={`alternativa ${escolha === j ? 'selecionada' : ''} ${prova.enviadaEm && escolha === j ? a.correta ? 'correta' : 'incorreta' : ''}`}
          onClick={() => flow.escolherResposta(aula, q.id, j)}>
          <span>{String.fromCharCode(65 + j)}</span><span className="alternativa-texto">{a.texto}</span>{escolha === j && <Icone nome={prova.enviadaEm ? a.correta ? 'check' : 'revisao' : 'escudo'} tamanho={17}/>}</button>)}
      </fieldset>;
    })}
    {!prova.enviadaEm && <div className="avaliacao-envio"><button className="botao primario" disabled={!resultado.completa || analisando} data-jarvis-reacao="pensando" data-jarvis-mensagem="Vou analisar as escolhas e mostrar a explicação de cada resultado." onClick={enviar}><Icone nome={analisando ? 'revisao' : 'seta'}/>{analisando ? 'Analisando suas respostas…' : 'Enviar avaliação'}</button><p role="status">{analisando ? 'Conferindo cada escolha com os conceitos da aula.' : 'A correção acontece neste dispositivo e funciona offline.'}</p></div>}
    {prova.enviadaEm && <div className="avaliacao-resultado" ref={resumo} tabIndex={-1}>
      <div className="avaliacao-nota"><div className="nota-anel" style={{ '--nota': `${resultado.nota}%` } as CSSProperties}><strong>{resultado.nota}<small>/100</small></strong></div><div><span className="sobretitulo">ANÁLISE CONCLUÍDA</span><h2>{resultado.acertos === resultado.total ? 'Conceitos conectados!' : 'Vamos entender cada escolha.'}</h2><p>{resultado.acertos} de {resultado.total} respostas corretas · {resultado.acertos * 10} XP por compreensão. Sua nota permanece registrada.</p></div></div>
      <div className="correcao-itens">{resultado.itens.map((item, i) => <article className={`correcao-item ${item.correta ? 'acerto' : 'revisar'}`} key={item.questao.id}>
        <span className="correcao-etiqueta"><Icone nome={item.correta ? 'check' : 'revisao'} tamanho={16}/>Questão {i + 1} · {item.correta ? 'Correta' : 'Precisa de atenção'}</span>
        <h3>{item.questao.enunciado}</h3><p><strong>Você marcou:</strong> {item.questao.alternativas[item.escolha]?.texto}</p>
        <p>{item.questao.alternativas[item.escolha]?.feedback}</p>
        {!item.correta && <div className="correcao-solucao"><strong>O que deveria ter feito</strong><p>Escolher: {item.esperada.texto}</p><p>{item.esperada.feedback}</p></div>}
      </article>)}</div>
      <p>Errar também orienta o próximo passo. Leia os motivos e aplique a ideia no laboratório. Os erros entram na sua revisão; as escolhas desta avaliação continuam travadas.</p>
      <div className="botoes"><button className="botao secundario" onClick={aoRever}>Revisar os exemplos</button><button className="botao primario" onClick={() => { flow.revisarAvaliacao(aula); aoContinuar(); }}>Li a correção · ir para o laboratório <Icone nome="seta"/></button></div>
    </div>}
  </section>;
}
