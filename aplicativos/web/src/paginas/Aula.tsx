import { Suspense, lazy, useState } from "react";
import type { Aula as TipoAula } from "../../../../contratos/tipos";
import Narracao from "../audio/Narracao";
import AvaliacaoDaAula from "../aprendizagem/AvaliacaoDaAula";
import {useRegistroLeitura} from "../aprendizagem/useRegistroLeitura";
const Laboratorio = lazy(() => import("../laboratorios/Laboratorio"));
import ExemplosGuiados from "../aprendizagem/ExemplosGuiados";
import PreparacaoDesafio from "../aprendizagem/PreparacaoDesafio";
import Questionario from "../aprendizagem/Questionario";
import Jarvis from "../mascote/Jarvis";
import Icone from "../componentes/Icone";
import type { Flow } from "../componentes/useFlow";
export default function Aula({
  aula,
  flow,
  modoLaboratorio = false,
}: {
  aula: TipoAula;
  flow: Flow;
  modoLaboratorio?: boolean;
}) {
  const [painel, setPainel] = useState(
    modoLaboratorio ? "laboratorio" : "aprender",
  );
  const [preparado, setPreparado] = useState(false);
  const [pista, setPista] = useState(-1);
  const [resultado, setResultado] = useState(false);
  const [reacao, setReacao] = useState<
    "curioso" | "alegre" | "explicando" | "apoiando" | "comemorando"
  >("curioso");
  useRegistroLeitura(flow.perfilId,aula.id,painel === "aprender" && !flow.carregando);
  const completas = !!flow.estado.avaliacoes?.[aula.id]?.revisada;
  return (
    <section className="pagina-aula">
      <Jarvis estado={reacao} mensagem={painel === "laboratorio" ? pista >= 0 ? aula.pistas[pista] : "Antes de programar, entenda o objetivo e o plano. Depois mude uma parte e observe o resultado." : painel === "praticar" ? "Sua escolha é definitiva. Pense no que aprendeu; vou explicar cada resultado depois do envio." : "Explore o exemplo passo a passo. Primeiro entenda, depois experimente."} />
      <div className="cabecalho-pagina">
        <div>
          <span className="sobretitulo">
            APRENDER FAZENDO · {aula.linguagem.toUpperCase()}
          </span>
          <h1>{aula.titulo}</h1>
          <p>{aula.objetivo}</p>
        </div>
        <span className="etiqueta">
          {flow.estado.aulasConcluidas.includes(aula.id)
            ? "Competência registrada"
            : "No seu ritmo"}
        </span>
      </div>
      <div className="abas" role="tablist" aria-label="Etapas da aula">
        {[
          ["aprender", "Aprender"],
          ["praticar", "Fixar"],
          ["laboratorio", "Laboratório"],
        ].map(([id, nome]) => (
          <button
            key={id}
            role="tab"
            id={`aba-${id}`}
            aria-controls={`painel-${id}`}
            tabIndex={painel === id ? 0 : -1}
            aria-selected={painel === id}
            onKeyDown={(e) => {
              const ids = ["aprender", "praticar", "laboratorio"];
              const atual = ids.indexOf(id);
              const proximo =
                e.key === "ArrowRight"
                  ? ids[(atual + 1) % 3]
                  : e.key === "ArrowLeft"
                    ? ids[(atual + 2) % 3]
                    : e.key === "Home"
                      ? ids[0]
                      : e.key === "End"
                        ? ids[2]
                        : null;
              if (proximo) {
                e.preventDefault();
                setPainel(proximo);
                document.getElementById(`aba-${proximo}`)?.focus();
              }
            }}
            data-jarvis-reacao={id === "aprender" ? "explicando" : "concentrado"}
            data-jarvis-mensagem={id === "aprender" ? "Primeiro vamos ligar as ideias ao exemplo. Selecione um termo do conteúdo para me perguntar sobre ele." : id === "praticar" ? "Hora de pensar com calma. Só vou corrigir depois que você enviar a avaliação." : "Laboratório aberto! Mude uma parte do código e observe o que acontece."}
            onClick={() => setPainel(id)}
          >
            {nome}
          </button>
        ))}
      </div>
      <div
        className="aula-grade"
        id="painel-aprender"
        role="tabpanel"
        aria-labelledby="aba-aprender"
        hidden={painel !== "aprender"}
      >
        <article className="conteudo-aula">
          <Narracao blocos={aula.blocos} />
          <div className="objetivo" data-jarvis-conteudo>
            <Icone nome="alvo" />
            <div>
              <strong>O que você vai aprender</strong>
              <p>{aula.objetivo}</p>
              {aula.preRequisitos.length > 0 && (
                <small>Antes desta aula: {aula.preRequisitos.map(id => flow.aulas.find(a => a.id === id)?.titulo || id).join(" · ")}</small>
              )}
            </div>
          </div>
          <p className="jarvis-dica-selecao"><Icone nome="busca" tamanho={16}/> Uma palavra nova? Selecione no conteúdo ou abra J.A.R.V.I.S e digite o termo.</p>
          <ExemplosGuiados aula={aula}/>
          <div className="resumo" data-jarvis-conteudo>
            <h2>Guarde esta ideia</h2>
            <p>{aula.resumo}</p>
            <h3>Onde é comum ter dúvida</h3>
            <ul>
              {aula.pontosDificeis.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
          <button
            className="botao primario"
            onClick={() => setPainel("praticar")}
          >
            Vamos praticar <Icone nome="seta" />
          </button>
        </article>
        <aside className="apoio-aula">
          <div className="roteiro">
            <span className="sobretitulo">SEU PERCURSO</span>
            <ol>
              <li>Ler e explorar exemplos</li>
              <li>Verificar a compreensão</li>
              <li>Construir no laboratório</li>
              <li>Enviar para revisão</li>
            </ol>
          </div>
          <button
            className="botao secundario"
            onClick={() => setPainel("laboratorio")}
          >
            Ir para o laboratório <Icone nome="codigo" />
          </button>
        </aside>
      </div>
      {painel === "praticar" && (
        <div
          className="fixacao"
          id="painel-praticar"
          role="tabpanel"
          aria-labelledby="aba-praticar"
        >
          <Questionario key={`${flow.perfilId}-${aula.id}`} aula={aula} flow={flow} aoRever={() => setPainel("aprender")} aoContinuar={() => setPainel("laboratorio")} />

        </div>
      )}
      {painel === "laboratorio" && (
        <div
          id="painel-laboratorio"
          role="tabpanel"
          aria-labelledby="aba-laboratorio"
        >
          {!preparado ? <PreparacaoDesafio aula={aula} aoRever={() => setPainel("aprender")} aoIniciar={() => setPreparado(true)}/> : <>
            <button className="link-botao" onClick={() => setPreparado(false)}>Rever o plano do desafio</button>
          <div className="desafio-barra">
            <div>
              <span className="sobretitulo">SEU MICRODESAFIO</span>
              <p>{aula.desafio}</p>
            </div>
            <button
              className="botao secundario"
              onClick={() => {
                setPista((p) => Math.min(p + 1, aula.pistas.length - 1));
                setReacao("explicando");
              }}
            >
              Preciso de uma pista
            </button>
          </div>

          <Suspense fallback={<p role="status">Abrindo o editor de código…</p>}>
            <Laboratorio
              aula={aula}
              perfilId={flow.perfilId}
              aoTestar={(r) => {
                setResultado(r.aprovado);
                setReacao(r.aprovado ? "comemorando" : "apoiando");
              }}
              aoEnviar={(arquivos) => void flow.enviar(aula, arquivos)}
            />
          </Suspense>
          <div className="pos-laboratorio">
            <div>
              <h2>Uma nova maneira de praticar</h2>
              <p>{aula.variacao}</p>
              <p>
                <strong>Critérios de revisão:</strong>{" "}
                {aula.rubrica.join(" · ")}
              </p>
              <small>
                As verificações automáticas orientam o exercício. A avaliação
                pedagógica final é feita separadamente pelo professor.
              </small>
            </div>
            <button
              className="botao primario"
              disabled={!resultado || !completas}
              onClick={() => {
                if (flow.concluir(aula)) {
                  setReacao("comemorando");
                  flow.setAviso(
                    "Competência registrada! Uma revisão foi agendada para amanhã. O projeto enviado continua sujeito à validação.",
                  );
                }
              }}
            >
              <Icone nome="check" /> Registrar competência
            </button>
          </div>
          <p className="texto-auxiliar">
            Para registrar: envie a avaliação, leia a correção e passe nas
            verificações do laboratório.
          </p>
          </>}
        </div>
      )}
      <AvaliacaoDaAula key={`${flow.perfilId}:${aula.id}`} aulaId={aula.id} titulo={aula.titulo} flow={flow}/>
    </section>
  );
}
