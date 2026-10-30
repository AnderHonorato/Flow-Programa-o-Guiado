import { useCallback, useEffect, useRef, useState } from 'react';
import type { ArquivosCodigo, Aula } from '../../../../contratos/tipos';
import EditorCodigo, { type Arquivo } from './EditorCodigo';
import { carregarProjeto, salvarProjeto, type Snapshot } from './armazenamento';
import { criarDocumento, testesDaAula, type MensagemLaboratorio } from './sandbox';
import ClienteApi from './ClienteApi';
import ClienteExecutor from './ClienteExecutor';
import { verificarSaida } from './saida';
import Icone from '../componentes/Icone';
import Seletor from '../componentes/Seletor';
import './laboratorio.css';
interface Props { aula: Aula; perfilId: string; aoTestar?: (resultado: { aprovado: boolean; mensagens: string[] }) => void; aoEnviar?: (arquivos: ArquivosCodigo) => void }
interface EntradaConsole { nivel: string; texto: string }
interface Resultado { id: string; descricao: string; aprovado: boolean; detalhe?: string }
interface Inspecao { seletor: string; tag: string; texto: string; largura: number; altura: number; margem: string; padding: string; display: string; arvore: { tag: string; profundidade: number }[] }
type Painel = 'codigo' | 'previa' | 'console' | 'testes';
export default function Laboratorio(props: Props) { return <LaboratorioInterno key={`${props.perfilId}:${props.aula.id}`} {...props} />; }
function LaboratorioInterno({ aula, perfilId, aoTestar, aoEnviar }: Props) {
  const [projeto] = useState(() => carregarProjeto(perfilId, aula.id, aula.arquivos));
  const [arquivos, setArquivos] = useState<ArquivosCodigo>(projeto.arquivos);
  const [snapshots, setSnapshots] = useState<Snapshot[]>(projeto.snapshots);
  const [arquivo, setArquivo] = useState<Arquivo>(aula.linguagem === 'python' ? 'python' : aula.linguagem === 'css' ? 'css' : ['javascript', 'dom'].includes(aula.linguagem) ? 'js' : 'html');
  const [painel, setPainel] = useState<Painel>('codigo');
  const [automatico, setAutomatico] = useState(true);
  const [dimensao, setDimensao] = useState('100%');
  const [documento, setDocumento] = useState('');
  const [consoleItens, setConsoleItens] = useState<EntradaConsole[]>([]);
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const [estado, setEstado] = useState('Pronto para editar.');
  const [salvo, setSalvo] = useState(true);
  const [linha, setLinha] = useState<number>();
  const [inspecao, setInspecao] = useState<Inspecao>();
  const [inspecionar, setInspecionar] = useState(false);
  const [pythonAtivo, setPythonAtivo] = useState(false);
  const quadro = useRef<HTMLIFrameElement>(null);
  const token = useRef('');
  const worker = useRef<Worker | null>(null);
  const tempoPrevia = useRef<ReturnType<typeof setTimeout> | null>(null);
  const limitePython = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retornoTeste = useRef(aoTestar);
  const codigoAtual = useRef(arquivos);
  const saidaPython = useRef<string[]>([]);
  const testarAposExecucao = useRef(false);
  retornoTeste.current = aoTestar;
  codigoAtual.current = arquivos;
  const adicionarConsole = useCallback((nivel: string, texto: string) => setConsoleItens(itens => [...itens.slice(-199), { nivel, texto: texto.slice(0, 8000) }]), []);
  const executarPrevia = useCallback(() => {
    if (tempoPrevia.current) { clearTimeout(tempoPrevia.current); tempoPrevia.current = null; }
    token.current = crypto.randomUUID();
    setConsoleItens([]); setInspecao(undefined);
    setEstado('Atualizando prévia…');
    setDocumento(criarDocumento(codigoAtual.current, token.current, testesDaAula(aula)));
  }, [aula]);
  useEffect(() => {
    token.current = ''; testarAposExecucao.current = false; setResultados([]);
    worker.current?.terminate(); worker.current = null;
    if (limitePython.current) clearTimeout(limitePython.current);
    setPythonAtivo(false);
    retornoTeste.current?.({ aprovado: false, mensagens: ['O código foi alterado. Execute as verificações novamente.'] });
  }, [arquivos]);
  useEffect(() => {
    const tempo = setTimeout(() => setSalvo(salvarProjeto(perfilId, aula.id, arquivos, snapshots)), 250);
    return () => clearTimeout(tempo);
  }, [arquivos, snapshots, perfilId, aula.id]);
  useEffect(() => {
    if (aula.linguagem === 'python') return;
    if (!automatico && documento) return;
    const tempo = setTimeout(executarPrevia, 450);
    tempoPrevia.current = tempo;
    return () => clearTimeout(tempo);
  // Documento não é dependência: atualização manual não deve iniciar um ciclo.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arquivos, automatico, executarPrevia, aula.linguagem]);
  useEffect(() => {
    const receber = (evento: MessageEvent<MensagemLaboratorio>) => {
      const mensagem = evento.data;
      if (evento.source !== quadro.current?.contentWindow || !mensagem || mensagem.canal !== 'flow-laboratorio' || mensagem.token !== token.current) return;
      if (mensagem.tipo === 'console' || mensagem.tipo === 'erro') adicionarConsole(mensagem.tipo === 'erro' ? 'error' : mensagem.nivel || 'log', typeof mensagem.texto === 'string' ? mensagem.texto : 'Mensagem sem texto');
      if (mensagem.tipo === 'pronto') { setEstado('Prévia atualizada.'); quadro.current?.contentWindow?.postMessage({ token: token.current, acao: 'inspecionar', ativo: inspecionar }, '*'); if (testarAposExecucao.current) { testarAposExecucao.current = false; quadro.current?.contentWindow?.postMessage({ token: token.current, acao: 'testar' }, '*'); } }
      if (mensagem.tipo === 'inspecao' && mensagem.dados && typeof mensagem.dados === 'object') { setInspecao(mensagem.dados as Inspecao); setArquivo('html'); setLinha(mensagem.linha || 1); setPainel('codigo'); }
      if (mensagem.tipo === 'testes' && Array.isArray(mensagem.dados)) {
        const lista = (mensagem.dados as Resultado[]).slice(0, 50); setResultados(lista); setEstado('Verificações concluídas.');
        retornoTeste.current?.({ aprovado: lista.length > 0 && lista.every(item => item.aprovado), mensagens: lista.map(item => `${item.aprovado ? 'Aprovado:' : 'Revise:'} ${item.descricao}${item.detalhe ? ': ' + item.detalhe : ''}`) });
      }
    };
    window.addEventListener('message', receber);
    return () => window.removeEventListener('message', receber);
  }, [adicionarConsole, inspecionar]);
  useEffect(() => () => { worker.current?.terminate(); if (limitePython.current) clearTimeout(limitePython.current); }, []);
  function pararPython() { worker.current?.terminate(); worker.current = null; if (limitePython.current) clearTimeout(limitePython.current); setPythonAtivo(false); setEstado('Python interrompido.'); }
  function executarPython(testar = false) {
    pararPython(); setPythonAtivo(true); setConsoleItens([]); saidaPython.current = [];
    setEstado('Carregando Python local…');
    const arquivosExecutados = codigoAtual.current;
    const executor = new Worker(new URL('./python.worker.ts', import.meta.url), { type: 'module' }); worker.current = executor;
    let carregou = false; let houveErro = false;
    const definirLimite = (ms: number) => { if (limitePython.current) clearTimeout(limitePython.current); limitePython.current = setTimeout(() => { pararPython(); adicionarConsole('error', carregou ? 'Tempo limite de 4 segundos. Revise laços e recursão.' : 'Python local indisponível ou carregamento excedeu 45 segundos. Verifique /pyodide/.'); }, ms); };
    definirLimite(45000);
    executor.onmessage = (evento: MessageEvent<{ tipo: string; texto?: string }>) => {
      if (worker.current !== executor || codigoAtual.current !== arquivosExecutados) return;
      const { tipo, texto = '' } = evento.data;
      if (tipo === 'estado') { setEstado(texto); if (texto.includes('Executando')) { carregou = true; definirLimite(4000); } }
      if (tipo === 'erro') houveErro = true;
      if (tipo === 'saida' || tipo === 'erro') { adicionarConsole(tipo === 'erro' ? 'error' : 'log', texto); if (tipo === 'saida') saidaPython.current.push(texto); }
      if (tipo === 'concluido') {
        if (limitePython.current) clearTimeout(limitePython.current); executor.terminate(); worker.current = null; setPythonAtivo(false); setEstado('Execução Python concluída.');
        if (testar) {
          const declarados = testesDaAula(aula);
          const lista = declarados.map(teste => ({ id: teste.id, descricao: teste.descricao, aprovado: !houveErro && teste.tipo === 'python' && verificarSaida(saidaPython.current, teste.esperado || '', teste.propriedade), detalhe: teste.tipo !== 'python' ? 'Este teste precisa de Python.' : undefined }));
          setResultados(lista); retornoTeste.current?.({ aprovado: lista.length > 0 && lista.every(item => item.aprovado), mensagens: lista.length ? lista.map(item => `${item.aprovado ? 'Aprovado:' : 'Revise:'} ${item.descricao}`) : ['Esta aula ainda não possui testes objetivos de Python.'] });
        }
      }
    };
    executor.onerror = evento => { pararPython(); adicionarConsole('error', `Python indisponível: ${evento.message}. O runtime deve estar instalado localmente em /pyodide/.`); };
    executor.postMessage({ codigo: arquivos.python || '' });
    setPainel(testar ? 'testes' : 'console');
  }
  function testar() { setPainel('testes'); if (aula.linguagem === 'python') executarPython(true); else { testarAposExecucao.current = true; executarPrevia(); } }
  function snapshot() { setSnapshots(lista => [{ id: crypto.randomUUID(), data: new Date().toISOString(), arquivos: { ...arquivos } }, ...lista].slice(0, 20)); setEstado('Versão salva neste perfil.'); }
  return <section className="laboratorio" aria-label={`Laboratório: ${aula.titulo}`}>
    <div className="lab-cabecalho"><div><span className="lab-eyebrow">APRENDER FAZENDO</span><h3>Seu laboratório</h3><p>Edite, observe e descubra o que muda.</p></div><div className="lab-principais"><button type="button" data-jarvis-reacao="surpreso" data-jarvis-mensagem="Código em ação! Vamos observar o resultado antes de tirar conclusões." onClick={() => aula.linguagem === 'python' ? executarPython() : executarPrevia()} disabled={pythonAtivo}><Icone nome="play" tamanho={16} /> Executar</button>{pythonAtivo && <button type="button" onClick={pararPython}><Icone nome="pausa" tamanho={16} /> Parar</button>}<button className="lab-botao-teste" type="button" data-jarvis-reacao="pensando" data-jarvis-mensagem="Testes são pistas: leia o que passou e o que ainda precisa mudar." onClick={testar} disabled={pythonAtivo}><Icone nome="check" tamanho={16} /> Testar código</button>{aoEnviar && <button type="button" onClick={() => aoEnviar({ ...arquivos })}>Enviar desafio</button>}</div></div>
    <div className="lab-desafio"><strong>Seu desafio</strong><p>{aula.desafio}</p></div>
    <div className="lab-status" role="status"><span>{estado}</span><span>{salvo ? 'Salvo neste dispositivo' : 'Não foi possível salvar. Mantenha esta tela aberta.'}</span></div>
    <nav className="lab-mobile-abas" aria-label="Painéis do laboratório">{(['codigo', 'previa', 'console', 'testes'] as Painel[]).map(item => <button type="button" key={item} aria-current={painel === item ? 'page' : undefined} onClick={() => setPainel(item)}>{({ codigo: 'Código', previa: 'Visualização', console: 'Console', testes: 'Testes' })[item]}{item === 'console' && consoleItens.length > 0 ? ` (${consoleItens.length})` : ''}</button>)}</nav>
    <div className="lab-paineis" data-painel={painel}>
      <section className="lab-editor" aria-label="Arquivos de código"><div className="lab-arquivos" role="tablist" aria-label="Arquivo">{(aula.linguagem === 'python' ? ['python'] as Arquivo[] : ['html', 'css', 'js'] as Arquivo[]).map(item => <button type="button" role="tab" aria-selected={arquivo === item} key={item} onClick={() => { setArquivo(item); setLinha(undefined); }}>{item === 'python' ? 'main.py' : item === 'html' ? 'index.html' : item === 'css' ? 'style.css' : 'script.js'}</button>)}</div><EditorCodigo arquivo={arquivo} codigo={arquivos[arquivo] || ''} aoMudar={codigo => setArquivos(atuais => atuais[arquivo] === codigo ? atuais : ({ ...atuais, [arquivo]: codigo }))} linha={linha} /><div className="lab-versoes"><button type="button" data-jarvis-reacao="alegre" data-jarvis-mensagem="Guardar uma versão é como criar um ponto de retorno no jogo. Boa estratégia!" onClick={snapshot}><Icone nome="mais" tamanho={14} /> Salvar versão</button><Seletor rotulo="Restaurar versão salva" valor="" desabilitado={!snapshots.length} opcoes={[{ valor: '', rotulo: snapshots.length ? `${snapshots.length} versões salvas` : 'Nenhuma versão salva', desabilitado: true }, ...snapshots.map((item, indice) => ({ valor: item.id, rotulo: `${indice + 1} · ${new Date(item.data).toLocaleString('pt-BR')}` }))]} aoMudar={valor => { const versao = snapshots.find(item => item.id === valor); if (versao) { setArquivos({ ...versao.arquivos }); setEstado('Versão restaurada.'); } }}/><button type="button" onClick={() => { snapshot(); setArquivos({ ...aula.arquivos }); setEstado('Código inicial restaurado. A edição anterior está nas versões.'); }}>Voltar ao início</button></div></section>
      <section className="lab-previa" aria-label="Visualização do projeto"><div className="lab-previa-cabecalho"><strong>Visualização ao vivo</strong><Seletor rotulo="Tela" valor={dimensao} aoMudar={setDimensao} opcoes={[{ valor: '100%', rotulo: 'Desktop' }, { valor: '768px', rotulo: 'Tablet · 768' }, { valor: '375px', rotulo: 'Celular · 375' }]}/></div>{aula.linguagem === 'python' ? <div className="lab-python-info"><span aria-hidden="true">Py</span><h4>Python real, neste dispositivo</h4><p>Execute o arquivo main.py. A saída aparece no Console. O runtime WebAssembly local pode demorar na primeira execução.</p><p>Limite: 4 segundos de execução. Entrada interativa e instalação de pacotes não são suportadas.</p><button type="button" onClick={() => setPainel('console')}>Ver console</button></div> : <><div className="lab-previa-acoes"><label><input type="checkbox" checked={automatico} onChange={evento => setAutomatico(evento.target.checked)} /> Atualizar ao digitar</label><button type="button" aria-pressed={inspecionar} onClick={() => { const ativo = !inspecionar; setInspecionar(ativo); quadro.current?.contentWindow?.postMessage({ token: token.current, acao: 'inspecionar', ativo }, '*'); }}><Icone nome="alvo" tamanho={14} /> {inspecionar ? 'Inspeção ativa' : 'Inspecionar elemento'}</button></div><div className="lab-moldura"><iframe ref={quadro} title={`Prévia isolada de ${aula.titulo}`} sandbox="allow-scripts allow-forms" referrerPolicy="no-referrer" srcDoc={documento} style={{ width: dimensao }} /></div><p className="lab-ajuda">HTML e CSS desenham esta prévia. JavaScript roda isolado; recursos externos são bloqueados pela política de conteúdo.</p>{inspecao && <details className="lab-inspecao" open><summary>{inspecao.seletor} · linha {linha}</summary><p>{inspecao.largura} × {inspecao.altura}px · display: {inspecao.display}<br />Margem: {inspecao.margem} · preenchimento: {inspecao.padding}</p><pre>{inspecao.arvore.map((item, indice) => `${'  '.repeat(item.profundidade)}${item.tag}${indice === 29 ? '\n…' : ''}`).join('\n')}</pre></details>}</>}</section>
      <section className="lab-console" aria-label="Console de execução"><div className="lab-painel-cabecalho"><h4>Console <span>{consoleItens.length}</span></h4><button type="button" onClick={() => setConsoleItens([])}>Limpar</button></div><div className="lab-console-saida" role="log" aria-live="polite">{consoleItens.length ? consoleItens.map((item, indice) => <pre key={indice} className={`lab-log-${item.nivel}`}><span aria-hidden="true">{item.nivel === 'error' ? '× ' : item.nivel === 'warn' ? '! ' : '› '}</span>{item.texto}</pre>) : <p>As mensagens de console.log e os erros aparecem aqui ao executar.</p>}</div></section>
      <section className="lab-testes" aria-label="Verificações objetivas"><div className="lab-painel-cabecalho"><h4>Verificações</h4><button type="button" data-jarvis-reacao="pensando" data-jarvis-mensagem="Testes são pistas: leia o que passou e o que ainda precisa mudar." onClick={testar} disabled={pythonAtivo}>Executar testes</button></div><p>Testes objetivos verificam o comportamento. O feedback pedagógico é uma etapa separada.</p>{resultados.length ? <ul>{resultados.map(item => <li key={item.id} className={item.aprovado ? 'lab-teste-ok' : 'lab-teste-revisar'}><strong><Icone nome={item.aprovado ? 'check' : 'revisao'} tamanho={14} /> {item.aprovado ? 'Aprovado: ' : 'Revise: '}{item.descricao}</strong>{item.detalhe && <small>{item.detalhe}</small>}</li>)}</ul> : <p className="lab-ajuda">Execute os testes para conferir seu código.</p>}<details><summary>Precisa de uma pista?</summary><ol>{aula.pistas.map((pista, indice) => <li key={indice}>{pista}</li>)}</ol></details></section>
    </div>{aula.linguagem === 'api' && <><ClienteApi /><ClienteExecutor perfilId={perfilId} codigo={arquivos.js} /></>}
  </section>;
}
