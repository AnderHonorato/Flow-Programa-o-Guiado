// Smoke de interface sem dependências. Valida inicialização, navegação e chamadas dos botões.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const origem=new URL('../app/src/main/assets/app.js',import.meta.url);
const codigo=fs.readFileSync(origem,'utf8');
const chamados=[];
class ListaClasses {
 constructor(){this.set=new Set();}
 add(x){this.set.add(x);}
 remove(x){this.set.delete(x);}
 contains(x){return this.set.has(x);}
 toggle(x,forcar){if(forcar===undefined)forcar=!this.contains(x);forcar?this.add(x):this.remove(x);return forcar;}
}
class Elemento {
 constructor(tag='div'){
  this.tagName=tag.toUpperCase();this.listeners={};this.dataset={};this.classList=new ListaClasses();this.children=[];
  this.style={};this.value='';this.textContent='';this.clientWidth=360;this.clientHeight=320;this.width=360;this.height=320;
 }
 addEventListener(nome,cb){(this.listeners[nome]??=[]).push(cb);}
 click(){(this.listeners.click??[]).forEach(cb=>cb({preventDefault(){}}));if(this.onclick)this.onclick();}
 appendChild(child){this.children.push(child);return child;}
 replaceChildren(...els){this.children=[...els];}
 querySelector(sel){return new Elemento(sel);}
 getBoundingClientRect(){return {left:0,top:0,width:this.clientWidth,height:this.clientHeight};}
 setAttribute(){}
 getContext(){return contextoCanvas;}
}
const contextoCanvas=new Proxy({}, {get:(t,p)=>{if(p==='canvas')return null;return t[p]??(()=>{});},set:(t,p,v)=>{t[p]=v;return true;}});
const ids={};const get=id=>ids[id]??=new Elemento();
const abas=['inicio','arquivos','historico'].map(t=>{const a=new Elemento('button');a.dataset.tela=t;return a;});
const telas=['inicio','arquivos','historico','editor'].map(t=>{const e=get(t);e.id=t;return e;});
const filtros=['natural','nitido','cinza','pb'].map(v=>{const e=new Elemento('button');e.dataset.filtro=v;e.textContent=v;return e;});
const documento={
 getElementById:get,
 querySelectorAll(q){return q==='.tela'?telas:q==='.aba'?abas:q==='[data-filtro]'?filtros:[];},
 querySelector(q){if(q==='input[name=formato]:checked')return {value:'pdf'};return new Elemento();},
 createElement(tag){return new Elemento(tag);}
};
class Imagem {
 constructor(){this.width=1200;this.height=1600;this.onload=null;this.onerror=null;}
 set src(x){this._src=x;if(this.onload)this.onload();}
 get src(){return this._src;}
}
const android=new Proxy({},{get:(_,metodo)=>(...args)=>{chamados.push({metodo,args});}});
const janela={flowScanReady:false,scrollTo(){},addEventListener(){},Android:android};
const sandbox={document:documento, window:janela,Android:android,Image:Imagem,devicePixelRatio:1,console,confirm:()=>true,
 setTimeout:(fn)=>{fn();return 1;},clearTimeout:()=>{},requestAnimationFrame:(fn)=>fn(),Date,JSON,Math,String,Array,Number,Blob};
vm.runInNewContext(codigo,sandbox,{filename:'app.js',timeout:10000});
assert.equal(janela.flowScanReady,true,'Interface não foi inicializada');
assert(chamados.some(x=>x.metodo==='listarDocumentos'),'Não carregou arquivos');
assert(chamados.some(x=>x.metodo==='listarHistorico'),'Não carregou histórico');
get('acaoCamera').click();
get('acaoImportar').click();
get('botaoDrive').click();
assert(chamados.some(x=>x.metodo==='camera'),'Câmera não conectada');
assert(chamados.some(x=>x.metodo==='importar'),'Importador não conectado');
assert(chamados.some(x=>x.metodo==='conectarDrive'),'Drive não conectado');
abas[1].click();assert(telas[1].classList.contains('aberta'),'Navegação Arquivos não abriu');
abas[2].click();assert(telas[2].classList.contains('aberta'),'Navegação Histórico não abriu');
janela.flowScanArquivos([{id:'001',nome:'Teste.pdf',formato:'pdf',paginas:1,data:Date.now()}]);
assert(get('listaArquivos').children.length===1,'Biblioteca não renderizou documento');
janela.flowScanHistorico([{tipo:'exportacao',titulo:'Arquivo gerado',data:Date.now()}]);
assert(get('listaHistorico').children.length===1,'Histórico não renderizou evento');
janela.flowScanReceberImagem('data:image/jpeg;base64,YWJj','Importação de teste');
assert(telas[3].classList.contains('aberta'),'Editor não abriu após importação');
assert(chamados.some(x=>x.metodo==='registrarEvento'),'Importação não entrou no histórico');
console.log('OK: inicialização, câmera, importação, Drive, abas, arquivos, histórico e editor.');
