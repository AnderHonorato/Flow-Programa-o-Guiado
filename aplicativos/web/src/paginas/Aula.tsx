import { Suspense, lazy, useState } from "react";
import type { Aula as TipoAula } from "../../../../contratos/tipos";
import Narracao from "../audio/Narracao";
const Laboratorio = lazy(() => import("../laboratorios/Laboratorio"));
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
  const [respostas, setRespostas] = useState<Record<string, number>>({});
  const [pista, setPista] = useState(-1);
  const [resultado, setResultado] = useState(false);
  const [reacao, setReacao] = useState<
    "curioso" | "alegre" | "explicando" | "apoiando" | "comemorando"
  >("curioso");
  const completas = aula.questoes.every(
    (q) => flow.estado.respostas[`${aula.id}:${q.id}`],
  );
  return (
    <section className="pagina-aula">
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
          <div className="objetivo">
            <Icone nome="alvo" />
            <div>
              <strong>O que você vai aprender</strong>
              <p>{aula.objetivo}</p>
              {aula.preRequisitos.length > 0 && (
                <small>Antes desta aula: {aula.preRequisitos.join(", ")}</small>
              )}
            </div>
          </div>
          {aula.exemplos.map((exemplo, i) => (
            <section className="exemplo" key={i}>
              <span className="sobretitulo">
                EXEMPLO {String(i + 1).padStart(2, "0")}
              </span>
              <h2>{exemplo.titulo}</h2>
              <pre tabIndex={0}>
                <code>{exemplo.codigo}</code>
              </pre>
              <ol className="explicacao-linhas">
                {exemplo.explicacao.map((linha, j) => (
                  <li key={j}>{linha}</li>
                ))}
              </ol>
            </section>
          ))}
          <div className="resumo">
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
          <Jarvis
            estado={reacao}
            mensagem="Uma linha de cada vez. Experimente mudar o código para entender o resultado."
          />
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
          <div className="texto-editorial">
            <span className="sobretitulo">PENSE, EXPERIMENTE, DESCUBRA</span>
            <h2>O que ficou com você?</h2>
            <p>
              Errar faz parte. Cada alternativa explica o raciocínio, e você
              pode tentar quantas vezes precisar.
            </p>
          </div>
          {aula.questoes.map((q, i) => (
            <fieldset className="questao" key={q.id}>
              <legend>
                <span>0{i + 1}</span> {q.enunciado}
              </legend>
              {q.alternativas.map((a, j) => (
                <button
                  key={j}
                  aria-pressed={respostas[q.id] === j}
                  className={`alternativa ${respostas[q.id] === j ? (a.correta ? "correta" : "incorreta") : ""}`}
                  onClick={() => {
                    setRespostas((r) => ({ ...r, [q.id]: j }));
                    flow.registrarResposta(aula, q.id, a.correta);
                    setReacao(a.correta ? "alegre" : "apoiando");
                  }}
                >
                  <span>{String.fromCharCode(65 + j)}</span>
                  {a.texto}
                </button>
              ))}
              {respostas[q.id] !== undefined && (
                <p role="status" className="feedback">
                  {q.alternativas[respostas[q.id]].feedback}
                </p>
              )}
            </fieldset>
          ))}
          <button
            className="botao primario"
            onClick={() => setPainel("laboratorio")}
          >
            Ir para o laboratório <Icone nome="codigo" />
          </button>
          <Jarvis
            estado={reacao}
            mensagem={
              completas
                ? "Você compreendeu os conceitos. Agora, coloque em prática!"
                : "Leia a explicação de cada resposta. O importante é entender o motivo."
            }
          />
        </div>
      )}
      {painel === "laboratorio" && (
        <div
          id="painel-laboratorio"
          role="tabpanel"
          aria-labelledby="aba-laboratorio"
        >
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
          {pista >= 0 && (
            <div className="aviso pista" role="status">
              J.A.R.V.IS.: {aula.pistas[pista]}
            </div>
          )}
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
            Para registrar: acerte as questões da etapa Fixar e passe nas
            verificações do laboratório.
          </p>
        </div>
      )}
    </section>
  );
}
