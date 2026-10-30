import { useEffect, useRef, useState } from "react";
import { requisitar, type Sessao } from "../componentes/api";
import type { Flow } from "../componentes/useFlow";
import Icone from "../componentes/Icone";
import VerificacaoEntrada, {type EtapaEntrada} from '../entrada/VerificacaoEntrada';
export default function Conta({
  flow,
  aoFechar,
}: {
  flow: Flow;
  aoFechar: () => void;
}) {
  const dialogo = useRef<HTMLElement>(null);
  const fecharAtual = useRef(aoFechar);
  const ativo=useRef(true);
  const pedido=useRef<AbortController|null>(null);
  fecharAtual.current = aoFechar;
  useEffect(() => {
    ativo.current=true;
    const anterior = document.activeElement as HTMLElement | null;
    const seletor =
      "button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]";
    dialogo.current?.querySelector<HTMLElement>(seletor)?.focus();
    function tecla(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        fecharAtual.current();
      }
      if (e.key === "Tab") {
        const focaveis = [
          ...dialogo.current!.querySelectorAll<HTMLElement>(seletor),
        ].filter((x) => x.getClientRects().length);
        const primeiro = focaveis[0],
          ultimo = focaveis.at(-1);
        if (e.shiftKey && document.activeElement === primeiro) {
          e.preventDefault();
          ultimo?.focus();
        } else if (!e.shiftKey && document.activeElement === ultimo) {
          e.preventDefault();
          primeiro?.focus();
        }
      }
    }
    document.addEventListener("keydown", tecla);
    return () => {
      ativo.current=false;pedido.current?.abort();
      document.removeEventListener("keydown", tecla);
      anterior?.focus();
    };
  }, []);
  const [criando, setCriando] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");
  const [etapa,setEtapa]=useState<EtapaEntrada>('credenciais');
  return (
    <div className="modal-fundo">
      <section
        ref={dialogo}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-conta"
      >
        <button
          className="fechar-modal"
          aria-label="Fechar conta"
          onClick={aoFechar}
        >
          <Icone nome="fechar" />
        </button>
        <span className="sobretitulo">CONTINUE DE QUALQUER LUGAR</span>
        <h2 id="titulo-conta">
          {criando
            ? "Seu próximo capítulo começa aqui."
            : "Bom ter você de volta."}
        </h2>
        <p>
          Seu perfil local será vinculado à conta, preservando o progresso e os
          envios.
        </p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setOcupado(true);
            setEtapa('credenciais');
            setErro("");
            const controle=new AbortController();pedido.current=controle;
            const dados = new FormData(e.currentTarget);
            try {
              const s = await requisitar<Sessao>(
                criando ? "/contas" : "/sessao",
                undefined,
                {
                  method: "POST",
                  signal:controle.signal,
                  body: JSON.stringify({
                    email: dados.get("email"),
                    senha: dados.get("senha"),
                    ...(criando ? { nome: dados.get("nome") } : {}),
                  }),
                },
              );
              if(!ativo.current)return;
              setEtapa('sessao');
              const usuario=await requisitar<Sessao['usuario']>('/eu',s.token,{cache:'no-store',signal:controle.signal});
              if(!ativo.current)return;
              if(usuario.id!==s.usuario.id||!['admin','aluno'].includes(usuario.papel))throw new Error('Não foi possível confirmar as permissões da conta.');
              setEtapa('perfil');
              await flow.autenticar({...s,usuario},controle.signal);
              if(!ativo.current)return;
              setEtapa('pronto');
              aoFechar();
            } catch (e) {
              if(!ativo.current||controle.signal.aborted)return;
              setErro(
                e instanceof Error ? e.message : "Não foi possível entrar.",
              );
            } finally {
              if(ativo.current)setOcupado(false);
            }
          }}
        >
          {criando && (
            <label>
              Seu nome
              <input
                name="nome"
                autoComplete="name"
                required
                disabled={ocupado}
                defaultValue={flow.nome}
              />
            </label>
          )}
          <label>
            E-mail
            <input name="email" type="email" autoComplete="email" required disabled={ocupado}/>
          </label>
          <label>
            Senha
            <input
              name="senha"
              type="password"
              minLength={10}
              autoComplete={criando ? "new-password" : "current-password"}
              required
              disabled={ocupado}
            />
          </label>
          <small>
            Use pelo menos 10 caracteres. A senha é protegida por hash no
            servidor.
          </small>
          {erro && !ocupado && (
            <p className="erro" role="alert">
              {erro}
            </p>
          )}
          <button className="botao primario" disabled={ocupado || !flow.online}>
            {ocupado
              ? "Conectando…"
              : criando
                ? "Criar minha conta"
                : "Entrar na minha conta"}
          </button>
          {ocupado&&<VerificacaoEntrada etapa={etapa}/>}
        </form>
        {!flow.online && (
          <p>Você está sem internet. Seu perfil local continua disponível.</p>
        )}
        <button
          className="link-botao"
          disabled={ocupado}
          onClick={() => {
            setCriando(!criando);
            setErro("");
          }}
        >
          {criando ? "Já tenho uma conta" : "Quero criar uma conta"}
        </button>
        <p className="texto-auxiliar">
          Recuperação por e-mail depende da configuração do serviço pelo
          administrador.
        </p>
      </section>
    </div>
  );
}
