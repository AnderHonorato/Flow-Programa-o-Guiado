import { Suspense, lazy, useEffect, useState } from "react";
import { AvatarEvolucao, ResumoEvolucao, CelebracaoEvolucao } from "./evolucao/Evolucao";
import { experiencia } from "./evolucao/regras";
import Icone from "./componentes/Icone";
import Jarvis from "./mascote/Jarvis";
import { useAudio } from "./audio/AudioProvider";
import { useFlow } from "./componentes/useFlow";
import Aula from "./paginas/Aula";
import Conta from "./paginas/Conta";
import Perfil from "./paginas/Perfil";
import Comunidade from "./comunidade/Comunidade";
import BoasVindas from "./entrada/BoasVindas";
import VerificacaoEntrada from "./entrada/VerificacaoEntrada";
import Compartilhar from "./componentes/Compartilhar";
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
  ["comunidade", "Comunidade e ranking"],
] as const;
export default function App() {
  const flow = useFlow();
  const audio = useAudio();
  const { catalogo, aulas } = flow;
  const [pagina, setPagina] = useState(
    () => localStorage.getItem("flow-pagina") || "inicio",
  );
  const [aulaId, setAulaId] = useState(
    () => localStorage.getItem("flow-aula") || "",
  );
  const [transicao, setTransicao] = useState(0);
  const [conta, setConta] = useState(false);
  const [menu, setMenu] = useState(false);
  useEffect(()=>{if(flow.sessao&&!flow.carregando)setConta(false);},[flow.sessao?.token,flow.carregando]);
  useEffect(() => { audio?.parar(); }, [pagina, flow.perfilId, conta, audio?.parar]);
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
    () => localStorage.getItem("flow-tema") || "escuro",
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
    setTransicao(t => t + 1);
    setMenu(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function abrir(a: TipoAula) {
    setAulaId(a.id);
    localStorage.setItem("flow-aula", a.id);
    flow.setEstado((e) => ({ ...e, ultimaAula: a.id }));
    navegar("aula");
  }
  if (!flow.nome) return <><div inert={conta}><BoasVindas aoIniciar={nome=>{flow.iniciar(nome);navegar("inicio");}} aoEntrar={()=>setConta(true)}/></div>{conta&&<Conta flow={flow} aoFechar={()=>setConta(false)}/>}</>;
  return (
    <div className="aplicativo">
      <CelebracaoEvolucao estado={flow.estado} perfilId={flow.perfilId} pronto={!flow.carregando} aoVerColecao={() => navegar("perfil")}/>
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
              data-jarvis-reacao="curioso"
              data-jarvis-mensagem={`Abrindo ${nome.toLocaleLowerCase("pt-BR")}. Uma nova descoberta começa por aqui!`}
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
          <Compartilhar/>
          <ResumoEvolucao estado={flow.estado} perfilId={flow.perfilId} compacto/>
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
            data-jarvis-reacao="orgulhoso" data-jarvis-mensagem="Seu perfil está ganhando personalidade. Cada conquista conta uma parte da sua história."
            onClick={() => navegar("perfil")}
          >
            <AvatarEvolucao estado={flow.estado} perfilId={flow.perfilId} tamanho={34}/>
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
            {flow.online && (
              <span className="conexao">
                <i />
                Disponível neste dispositivo
              </span>
            )}
            <button
              className="botao-icone"
              aria-label={`Ativar tema ${tema === "claro" ? "escuro" : "claro"}`}
              data-jarvis-reacao="surpreso"
              data-jarvis-mensagem={tema === "claro" ? "Modo noturno ativado. Meus circuitos agradecem o clima espacial!" : "Acenderam as luzes! Já posso guardar minha lanterna de bits."}
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
          <div key={transicao} className="transicao-pagina" aria-hidden="true"/>
          {!flow.online && (
            <div className="aviso-global" role="status">
              <span>Sem internet · modo offline</span>
            </div>
          )}
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
          {flow.carregando || flow.verificandoSessao ? (
            flow.sessao ? <VerificacaoEntrada etapa={flow.verificandoSessao?"sessao":"perfil"}/> : <p className="entrada-verificacao" role="status">Abrindo seu espaço de aprendizado neste dispositivo…</p>
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
                        Seu próximo passo{" "}
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
                  <ResumoEvolucao estado={flow.estado} perfilId={flow.perfilId}/>
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
                          {experiencia(flow.estado)}
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
                      <h2>Seu copiloto de aprendizagem</h2>
                      <p>Entenda os conceitos, experimente e transforme descobertas em novas conquistas.</p>
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
                  key={`${flow.perfilId}-${aula.id}-${pagina}`}
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
                <Diagnostico perfilId={flow.perfilId}
                  aoAbrir={abrir}
                  aoPular={() => navegar("inicio")}
                />
              )}
              {pagina === "certificados" && <Certificados flow={flow} />}
              {pagina === "comunidade" && <Comunidade key={flow.perfilId} flow={flow}/>}
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
          <small>v0.6.0</small>
        </footer>
      </div>
      <nav className="navegacao-inferior" aria-label="Atalhos do aplicativo" inert={conta || menu}>
        {[["inicio", "Início"], ["trilhas", "Trilhas"], ["codigo", "Praticar"], ["perfil", "Evolução"]].map(([id, nome]) => <button key={id} type="button" aria-current={pagina === id ? "page" : undefined} data-jarvis-reacao="curioso"
              data-jarvis-mensagem={`Abrindo ${nome.toLocaleLowerCase("pt-BR")}. Uma nova descoberta começa por aqui!`}
              onClick={() => navegar(id)}><Icone nome={id === "perfil" ? "raio" : id}/><span>{nome}</span></button>)}
      </nav>
      {conta && (!flow.sessao||flow.sessaoExpirada) && <Conta flow={flow} aoFechar={() => setConta(false)} />}
    </div>
  );
}
