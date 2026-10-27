import {useState} from 'react';
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
export default function Diagnostico({aoAbrir,aoPular}:{aoAbrir:(aula:Aula)=>void;aoPular:()=>void}){
 const [respostas,setRespostas]=useState<number[]>([]);
 const [escolha,setEscolha]=useState<number|null>(null);
 const [confirmada,setConfirmada]=useState(false);
 const concluido=respostas.length===questoesDiagnostico.length;
 const questao=questoesDiagnostico[respostas.length];
 const aula=concluido?recomendarAula(respostas):undefined;
 const trilha=aula&&catalogoIncluido.trilhas.find(t=>t.modulos.some(m=>m.aulas.some(a=>a.id===aula.id)));
 return <section className="fixacao" aria-labelledby="titulo-diagnostico">
  <div className="cabecalho-pagina"><div><span className="sobretitulo">SEU PONTO DE PARTIDA</span><h1 id="titulo-diagnostico">Um caminho para você.</h1><p>Diagnóstico opcional de cinco questões. Ele sugere onde começar; todas as aulas continuam disponíveis. Você pode começar do zero ou pular quando quiser.</p></div></div>
  {concluido&&aula?<div className="painel-secao" role="status"><h2>Sugestão: {aula.titulo}</h2><p>Você acertou {respostas.filter((r,i)=>r===questoesDiagnostico[i].correta).length} de 5 questões. {respostas.every((r,i)=>r===questoesDiagnostico[i].correta)?'Você reconheceu os conceitos iniciais. Experimente aplicar essa base na próxima aula.':'Vamos praticar o primeiro conceito que ainda merece atenção, sem pressa.'}</p><p>Trilha: {trilha?.titulo}. Objetivo: {aula.objetivo}</p><div className="botoes"><button className="botao primario" onClick={()=>aoAbrir(aula)}>Abrir aula sugerida</button><button className="botao secundario" onClick={()=>{setRespostas([]);setEscolha(null);setConfirmada(false);}}>Refazer diagnóstico</button></div></div>:<>
   <p>Questão {respostas.length+1} de 5 · {questao.formato}</p>
   <fieldset className="questao"><legend style={{whiteSpace:'pre-wrap'}}>{questao.enunciado}</legend>{questao.alternativas.map((texto,i)=><button key={texto} className={`alternativa ${escolha===i&&confirmada?(i===questao.correta?'correta':'incorreta'):''}`} aria-pressed={escolha===i} disabled={confirmada} onClick={()=>setEscolha(i)}>{texto}</button>)}{confirmada&&escolha!==null&&<p role="status" className="feedback">{questao.feedback[escolha]}</p>}</fieldset>
   {!confirmada?<button className="botao primario" disabled={escolha===null} onClick={()=>setConfirmada(true)}>Conferir resposta</button>:<button className="botao primario" onClick={()=>{setRespostas(r=>[...r,escolha!]);setEscolha(null);setConfirmada(false);}}>{respostas.length===4?'Ver sugestão':'Próxima questão'}</button>}
  </>}
  <div className="botoes" style={{marginTop:24}}><button className="botao secundario" onClick={()=>aoAbrir(publicadas.find(a=>a.id==='html-primeira-pagina')||publicadas[0])}>Começar do zero</button><button className="botao secundario" onClick={aoPular}>{concluido?'Explorar outras trilhas':'Pular diagnóstico'}</button></div>
 </section>;
}
