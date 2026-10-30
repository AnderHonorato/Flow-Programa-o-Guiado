import {useEffect, useRef, useState} from 'react';
import {lerRecursoLocal, salvarRecursoLocal} from '../offline/armazenamento';
import Jarvis from '../mascote/Jarvis';
import '../aprendizagem/avaliacao.css';
import type {Aula} from '../../../../contratos/tipos';
import {catalogoIncluido} from '../offline/catalogo';

export const questoesDiagnostico = [
 {formato:'Escolher a estrutura',enunciado:'Qual elemento HTML indica o título principal do conteúdo?',alternativas:['<h1>','<p>','<title>'],correta:0,feedback:['h1 organiza o título principal visível.','p marca um parágrafo; o título principal usa h1.','title nomeia a aba do navegador; h1 é o título principal visível.'],aulaId:'html-primeira-pagina'},
 {formato:'Verdadeiro ou falso',enunciado:'No box model, padding cria espaço entre o conteúdo e a borda.',alternativas:['Verdadeiro','Falso'],correta:0,feedback:['Sim. Margin cria o espaço externo à borda.','Padding é o espaço interno; margin é o espaço externo.'],aulaId:'css-box-model'},
 {formato:'Prever a saída',enunciado:'O que console.log(2 + "3") mostra em JavaScript?',alternativas:['5','23','Um erro'],correta:1,feedback:['Com uma string, + concatena. O resultado é o texto "23".','Sim: + concatena o número convertido para texto e a string.','Essa expressão é válida e resulta no texto "23".'],aulaId:'js-valores'},
 {formato:'Completar um trecho',enunciado:'Complete document.____("h1") para selecionar o primeiro h1.',alternativas:['querySelector','addEventListener','textContent'],correta:0,feedback:['querySelector recebe um seletor CSS e encontra o primeiro elemento.','addEventListener registra um evento; querySelector encontra um elemento.','textContent altera ou lê texto de um nó; querySelector encontra o elemento.'],aulaId:'dom-selecao'},
 {formato:'Encontrar o bug',enunciado:'Em Python: def dobro(n):\n    return n + 2\nO objetivo é devolver o dobro. Qual mudança corrige a função?',alternativas:['return n * 2','print(n)','return 2'],correta:0,feedback:['Multiplicar por 2 devolve o dobro de qualquer número.','print mostra uma saída, mas não devolve o dobro. Use return n * 2.','Essa função sempre devolveria 2. O cálculo depende de n: return n * 2.'],aulaId:'python-funcoes'},
];
const publicadas = catalogoIncluido.trilhas.flatMap(t=>t.modulos.filter(m=>m.estado==='publicado').flatMap(m=>m.aulas));
export function recomendarAula(respostas:number[]):Aula {
 const lacuna=questoesDiagnostico.find((q,i)=>respostas[i]!==q.correta);
 return publicadas.find(a=>a.id===(lacuna?.aulaId||'js-funcoes'))||publicadas[0];
}
interface RegistroDiagnostico {
 versao: 1;
 respostas: number[];
 indice: number;
 enviada: boolean;
}
const chaveDiagnostico = 'diagnostico:primeira-tentativa:v2';
const vazio = (): RegistroDiagnostico => ({versao:1,respostas:[],indice:0,enviada:false});
function registroValido(valor: unknown): valor is RegistroDiagnostico {
 if(typeof valor!=='object'||valor===null)return false;
 const r=valor as RegistroDiagnostico;
 return r.versao===1&&Array.isArray(r.respostas)&&r.respostas.length<=5&&r.respostas.every((escolha,i)=>Number.isInteger(escolha)&&escolha>=0&&escolha<questoesDiagnostico[i].alternativas.length)&&Number.isInteger(r.indice)&&r.indice>=0&&r.indice<5&&r.indice<=r.respostas.length&&typeof r.enviada==='boolean'&&(!r.enviada||r.respostas.length===5);
}
type Props = {perfilId:string;aoAbrir:(aula:Aula)=>void;aoPular:()=>void};
/** O key reinicia o estado antes do render de outro perfil, inclusive durante leituras lentas. */
export default function Diagnostico(props:Props){return <DiagnosticoDoPerfil key={props.perfilId} {...props}/>;}
function DiagnosticoDoPerfil({perfilId,aoAbrir,aoPular}:Props){
 const [registro,setRegistro]=useState<RegistroDiagnostico>(vazio);
 const atual=useRef(registro);
 const [carregando,setCarregando]=useState(true);
 const [salvando,setSalvando]=useState(false);
 const [analisando,setAnalisando]=useState(false);
 const [erro,setErro]=useState('');
 const [falhaLeitura,setFalhaLeitura]=useState(false);
 const ativo=useRef(true);
 const gravacao=useRef<Promise<void>>(Promise.resolve());
 const erroGravacao=useRef(false);
 const finalizando=useRef(false);
 const ocupado=useRef(false);
 useEffect(()=>{
  ativo.current=true;
  void lerRecursoLocal<unknown>(perfilId,chaveDiagnostico).then(r=>{
   if(!ativo.current)return;
   if(r!==undefined&&!registroValido(r))throw new Error('O diagnóstico salvo não pôde ser reconhecido. Seus dados foram preservados.');
   const valor=r===undefined?vazio():r as RegistroDiagnostico;
   atual.current=valor;setRegistro(valor);setCarregando(false);
  }).catch(e=>{if(ativo.current){setErro(e instanceof Error?e.message:'Não foi possível recuperar seu diagnóstico.');setFalhaLeitura(true);setCarregando(false);}});
  return()=>{ativo.current=false;};
 },[perfilId]);
 function gravar(valor:RegistroDiagnostico){
  atual.current=valor;setRegistro(valor);setSalvando(true);erroGravacao.current=false;
  const tarefa=gravacao.current.catch(()=>{}).then(()=>salvarRecursoLocal(perfilId,chaveDiagnostico,valor));
  gravacao.current=tarefa;
  void tarefa.then(()=>{if(ativo.current&&gravacao.current===tarefa){setSalvando(false);setErro('');}}).catch(()=>{
   erroGravacao.current=true;
   if(ativo.current){setSalvando(false);setErro('Não foi possível salvar. Sua resposta continua marcada. Tente salvar novamente antes de sair.');}
  });
  return tarefa;
 }
 function escolher(escolha:number){
  const r=atual.current;
  if(carregando||falhaLeitura||r.enviada||r.respostas[r.indice]!==undefined||ocupado.current)return;
  void gravar({...r,respostas:[...r.respostas,escolha]}).catch(()=>{});
 }
 async function antesDeSair(acao:()=>void){
  if(ocupado.current)return;
  ocupado.current=true;
  try{await gravacao.current;if(ativo.current)acao();}catch{/* A mensagem de erro da gravação mantém a resposta na tela. */}finally{ocupado.current=false;}
 }
 async function proxima(){
  const r=atual.current;
  if(ocupado.current||r.respostas[r.indice]===undefined||r.indice>=4)return;
  ocupado.current=true;
  try{await gravacao.current;if(ativo.current)await gravar({...atual.current,indice:r.indice+1});}catch{/* Não avança sem salvar. */}finally{ocupado.current=false;}
 }
 async function enviar(){
  if(finalizando.current||atual.current.enviada||atual.current.respostas.length!==5)return;
  finalizando.current=true;setAnalisando(true);
  try{
   await gravacao.current;
   if(!ativo.current)return;
   // A correção é determinística e local; nenhuma chamada de IA é simulada.
   const respostas=atual.current.respostas;
   if(!respostas.every((r,i)=>Number.isInteger(r)&&questoesDiagnostico[i].alternativas[r]!==undefined))throw new Error('Há uma resposta inválida.');
   await gravar({...atual.current,enviada:true});
  }catch{if(ativo.current)setErro('Não foi possível concluir e salvar a análise. Suas escolhas continuam preservadas. Tente salvar novamente.');}
  finally{finalizando.current=false;if(ativo.current)setAnalisando(false);}
 }
 const questao=questoesDiagnostico[registro.indice];
 const escolha=registro.respostas[registro.indice];
 const aula=registro.enviada?recomendarAula(registro.respostas):undefined;
 const trilha=aula&&catalogoIncluido.trilhas.find(t=>t.modulos.some(m=>m.aulas.some(a=>a.id===aula.id)));
 const acertos=registro.enviada?registro.respostas.filter((r,i)=>r===questoesDiagnostico[i].correta).length:0;
 return <section className="fixacao avaliacao" aria-labelledby="titulo-diagnostico" aria-busy={carregando||analisando}>
  <div className="cabecalho-pagina"><div><span className="sobretitulo">SEU PONTO DE PARTIDA</span><h1 id="titulo-diagnostico">Um caminho para você.</h1><p>Diagnóstico opcional de cinco questões. A primeira alternativa marcada é definitiva nesta tentativa. A pontuação e as explicações aparecem depois de enviar todas as respostas. Todas as aulas continuam disponíveis.</p></div></div>
  <Jarvis estado={analisando?'pensando':registro.enviada?'apoiando':'concentrado'} mensagem={analisando?'Analisando suas respostas e preparando sua rota de estudos.':registro.enviada?'Confira o motivo de cada resposta. Sua próxima aula começa pelo conceito que merece atenção.':'Leia com calma antes de marcar. Seu primeiro toque registra a resposta; a correção vem no final.'}/>
  {carregando?<p role="status">Recuperando seu diagnóstico…</p>:analisando?<p role="status">Analisando suas respostas…</p>:registro.enviada&&aula?<>
   <div className="painel-secao resultado-avaliacao" role="status"><span className="sobretitulo">ANÁLISE CONCLUÍDA</span><h2>Você acertou {acertos} de 5 questões.</h2><p>Pontuação: <strong>{acertos*20} / 100</strong>. {acertos===5?'Você reconheceu os conceitos iniciais. Experimente aplicar essa base na próxima aula.':'Vamos praticar o primeiro conceito que ainda merece atenção, sem pressa.'}</p><h3>Sugestão: {aula.titulo}</h3><p>Trilha: {trilha?.titulo}. Objetivo: {aula.objetivo}</p><button className="botao primario" onClick={()=>void antesDeSair(()=>aoAbrir(aula))}>Abrir aula sugerida</button></div>
   <div aria-label="Correção do diagnóstico">{questoesDiagnostico.map((q,i)=>{
    const resposta=registro.respostas[i];const correta=resposta===q.correta;
    return <article key={q.aulaId} className={`questao correcao-questao ${correta?'correta':'incorreta'}`}><span className="sobretitulo">QUESTÃO {i+1} · {correta?'ACERTOU':'REVISAR'}</span><h3 style={{whiteSpace:'pre-wrap'}}>{q.enunciado}</h3><p><strong>Sua resposta:</strong> {q.alternativas[resposta]}</p><p>{q.feedback[resposta]}</p>{!correta&&<><p><strong>O que deveria ter marcado:</strong> {q.alternativas[q.correta]}</p><p><strong>Por quê:</strong> {q.feedback[q.correta]}</p></>}</article>;
   })}</div>
  </>:!falhaLeitura?<>
   <p>Questão {registro.indice+1} de 5 · {questao.formato}</p>
   <progress value={registro.respostas.length} max={5} aria-label="Questões respondidas"/>
   <fieldset className="questao"><legend style={{whiteSpace:'pre-wrap'}}>{questao.enunciado}</legend>{questao.alternativas.map((texto,i)=><button type="button" key={texto} className={`alternativa ${escolha===i?'selecionada':''}`} aria-pressed={escolha===i} disabled={escolha!==undefined} onClick={()=>escolher(i)}><span aria-hidden="true">{String.fromCharCode(65+i)}</span>{texto}</button>)}{escolha!==undefined&&<p role="status" className="feedback">Resposta registrada. Ela não pode ser alterada nesta tentativa. {salvando?'Salvando neste dispositivo…':'A correção será mostrada depois do envio final.'}</p>}</fieldset>
   {registro.indice<4?<button className="botao primario" disabled={escolha===undefined||salvando||!!erro} onClick={()=>void proxima()}>Próxima questão</button>:<button className="botao primario" disabled={escolha===undefined||salvando||!!erro} onClick={()=>void enviar()}>Enviar diagnóstico</button>}
  </>:null}
  {erro&&<div className="aviso" role="alert"><p>{erro}</p>{!falhaLeitura&&erroGravacao.current&&<button className="botao secundario" onClick={()=>void gravar(atual.current).catch(()=>{})}>Tentar salvar novamente</button>}</div>}
  <div className="botoes" style={{marginTop:24}}><button className="botao secundario" disabled={analisando} onClick={()=>void antesDeSair(()=>aoAbrir(publicadas.find(a=>a.id==='html-primeira-pagina')||publicadas[0]))}>Começar do zero</button><button className="botao secundario" disabled={analisando} onClick={()=>void antesDeSair(aoPular)}>{registro.enviada?'Explorar outras trilhas':'Pular diagnóstico'}</button></div>
 </section>;
}
