import { useState } from "react";
import { type Flow } from "../componentes/useFlow";
import { atualizarRevisao, gerarVariacao } from "../offline/revisao";
import type { Aula } from "../../../../contratos/tipos";
import Jarvis from "../mascote/Jarvis";
import Icone from "../componentes/Icone";
export default function Revisao({
  flow,
  aoAbrir,
}: {
  flow: Flow;
  aoAbrir: (a: Aula) => void;
}) {
  const { aulas } = flow;
  const [ativa, setAtiva] = useState<Aula>();
  const [tentativa, setTentativa] = useState(0);
  const [revelada, setRevelada] = useState(false);
  const [resposta, setResposta] = useState("");
  const agendadas = Object.entries(flow.estado.revisoes).sort((a, b) =>
    a[1].proxima.localeCompare(b[1].proxima),
  );
  const variacao = ativa
    ? gerarVariacao(
        `${ativa.linguagem} ${ativa.competencia}`,
        new Date().getUTCDate(),
        tentativa,
      )
    : undefined;
  function avaliar(resultado: "correta" | "com_ajuda" | "incorreta") {
    if (!ativa) return;
    const a = ativa;
    flow.setEstado((e) => ({
      ...e,
      revisoes: {
        ...e.revisoes,
        [a.id]: atualizarRevisao(e.revisoes[a.id], resultado),
      },
    }));
    setAtiva(undefined);
    setRevelada(false);
    setResposta("");
    flow.setAviso(
      "Revisão registrada. O próximo intervalo acompanha sua compreensão.",
    );
  }
  return (
    <>
      <div className="cabecalho-pagina">
        <div>
          <span className="sobretitulo">CONHECIMENTO QUE FICA</span>
          <h1>Uma ideia merece ser revisitada.</h1>
          <p>
            Volte aos conceitos em intervalos de 1, 3, 7, 14 e 30 dias. Sem
            punições por faltar.
          </p>
        </div>
      </div>
      {ativa && variacao ? (
        <section className="flashcard">
          <span className="sobretitulo">
            {ativa.titulo} · {variacao.formato.replaceAll("_", " ")}
          </span>
          <h2>{variacao.enunciado}</h2>
          <pre>{variacao.codigo}</pre>
          <label>
            Seu raciocínio
            <textarea
              style={{ display: "block", width: "100%", margin: "12px 0 20px" }}
              value={resposta}
              onChange={(e) => setResposta(e.target.value)}
              rows={3}
            />
          </label>
          {!revelada ? (
            <button
              className="botao primario"
              onClick={() => setRevelada(true)}
            >
              Conferir explicação
            </button>
          ) : (
            <>
              <div className="resumo">
                <strong>{variacao.resposta}</strong>
                <p>{variacao.explicacao}</p>
              </div>
              <p>Compare com sua resposta e registre honestamente como foi:</p>
              <div
                className="botoes"
                style={{ display: "flex", gap: 10, flexWrap: "wrap" }}
              >
                <button
                  className="botao primario"
                  onClick={() => avaliar("correta")}
                >
                  Compreendi sem ajuda
                </button>
                <button
                  className="botao secundario"
                  onClick={() => avaliar("com_ajuda")}
                >
                  Precisei de ajuda
                </button>
                <button
                  className="botao secundario"
                  onClick={() => avaliar("incorreta")}
                >
                  Vou praticar mais
                </button>
              </div>
              <p className="texto-auxiliar">
                Esta autorreflexão agenda revisões. Ela não aprova um projeto ou
                emite certificado.
              </p>
            </>
          )}
          <button
            className="link-botao"
            style={{ display: "flex", marginTop: 20 }}
            onClick={() => {
              setTentativa((n) => n + 1);
              setRevelada(false);
              setResposta("");
            }}
          >
            Tentar outra variação
          </button>
        </section>
      ) : (
        <>
          {agendadas.length === 0 ? (
            <div className="vazio">
              <Icone nome="revisao" tamanho={35} />
              <h2>Seu repertório começa na primeira aula.</h2>
              <p>
                As ideias que você praticar aparecerão aqui para reforçar a
                memória.
              </p>
              <button
                className="botao primario"
                onClick={() => aoAbrir(aulas[0])}
              >
                Explorar a primeira aula
              </button>
            </div>
          ) : (
            <div className="grade-revisao">
              {agendadas.map(([id, r]) => {
                const a = aulas.find((x) => x.id === id);
                return a ? (
                  <section className="cartao-revisao" key={id}>
                    <span className="etiqueta">
                      {new Date(r.proxima) <= new Date()
                        ? "Para revisar agora"
                        : `Próxima: ${new Date(r.proxima).toLocaleDateString("pt-BR")}`}
                    </span>
                    <h2 style={{ marginTop: 18 }}>{a.titulo}</h2>
                    <p>{a.resumo}</p>
                    <button
                      className="botao secundario"
                      onClick={() => {
                        setAtiva(a);
                        setRevelada(false);
                      }}
                    >
                      Revisar esta ideia <Icone nome="seta" />
                    </button>
                  </section>
                ) : null;
              })}
            </div>
          )}
          <Jarvis
            estado="pensando"
            mensagem="Lembrar exige reencontrar uma ideia. Tente explicar com suas próprias palavras."
          />
        </>
      )}
    </>
  );
}
