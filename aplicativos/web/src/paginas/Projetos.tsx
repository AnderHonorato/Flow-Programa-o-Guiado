import { type Flow } from "../componentes/useFlow";
import Icone from "../componentes/Icone";
import type { Aula } from "../../../../contratos/tipos";
const estados: Record<string, string> = {
  aguardando_sincronizacao: "Aguardando sincronização",
  pendente_validacao: "Pendente de validação",
  aprovada: "Aprovada pelo professor",
  revisar: "Revisar com orientação",
};
export default function Projetos({
  flow,
  aoAbrir,
}: {
  flow: Flow;
  aoAbrir: (a: Aula) => void;
}) {
  const { aulas } = flow;
  return (
    <>
      <div className="cabecalho-pagina">
        <div>
          <span className="sobretitulo">IDEIAS QUE VIRARAM CRIAÇÕES</span>
          <h1>Seu portfólio começa pequeno.</h1>
          <p>
            Cada envio preserva uma versão do seu trabalho. As correções chegam
            após revisão administrativa.
          </p>
        </div>
        <button
          className="botao secundario"
          disabled={!flow.sessao || flow.sincronizando || !flow.online}
          onClick={() => void flow.sincronizar()}
        >
          <Icone nome="rede" /> Atualizar correções
        </button>
      </div>
      {flow.fila.length === 0 ? (
        <div className="vazio">
          <Icone nome="projetos" tamanho={35} />
          <h2>Sua primeira criação está a uma aula de distância.</h2>
          <p>Envie um desafio pelo laboratório para começar seu histórico.</p>
          <button
            className="botao primario"
            onClick={() =>
              aoAbrir(
                aulas.find((a) => a.id === "html-primeira-pagina") || aulas[0],
              )
            }
          >
            Criar minha primeira página
          </button>
        </div>
      ) : (
        flow.fila
          .slice()
          .reverse()
          .map((t) => {
            const a = aulas.find((a) => a.id === t.aulaId);
            const feedback = t.feedback as
              | {
                  nota?: number;
                  pontosFortes?: string[];
                  falhas?: string[];
                  dicas?: string[];
                  limites?: string;
                }
              | undefined;
            return (
              <article className="painel-secao" key={t.id}>
                <span className="etiqueta">{estados[t.status]}</span>
                <h2 style={{ marginTop: 15 }}>{a?.titulo || t.aulaId}</h2>
                <p>
                  {new Date(t.criadaEm).toLocaleString("pt-BR")} · Versão{" "}
                  {t.id.slice(0, 8)}
                </p>
                {feedback && (
                  <div className="resumo">
                    <h3>
                      Seu retorno pedagógico
                      {feedback.nota !== undefined
                        ? ` · ${feedback.nota}/10`
                        : ""}
                    </h3>
                    {feedback.pontosFortes?.map((x) => (
                      <p key={x}>
                        <strong>Você já conseguiu:</strong> {x}
                      </p>
                    ))}
                    {feedback.falhas?.map((x) => (
                      <p key={x}>
                        <strong>Próximo ajuste:</strong> {x}
                      </p>
                    ))}
                    {feedback.dicas?.map((x) => (
                      <p key={x}>{x}</p>
                    ))}
                    {feedback.limites && <small>{feedback.limites}</small>}
                  </div>
                )}
                <details>
                  <summary>Ver código desta versão</summary>
                  {Object.entries(t.arquivos)
                    .filter(([, v]) => !!v)
                    .map(([k, v]) => (
                      <div key={k}>
                        <h3>{k.toUpperCase()}</h3>
                        <pre>{v}</pre>
                      </div>
                    ))}
                </details>
                {a && (
                  <button
                    className="link-botao"
                    style={{ marginTop: 15 }}
                    onClick={() => aoAbrir(a)}
                  >
                    Continuar trabalhando <Icone nome="seta" tamanho={17} />
                  </button>
                )}
              </article>
            );
          })
      )}
    </>
  );
}
