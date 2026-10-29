import Seletor from '../componentes/Seletor';
import AdminUsuarios from '../administracao/AdminUsuarios';
import AdminAvaliacoes from '../administracao/AdminAvaliacoes';
import { useEffect, useState } from "react";
import type { Flow } from "../componentes/useFlow";
import { requisitar } from "../componentes/api";
import Icone from "../componentes/Icone";
interface TentativaAdmin {
  id: string;
  idServidor: string;
  usuarioId: string;
  aulaId: string;
  status: string;
  criadaEm: string;
  arquivos: Record<string, string>;
  feedback: unknown;
  versao?: number;
}
export default function Admin({ flow }: { flow: Flow }) {
  const [atualizacao,setAtualizacao]=useState(0);
  const [aba, setAba] = useState("fila");
  const [tentativas, setTentativas] = useState<TentativaAdmin[]>([]);
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState("");
  const [filtro, setFiltro] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("");
  const [catalogoTexto, setCatalogoTexto] = useState("");
  const [versao, setVersao] = useState(0);
  const [metricas, setMetricas] = useState<Record<string, unknown>>();
  const token = flow.sessao?.token;
  async function carregar() {
    if (!token || flow.sessao?.usuario.papel !== "admin") return;
    setErro("");
    setOcupado("carregar");
    try {
      if (aba === "fila")
        setTentativas(await requisitar("/admin/tentativas", token));
      if (aba === "conteudo") {
        const r = await requisitar<{ catalogo: unknown; versao: number }>(
          "/admin/catalogo",
          token,
        );
        setCatalogoTexto(JSON.stringify(r.catalogo, null, 2));
        setVersao(r.versao);
      }
      if (aba === "metricas")
        setMetricas(await requisitar("/admin/metricas", token));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar.");
    } finally {
      setOcupado("");
    }
  }
  useEffect(() => {
    void carregar();
  }, [aba, token]);
  if (flow.sessao?.usuario.papel !== "admin")
    return (
      <div className="vazio">
        <Icone nome="escudo" tamanho={36} />
        <h1>Acesso administrativo</h1>
        <p>
          Esta área exige uma conta de administrador. As permissões são
          verificadas no servidor.
        </p>
      </div>
    );
  async function corrigir(t: TentativaAdmin) {
    if (!token) return;
    setOcupado(t.idServidor);
    setErro("");
    try {
      await requisitar(`/admin/tentativas/${t.idServidor}/corrigir`, token, {
        method: "POST",
      });
      await carregar();
      flow.setAviso(
        "Avaliação GPT recebida. Revise os critérios antes da decisão final.",
      );
    } catch (e) {
      setErro(
        e instanceof Error ? e.message : "A avaliação não pôde ser concluída.",
      );
    } finally {
      setOcupado("");
    }
  }
  async function revisar(t: TentativaAdmin, form: HTMLFormElement) {
    if (!token) return;
    const d = new FormData(form);
    setOcupado(t.idServidor);
    setErro("");
    let feedback: unknown = t.feedback;
    try {
      const texto = String(d.get("feedback") || "").trim();
      if (texto) feedback = JSON.parse(texto);
      await requisitar(`/admin/tentativas/${t.idServidor}`, token, {
        method: "PATCH",
        body: JSON.stringify({
          status: d.get("status"),
          feedback,
          justificativa: d.get("justificativa"),
          ...(t.versao !== undefined ? { versaoBase: t.versao } : {}),
        }),
      });
      await carregar();
    } catch (e) {
      setErro(
        e instanceof SyntaxError
          ? "O feedback deve conter JSON válido."
          : e instanceof Error
            ? e.message
            : "Não foi possível salvar.",
      );
    } finally {
      setOcupado("");
    }
  }
  return (
    <>
      <div className="cabecalho-pagina">
        <div>
          <span className="sobretitulo">CUIDAR DE QUEM APRENDE</span>
          <h1>Administração pedagógica.</h1>
          <p>
            Conteúdo e correções com revisão humana, permissões no servidor e
            histórico de ações.
          </p>
        </div>
        <button
          className="botao secundario"
          onClick={() => {void carregar();setAtualizacao(n=>n+1);}}
          disabled={!!ocupado}
        >
          Atualizar
        </button>
      </div>
      <div className="abas" role="tablist" aria-label="Administração">
        {[
          ["fila", "Fila de correções"],
          ["usuarios", "Usuários"],
          ["opinioes", "Opiniões das aulas"],
          ["conteudo", "Conteúdo didático"],
          ["metricas", "Métricas e auditoria"],
        ].map(([id, t]) => (
          <button
            role="tab"
            aria-selected={aba === id}
            key={id}
            onClick={() => setAba(id)}
          >
            {t}
          </button>
        ))}
      </div>
      {aba === "usuarios" && <AdminUsuarios key={`${flow.perfilId}:${atualizacao}`} flow={flow}/>}
      {aba === "opinioes" && <AdminAvaliacoes key={`${flow.perfilId}:${atualizacao}`} flow={flow}/>}
      {erro && (
        <div className="aviso erro" role="alert">
          {erro}
        </div>
      )}
      {ocupado === "carregar" && <p role="status">Consultando o servidor…</p>}
      {aba === "fila" && (
        <>
          <div className="acoes-admin">
            <label>
              Buscar aluno ou aula
              <input
                type="search"
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
              />
            </label>
            <Seletor rotulo="Estado" valor={estadoFiltro} aoMudar={setEstadoFiltro} opcoes={[{ valor: '', rotulo: 'Todos' }, { valor: 'pendente_validacao', rotulo: 'Pendente de validação' }, { valor: 'aprovada', rotulo: 'Aprovada' }, { valor: 'revisar', rotulo: 'Revisar' }]}/>
          </div>
          {tentativas
            .filter(
              (t) =>
                (!estadoFiltro || t.status === estadoFiltro) &&
                `${t.usuarioId} ${t.aulaId} ${t.criadaEm}`
                  .toLowerCase()
                  .includes(filtro.toLowerCase()),
            )
            .map((t) => (
              <article className="tentativa" key={t.idServidor}>
                <span className="etiqueta">
                  {t.status.replaceAll("_", " ")}
                </span>
                <h3 style={{ marginTop: 15 }}>{t.aulaId}</h3>
                <p>
                  Aluno {t.usuarioId} ·{" "}
                  {new Date(t.criadaEm).toLocaleString("pt-BR")} · tentativa{" "}
                  {t.id}
                </p>
                <details>
                  <summary>Código enviado</summary>
                  {Object.entries(t.arquivos).map(([n, c]) => (
                    <div key={n}>
                      <h3>{n}</h3>
                      <pre>{c}</pre>
                    </div>
                  ))}
                </details>
                <button
                  className="botao primario"
                  style={{ margin: "20px 0" }}
                  disabled={!!ocupado}
                  onClick={() => void corrigir(t)}
                >
                  Enviar ao GPT para correção
                </button>
                <p className="texto-auxiliar">
                  Esta ação chama o modelo apenas agora, pelo servidor. Falhas
                  não aprovam o trabalho.
                </p>
                <details>
                  <summary>Revisão humana e decisão</summary>
                  <form
                    style={{ marginTop: 20, maxWidth: 700 }}
                    onSubmit={(e) => {
                      e.preventDefault();
                      void revisar(t, e.currentTarget);
                    }}
                  >
                    <label>
                      Feedback estruturado (JSON)
                      <textarea
                        name="feedback"
                        className="editor-catalogo"
                        style={{ minHeight: 180 }}
                        defaultValue={
                          t.feedback ? JSON.stringify(t.feedback, null, 2) : ""
                        }
                      />
                    </label>
                    <Seletor rotulo="Decisão" nome="status" valorInicial={t.status} opcoes={[{ valor: 'pendente_validacao', rotulo: 'Manter pendente' }, { valor: 'revisar', rotulo: 'Solicitar revisão' }, { valor: 'aprovada', rotulo: 'Aprovar' }]}/>
                    <label>
                      Justificativa humana
                      <input name="justificativa" required minLength={5} />
                    </label>
                    <button className="botao secundario" disabled={!!ocupado}>
                      Salvar decisão e auditoria
                    </button>
                  </form>
                </details>
              </article>
            ))}
          {!tentativas.length && !ocupado && (
            <div className="vazio">
              <h2>Nenhuma tentativa recebida.</h2>
              <p>Envios sincronizados dos alunos aparecerão aqui.</p>
            </div>
          )}
        </>
      )}
      {aba === "conteudo" && (
        <section className="painel-secao">
          <h2>Catálogo versionado · versão {versao}</h2>
          <p>
            Edite o JSON seguindo o contrato de aula. O servidor valida a
            estrutura antes de publicar e preserva versões anteriores. Módulos
            sem aulas completas devem continuar em produção editorial.
          </p>
          <label>
            Conteúdo do catálogo
            <textarea
              className="editor-catalogo"
              value={catalogoTexto}
              onChange={(e) => setCatalogoTexto(e.target.value)}
              spellCheck={false}
            />
          </label>
          <button
            className="botao primario"
            style={{ marginTop: 20 }}
            disabled={!!ocupado || !catalogoTexto}
            onClick={async () => {
              if (!token) return;
              setErro("");
              setOcupado("publicar");
              try {
                const r = await requisitar<{ versao: number }>(
                  "/admin/catalogo",
                  token,
                  {
                    method: "PUT",
                    body: JSON.stringify({
                      catalogo: JSON.parse(catalogoTexto),
                      versaoBase: versao,
                    }),
                  },
                );
                setVersao(r.versao);
                flow.setAviso(
                  "Nova versão publicada. Alunos conectados podem atualizar o catálogo.",
                );
              } catch (e) {
                setErro(
                  e instanceof Error ? e.message : "Não foi possível publicar.",
                );
              } finally {
                setOcupado("");
              }
            }}
          >
            Validar e publicar nova versão
          </button>
        </section>
      )}
      {aba === "metricas" && metricas && (
        <section className="painel-secao">
          <h2>Dados reais do servidor</h2>
          <pre>{JSON.stringify(metricas, null, 2)}</pre>
          <p>
            Os indicadores incluem apenas dados recebidos pelo servidor.
            Atividade offline ainda não sincronizada não aparece aqui.
          </p>
        </section>
      )}
    </>
  );
}
