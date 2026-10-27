import { Suspense, lazy, useEffect, useState } from "react";
import Icone from "./componentes/Icone";
import Jarvis from "./mascote/Jarvis";
import { useFlow } from "./componentes/useFlow";
import Aula from "./paginas/Aula";
import Conta from "./paginas/Conta";
import Perfil from "./paginas/Perfil";
const Admin = lazy(() => import("./paginas/Admin"));
import Revisao from "./paginas/Revisao";
import Projetos from "./paginas/Projetos";
import Diagnostico from "./paginas/Diagnostico";
import Certificados from "./paginas/Certificados";
import type { Aula as TipoAula } from "../../../contratos/tipos";
const navegacao = [
  ["inicio", "Início"],
  ["trilhas", "Trilhas"],
  ["aula", "Aulas"],
  ["codigo", "Laboratório"],
  ["revisao", "Revisão"],
  ["projetos", "Projetos"],
] as const;
export default function App() {
  const flow = useFlow();
  const { catalogo, aulas } = flow;
  const [pagina, setPagina] = useState(
    () => localStorage.getItem("flow-pagina") || "inicio",
  );
  const [aulaId, setAulaId] = useState(
    () => localStorage.getItem("flow-aula") || "",
  );
  const [conta, setConta] = useState(false);
  const [menu, setMenu] = useState(false);
  const [mobile, setMobile] = useState(
    () => window.matchMedia("(max-width:600px)").matches,
  );
  useEffect(() => {
    const media = window.matchMedia("(max-width:600px)");
    const atualizar = () => setMobile(media.matches);
    media.addEventListener("change", atualizar);
    return () => media.removeEventListener("change", atualizar);
  }, []);
  useEffect(() => {
    if (!menu) return;
    function fechar(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMenu(false);
        document
          .querySelector<HTMLButtonElement>('[aria-controls="navegacao-flow"]')
          ?.focus();
      }
    }
    document.addEventListener("keydown", fechar);
    return () => document.removeEventListener("keydown", fechar);
  }, [menu]);
  const [tema, setTema] = useState(
    () => localStorage.getItem("flow-tema") || "claro",
  );
  const [busca, setBusca] = useState("");
  const [trilhaAberta, setTrilhaAberta] = useState<string | null>(null);
  const aula =
    aulas.find((a) => a.id === aulaId) ||
    aulas.find((a) => a.id === "html-primeira-pagina") ||
    aulas[0];
  useEffect(() => {
    document.documentElement.dataset.tema = tema;
    localStorage.setItem("flow-tema", tema);
  }, [tema]);
  useEffect(() => {
    localStorage.setItem("flow-pagina", pagina);
  }, [pagina]);
  function navegar(p: string) {
    setPagina(p);
    setMenu(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function abrir(a: TipoAula) {
    setAulaId(a.id);
    localStorage.setItem("flow-aula", a.id);
    flow.setEstado((e) => ({ ...e, ultimaAula: a.id }));
    navegar("aula");
  }
  if (!flow.nome)
    return (
      <main className="boas-vindas">
        <div className="marca">
          <img src="/icone.svg" alt="" />
          <span>
            flow<span className="marca-ponto">.</span>
          </span>
        </div>
        <div className="entrada-grade">
          <section>
            <span className="sobretitulo">
              PROGRAMAÇÃO GUIADA, NO SEU RITMO
            </span>
            <h1>
              Pequenos passos.
              <br />
              Grandes <em>possibilidades.</em>
            </h1>
            <p>
              Entenda uma ideia, escreva o código e veja acontecer. Sua jornada
              para criar com tecnologia começa aqui.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                flow.iniciar(
                  String(new FormData(e.currentTarget).get("nome") || ""),
                );
                navegar("inicio");
              }}
            >
              <label htmlFor="nome">Como podemos chamar você?</label>
              <input
                id="nome"
                name="nome"
                autoComplete="given-name"
                placeholder="Seu primeiro nome"
                maxLength={60}
                required
              />
              <button className="botao primario">
                Começar no meu dispositivo <Icone nome="seta" />
              </button>
            </form>
            <small>
              Sem cadastro para começar. Aulas e trabalho salvos neste
              dispositivo.
            </small>
          </section>
          <div className="entrada-ilustracao">
            <div className="orbita orbita-1" />
            <div className="orbita orbita-2" />
            <div className="entrada-codigo">
              <span>&lt;ideia&gt;</span>
              <strong>
                aprender
                <br />
                criar
                <br />
                evoluir
              </strong>
              <span>&lt;/ideia&gt;</span>
            </div>
            <Jarvis
              estado="alegre"
              mensagem="Olá! Sou J.A.R.V.IS. Vou acompanhar suas descobertas."
            />
          </div>
        </div>
        <footer>
          Flow Programação Guiada · Aprender é construir, uma descoberta de cada
          vez.
        </footer>
      </main>
    );
  return (
    <div className="aplicativo">
      <a className="pular" href="#conteudo">
        Pular para o conteúdo
      </a>
      <aside
        id="navegacao-flow"
        inert={conta || (mobile && !menu)}
        className={`barra-lateral ${menu ? "aberta" : ""}`}
      >
        <a
          className="marca"
          href="#inicio"
          onClick={(e) => {
            e.preventDefault();
            navegar("inicio");
          }}
          aria-label="Flow início"
        >
          <img src="/icone.svg" alt="" />
          <span>
            flow<span className="marca-ponto">.</span>
          </span>
        </a>
        <span className="legenda-marca">PROGRAMAÇÃO GUIADA</span>
        <nav aria-label="Navegação principal">
          {navegacao.map(([id, nome]) => (
            <button
              key={id}
              className={pagina === id ? "ativo" : ""}
              aria-current={pagina === id ? "page" : undefined}
              onClick={() => navegar(id)}
            >
              <Icone nome={id} />
              <span>{nome}</span>
              {id === "revisao" &&
                Object.values(flow.estado.revisoes).some(
                  (r) => new Date(r.proxima) <= new Date(),
                ) && <i className="ponto" />}
            </button>
          ))}
        </nav>
        <div className="lateral-rodape">
          <div className="nota-local">
            <Icone nome={flow.sessao ? "rede" : "escudo"} />
            <span>
              {flow.sessao
                ? "Sua jornada conectada"
                : "Seu espaço de aprendizado"}
              <small>
                {flow.sessao
                  ? "Progresso com sincronização"
                  : "Seu progresso fica salvo aqui"}
              </small>
            </span>
          </div>
          <button
            className={pagina === "perfil" ? "ativo" : ""}
            onClick={() => navegar("perfil")}
          >
            <span className="avatar">
              {flow.nome.slice(0, 1).toUpperCase()}
            </span>
            <span>
              {flow.nome}
              <small>{flow.sessao ? "Conta conectada" : "Perfil local"}</small>
            </span>
            <Icone nome="seta" tamanho={16} />
          </button>
          {flow.sessao?.usuario.papel === "admin" && (
            <button onClick={() => navegar("admin")}>
              <Icone nome="admin" /> Administração
            </button>
          )}
        </div>
      </aside>
      {mobile && menu && (
        <button
          className="fundo-menu"
          aria-label="Fechar menu"
          onClick={() => setMenu(false)}
        />
      )}
      <div className="corpo" inert={conta}>
        <header className="barra-superior">
          <button
            className="somente-mobile botao-icone"
            aria-label={menu ? "Fechar navegação" : "Abrir navegação"}
            aria-expanded={menu}
            aria-controls="navegacao-flow"
            onClick={() => setMenu(!menu)}
          >
            <Icone nome="menu" />
          </button>
          <div className="caminho">
            Seu espaço <span>/</span>{" "}
            <strong>
              {navegacao.find((n) => n[0] === pagina)?.[1] ||
                (
                  {
                    perfil: "Perfil",
                    admin: "Administração",
                    diagnostico: "Diagnóstico",
                    certificados: "Certificados",
                  } as Record<string, string>
                )[pagina]}
            </strong>
          </div>
          <div className="acoes-superior">
            <span className={`conexao ${flow.online ? "" : "sem-rede"}`}>
              <i />
              {flow.online
                ? "Disponível neste dispositivo"
                : "Sem internet · modo offline"}
            </span>
            <button
              className="botao-icone"
              aria-label={`Ativar tema ${tema === "claro" ? "escuro" : "claro"}`}
              onClick={() => setTema(tema === "claro" ? "escuro" : "claro")}
            >
              <Icone nome={tema === "claro" ? "lua" : "sol"} />
            </button>
            {!flow.sessao && (
              <button
                className="botao pequeno secundario"
                onClick={() => setConta(true)}
              >
                Entrar
              </button>
            )}
          </div>
        </header>
        <main id="conteudo" tabIndex={-1}>
          {flow.sessaoExpirada && (
            <div className="aviso-global" role="alert">
              <span>Sua sessão expirou. Seu trabalho continua salvo.</span>
              <button
                className="botao secundario"
                onClick={() => setConta(true)}
              >
                Entrar novamente
              </button>
            </div>
          )}
          {flow.aviso && (
            <div className="aviso-global" role="status">
              <span>{flow.aviso}</span>
              <button
                aria-label="Fechar aviso"
                onClick={() => flow.setAviso("")}
              >
                <Icone nome="fechar" tamanho={18} />
              </button>
            </div>
          )}
          {flow.carregando ? (
            <p role="status">Abrindo seu espaço de aprendizado…</p>
          ) : (
            <>
              {pagina === "inicio" && (
                <>
                  <div className="saudacao">
                    <span className="sobretitulo">
                      QUE BOM VER VOCÊ, {flow.nome.toUpperCase()}.
                    </span>
                    <span className="data-editorial">
                      Aprenda algo. Crie algo.
                    </span>
                  </div>
                  <section className="hero-inicio">
                    <div className="hero-texto">
                      <span className="etiqueta">
                        <span className="ponto" /> SUA JORNADA JÁ COMEÇOU
                      </span>
                      <h1>
                        Seu próximo passo
                        <br />
                        começa com uma <em>ideia.</em>
                      </h1>
                      <p>
                        Transforme curiosidade em código. Uma aula, uma
                        descoberta e uma criação de cada vez.
                      </p>
                      <button
                        className="botao primario"
                        onClick={() =>
                          abrir(
                            aulas.find(
                              (a) => a.id === flow.estado.ultimaAula,
                            ) || aula,
                          )
                        }
                      >
                        Continuar aprendendo <Icone nome="seta" />
                      </button>
                      <button
                        className="link-botao"
                        style={{ display: "flex", marginTop: 12 }}
                        onClick={() => navegar("diagnostico")}
                      >
                        Descobrir meu ponto de partida
                      </button>
                      <div className="microtexto">
                        <Icone nome="check" tamanho={15} /> No seu ritmo. Sem
                        pressa para acertar.
                      </div>
                    </div>
                    <div className="hero-arte" aria-hidden="true">
                      <div className="degraus">
                        <div />
                        <div />
                        <div />
                      </div>
                      <div className="arte-codigo">
                        <span>
                          01 <b>const</b> ideia = <i>'começar';</i>
                        </span>
                        <span>
                          02 <b>aprender</b>(ideia);
                        </span>
                        <span>
                          03 criar(<i>possibilidades</i>);
                        </span>
                      </div>
                      <div className="arte-legenda">
                        <span>do primeiro código</span>
                        <strong>ao seu próprio caminho</strong>
                      </div>
                    </div>
                  </section>
                  <section className="metricas" aria-label="Seu progresso">
                    <div>
                      <span className="metrica-icone">
                        <Icone nome="livro" />
                      </span>
                      <div>
                        <strong>
                          {flow.estado.aulasConcluidas.length}
                          <small> aulas compreendidas</small>
                        </strong>
                        <span>Cada descoberta conta</span>
                      </div>
                    </div>
                    <div>
                      <span className="metrica-icone">
                        <Icone nome="raio" />
                      </span>
                      <div>
                        <strong>
                          {flow.estado.xp}
                          <small> pontos de experiência</small>
                        </strong>
                        <span>Aprendizado comprovado</span>
                      </div>
                    </div>
                    <div>
                      <span className="metrica-icone">
                        <Icone nome="revisao" />
                      </span>
                      <div>
                        <strong>
                          {
                            Object.values(flow.estado.revisoes).filter(
                              (r) => new Date(r.proxima) <= new Date(),
                            ).length
                          }
                          <small> revisões para hoje</small>
                        </strong>
                        <span>Fortaleça o que já aprendeu</span>
                      </div>
                    </div>
                  </section>
                  <div className="home-inferior">
                    <section className="continuar">
                      <div className="titulo-secao">
                        <h2>Um passo de cada vez</h2>
                        <button
                          className="link-botao"
                          onClick={() => navegar("trilhas")}
                        >
                          Ver todas as trilhas{" "}
                          <Icone nome="seta" tamanho={17} />
                        </button>
                      </div>
                      <div className="aula-destaque">
                        <div className="numero-aula">
                          01<span>&lt;/&gt;</span>
                        </div>
                        <div>
                          <span className="sobretitulo">
                            HTML · PRIMEIROS PASSOS
                          </span>
                          <h3>{aula.titulo}</h3>
                          <p>{aula.objetivo}</p>
                          <div className="aula-meta">
                            <span>Leitura + prática</span>
                            <span>Prévia ao vivo</span>
                            <span>Disponível offline</span>
                          </div>
                        </div>
                        <button
                          aria-label="Abrir primeira aula"
                          className="seta-circular"
                          onClick={() => abrir(aula)}
                        >
                          <Icone nome="seta" />
                        </button>
                      </div>
                      <div className="trilhas-curtas">
                        {catalogo.trilhas.slice(1, 4).map((t, i) => (
                          <button
                            key={t.id}
                            onClick={() => {
                              setTrilhaAberta(t.id);
                              navegar("trilhas");
                            }}
                          >
                            <span className="indice">0{i + 2}</span>
                            <strong>{t.titulo}</strong>
                            <span>
                              {t.modulos.flatMap((m) => m.aulas).length} aulas
                              publicadas
                            </span>
                            <Icone nome="seta" tamanho={17} />
                          </button>
                        ))}
                      </div>
                    </section>
                    <aside className="jarvis-home">
                      <span className="sobretitulo">
                        UM COMPANHEIRO DE DESCOBERTAS
                      </span>
                      <Jarvis
                        estado={flow.estado.xp > 0 ? "orgulhoso" : "curioso"}
                        mensagem={
                          flow.estado.xp > 0
                            ? "Seu progresso veio da compreensão. Que tal revisitar uma ideia hoje?"
                            : "Você não precisa saber tudo para começar. Vamos descobrir a primeira linha juntos?"
                        }
                      />
                      <button
                        className="link-botao"
                        onClick={() => abrir(aula)}
                      >
                        Vamos experimentar <Icone nome="seta" tamanho={17} />
                      </button>
                    </aside>
                  </div>
                </>
              )}
              {pagina === "trilhas" && (
                <>
                  <div className="cabecalho-pagina">
                    <div>
                      <span className="sobretitulo">
                        CURIOSIDADE TEM MUITOS CAMINHOS
                      </span>
                      <h1>Escolha o que quer construir.</h1>
                      <p>
                        Comece pelos fundamentos ou explore um tema. Os
                        pré-requisitos ajudam a orientar o caminho.
                      </p>
                    </div>
                  </div>
                  <label className="campo-busca">
                    <Icone nome="busca" />
                    <input
                      type="search"
                      aria-label="Buscar trilhas"
                      placeholder="Encontre sua próxima descoberta"
                      value={busca}
                      onChange={(e) => setBusca(e.target.value)}
                    />
                  </label>
                  <div className="catalogo">
                    {catalogo.trilhas
                      .filter((t) =>
                        `${t.titulo} ${t.descricao}`
                          .toLocaleLowerCase("pt-BR")
                          .includes(busca.toLocaleLowerCase("pt-BR")),
                      )
                      .map((t, i) => (
                        <section className="trilha" key={t.id}>
                          <button
                            className="trilha-cabecalho"
                            onClick={() =>
                              setTrilhaAberta(
                                trilhaAberta === t.id ? null : t.id,
                              )
                            }
                            aria-expanded={trilhaAberta === t.id}
                          >
                            <span className="indice-trilha">
                              {String(i + 1).padStart(2, "0")}
                            </span>
                            <div>
                              <h2>{t.titulo}</h2>
                              <p>{t.descricao}</p>
                              <small>
                                {t.modulos.length} módulos ·{" "}
                                {t.modulos.flatMap((m) => m.aulas).length} aulas
                                publicadas
                              </small>
                            </div>
                            <Icone nome="mais" />
                          </button>
                          {trilhaAberta === t.id && (
                            <div className="mapa-modulos">
                              <p className="texto-auxiliar">
                                Pré-requisitos recomendados:{" "}
                                {t.preRequisitos.join(", ") ||
                                  "Nenhum. Pode começar por aqui."}
                              </p>
                              {t.modulos.map((m, j) => (
                                <div className="modulo" key={m.id}>
                                  <span className="marco">{j + 1}</span>
                                  <div>
                                    <h3>{m.titulo}</h3>
                                    {m.estado === "em_producao" ? (
                                      <span className="etiqueta">
                                        Em produção editorial
                                      </span>
                                    ) : (
                                      m.aulas.map((a) => (
                                        <button
                                          key={a.id}
                                          className="linha-aula"
                                          onClick={() => abrir(a)}
                                        >
                                          <Icone
                                            nome={
                                              flow.estado.aulasConcluidas.includes(
                                                a.id,
                                              )
                                                ? "check"
                                                : "livro"
                                            }
                                            tamanho={18}
                                          />
                                          <span>{a.titulo}</span>
                                          <Icone nome="seta" tamanho={18} />
                                        </button>
                                      ))
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </section>
                      ))}
                  </div>
                </>
              )}
              {(pagina === "aula" || pagina === "codigo") && aula && (
                <Aula
                  key={`${aula.id}-${pagina}`}
                  aula={aula}
                  flow={flow}
                  modoLaboratorio={pagina === "codigo"}
                />
              )}
              {pagina === "revisao" && <Revisao flow={flow} aoAbrir={abrir} />}
              {pagina === "projetos" && (
                <Projetos flow={flow} aoAbrir={abrir} />
              )}
              {pagina === "diagnostico" && (
                <Diagnostico
                  aoAbrir={abrir}
                  aoPular={() => navegar("inicio")}
                />
              )}
              {pagina === "certificados" && <Certificados flow={flow} />}
              {pagina === "perfil" && (
                <>
                  <Perfil flow={flow} aoEntrar={() => setConta(true)} />
                  <button
                    className="botao secundario"
                    style={{ marginTop: 24 }}
                    onClick={() => navegar("certificados")}
                  >
                    Meus certificados internos
                  </button>
                </>
              )}
              {pagina === "admin" && (
                <Suspense
                  fallback={<p role="status">Abrindo administração…</p>}
                >
                  <Admin flow={flow} />
                </Suspense>
              )}
            </>
          )}
        </main>
        <footer className="rodape-app">
          <span>Flow Programação Guiada</span>
          <span>Pequenos passos. Conhecimento que fica.</span>
          <small>v0.1.0</small>
        </footer>
      </div>
      {conta && <Conta flow={flow} aoFechar={() => setConta(false)} />}
    </div>
  );
}
