import { useId } from 'react';
import Icone from '../componentes/Icone';
import Jarvis from '../mascote/Jarvis';
import { Emblema } from '../evolucao/Emblema';
import './entrada.css';

interface Props { aoIniciar: (nome: string) => void; aoEntrar: () => void; nomeInicial?: string }

/** A entrada apresenta o que a pessoa pode construir antes de pedir um cadastro. */
export default function BoasVindas({ aoIniciar, aoEntrar, nomeInicial = '' }: Props) {
  const nomeId = useId();
  return <main className="entrada-flow">
    <header className="entrada-flow-cabecalho">
      <a href="#entrada" className="entrada-flow-marca" aria-label="Flow, programação guiada"><img src="/icone.svg" alt=""/><span>flow<span>.</span></span></a>
      <button type="button" className="botao secundario entrada-flow-entrar" onClick={aoEntrar}>Entrar na minha conta <Icone nome="seta" tamanho={17}/></button>
    </header>
    <div className="entrada-flow-corpo" id="entrada">
      <section className="entrada-flow-convite" aria-labelledby="titulo-entrada-flow">
        <span className="entrada-flow-etiqueta"><span aria-hidden="true"/>APRENDA CRIANDO</span>
        <h1 id="titulo-entrada-flow">Sua ideia.<br/>Seu código.<br/><em>Sua próxima<br className="entrada-flow-quebra"/> conquista.</em></h1>
        <p className="entrada-flow-resumo">Explore aulas. Crie projetos. Veja sua evolução.</p>
        <form className="entrada-flow-formulario" onSubmit={e => {
          e.preventDefault();
          const nome = String(new FormData(e.currentTarget).get('nome') ?? '').trim();
          if (nome) aoIniciar(nome);
        }}>
          <label htmlFor={nomeId}>Como podemos chamar você?</label>
          <div className="entrada-flow-campo"><span aria-hidden="true"><Icone nome="perfil" tamanho={18}/></span><input id={nomeId} name="nome" defaultValue={nomeInicial} autoComplete="given-name" placeholder="Seu primeiro nome" required maxLength={60}/></div>
          <button type="submit" className="botao primario">Começar no meu dispositivo <Icone nome="seta" tamanho={18}/></button>
          <small>Seu progresso começa neste dispositivo.</small>
        </form>
      </section>
      <div className="entrada-flow-universo" aria-hidden="true">
        <div className="entrada-flow-halo entrada-flow-halo--um"/><div className="entrada-flow-halo entrada-flow-halo--dois"/>
        <svg className="entrada-flow-trajeto" viewBox="0 0 540 570" fill="none"><defs><linearGradient id="entrada-trajeto" x1="80" y1="510" x2="455" y2="40" gradientUnits="userSpaceOnUse"><stop stopColor="#6951c8"/><stop offset=".55" stopColor="#72c5ec"/><stop offset="1" stopColor="#9bedd4"/></linearGradient></defs><path className="entrada-flow-trilha" d="M66 504H170V422H335V330H245V225H438V77" stroke="url(#entrada-trajeto)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/><path d="M66 504H170V422H335V330H245V225H438V77" stroke="#d8e3ff" strokeOpacity=".3" strokeDasharray="2 10"/><circle cx="66" cy="504" r="7" fill="#b6a5ff"/><circle cx="335" cy="422" r="7" fill="#91d2f1"/><circle cx="245" cy="330" r="7" fill="#91d2f1"/><circle cx="438" cy="77" r="8" fill="#9bedd4"/><circle cx="438" cy="77" r="17" stroke="#9bedd4" strokeOpacity=".25"/></svg>
        <div className="entrada-flow-janela">
          <div className="entrada-flow-janela-barra"><span><i/><i/><i/></span><strong>minha-ideia.js</strong><span>JS</span></div>
          <div className="entrada-flow-editor"><div className="entrada-flow-numeros">01<br/>02<br/>03<br/>04<br/>05</div><code><b>const</b> ideia = <span>'criar'</span>;<br/><br/><b>function</b> meuProximoPasso() {'{'}<br/>&nbsp; <b>return</b> <span>'eu consigo'</span>;<br/>{'}'}<i className="entrada-flow-cursor"/></code></div>
          <div className="entrada-flow-editor-rodape"><span><i/>Código pronto para ganhar vida</span><Icone nome="play" tamanho={16}/></div>
        </div>
        <div className="entrada-flow-previa"><span className="entrada-flow-previa-titulo"><span/>SUA IDEIA, ACONTECENDO</span><svg viewBox="0 0 210 155" fill="none"><ellipse cx="109" cy="139" rx="58" ry="6" fill="#6852bc" fillOpacity=".22"/><path d="m103 109-9 22 15-9 12 6-4-22" fill="#a6e8db"/><path d="M81 92 68 109l22-4m37-13 14 17-23-4" fill="#9c8bea"/><path d="M88 45c3-10 15-24 21-29 7 5 19 19 21 29v43l-11 23H98L88 88Z" fill="#242e54" stroke="#b4a5ff" strokeWidth="2"/><path d="m89 45 20-15 20 15" fill="#8270cf"/><circle cx="109" cy="65" r="13" fill="#a6e8db"/><circle cx="109" cy="65" r="7" fill="#286a80"/><path d="M93 93h32M69 50l4 4m66-16 4 4M62 80h5m77 1h5M83 24v5m53 90v5" stroke="#bcceff" strokeWidth="2" strokeLinecap="round"/><path d="m53 28 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z" fill="#b4a5ff"/><path d="m157 65 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" fill="#a6e8db"/></svg><strong>Feito por você.</strong><span>Uma descoberta de cada vez.</span></div>
        <div className="entrada-flow-conquista"><span className="entrada-flow-conquista-sinal"><Icone nome="raio" tamanho={15}/></span><Emblema grau={3} desenho="nucleo" tamanho={68}/><div><span>SEU PRÓXIMO HORIZONTE</span><strong>Inventor</strong><small>Ideias que viram possibilidades.</small></div></div>
        <span className="entrada-flow-fragmento entrada-flow-fragmento--um">{'{ }'}</span><span className="entrada-flow-fragmento entrada-flow-fragmento--dois">&lt;/&gt;</span>
      </div>
    </div>
    <footer className="entrada-flow-rodape"><span><Icone nome="livro" tamanho={15}/>Aprenda</span><span><Icone nome="codigo" tamanho={15}/>Experimente</span><span><Icone nome="raio" tamanho={15}/>Evolua</span></footer>
    <Jarvis estado="curioso" mensagem="Uma ideia já é um começo. Vou acompanhar você do primeiro código à próxima conquista."/>
  </main>;
}
