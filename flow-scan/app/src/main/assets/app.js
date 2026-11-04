/* Flow Scan — editor poligonal. Tudo em portugues, sem dependencias externas. */
(function(){
"use strict";
const estado={paginas:[],indice:0,selecionado:0,arraste:null,drive:false,exportando:false,documentos:[],historico:[]};
const $=id=>document.getElementById(id);
const canvas=$("canvasEdicao"),ctx=canvas.getContext("2d",{alpha:false});
let area={x:0,y:0,w:1,h:1},avisoTemporizador=null;
const ligar=(id,evento,fn)=>$(id).addEventListener(evento,fn);
const disponivel=()=>typeof Android!=="undefined";
const notificar=texto=>window.flowScanStatus(String(texto));
const chamar=(metodo,...args)=>{
 try { if(disponivel() && typeof Android[metodo]==="function") return Android[metodo](...args);
    notificar("A função "+metodo+" não está disponível. Reabra o aplicativo atualizado.");
 } catch(erro) {notificar("Não foi possível executar "+metodo+": "+erro.message);}
};
function paginaAtual(){return estado.paginas[estado.indice];}
function abrirTela(tela){
  document.querySelectorAll(".tela").forEach(el=>el.classList.toggle("aberta",el.id===tela));
  $("abas").classList.toggle("escondidas",tela==="editor");
  document.querySelectorAll(".aba").forEach(b=>b.classList.toggle("ativa",b.dataset.tela===tela));
  window.scrollTo({top:0,behavior:"smooth"});
  if(tela==="editor"){miniaturas();requestAnimationFrame(redesenhar);}
  else if(tela==="arquivos") {renderizarDocumentos();chamar("listarDocumentos");}
  else if(tela==="historico"){renderizarHistorico();chamar("listarHistorico");}
  else {renderizarRecentes();chamar("listarDocumentos");}
}
function receberImagem(codigo,nome){
 const img=new Image();
 img.onload=()=>{
   if(estado.paginas.length>=30){notificar("Limite de 30 páginas por documento.");return;}
   estado.paginas.push({img,nome,vertices:[{x:.06,y:.06},{x:.94,y:.06},{x:.94,y:.94},{x:.06,y:.94}],filtro:"natural"});
   estado.indice=estado.paginas.length-1;estado.selecionado=0;
   chamar("registrarEvento","importacao",titulo,"Página adicionada ao editor");
   abrirTela("editor");miniaturas();
   $("contadorPaginas").textContent=estado.paginas.length+" "+(estado.paginas.length===1?"página":"páginas");
   notificar("Página adicionada. Ajuste o contorno arrastando os pontos ou as bordas.");
 };
 img.onerror=()=>notificar("Falha ao abrir a imagem selecionada.");
 img.src=codigo;
}
function miniaturas(){
 const raiz=$("miniaturas");raiz.textContent="";
 estado.paginas.forEach((p,i)=>{
   const b=document.createElement("button");b.className="miniatura"+(i===estado.indice?" ativa":"");b.type="button";
   b.setAttribute("aria-label","Abrir página "+(i+1));
   const img=document.createElement("img");img.src=p.img.src;img.alt="Página "+(i+1);b.appendChild(img);
   const small=document.createElement("small");small.textContent=String(i+1);b.appendChild(small);
   b.onclick=()=>{estado.indice=i;estado.selecionado=0;miniaturas();redesenhar();};
   raiz.appendChild(b);
 });
 $("contadorPaginas").textContent=estado.paginas.length+" "+(estado.paginas.length===1?"página":"páginas");
}
function tamanhoCanvas(){
 const box=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);
 if(!box.width||!box.height)return false;
 canvas.width=Math.round(box.width*dpr);
 canvas.height=Math.round(box.height*dpr);
 ctx.setTransform(dpr,0,0,dpr,0,0);
 return true;
}
function redesenhar(){
 const p=paginaAtual();if(!p)return;
 if(!tamanhoCanvas())return;
 const w=canvas.clientWidth,h=canvas.clientHeight;
 ctx.fillStyle="#dcd1cb";ctx.fillRect(0,0,w,h);
 const margem=18;
 const escala=Math.min((w-margem*2)/p.img.width,(h-margem*2)/p.img.height);
 area.w=p.img.width*escala;area.h=p.img.height*escala;area.x=(w-area.w)/2;area.y=(h-area.h)/2;
 ctx.save();ctx.shadowColor="#5743433a";ctx.shadowBlur=18;
 ctx.fillStyle="#fff";ctx.fillRect(area.x,area.y,area.w,area.h);ctx.restore();
 ctx.drawImage(p.img,area.x,area.y,area.w,area.h);
 if(!p.vertices)return;
 const v=p.vertices;const pos=q=>({x:area.x+q.x*area.w,y:area.y+q.y*area.h});
 ctx.beginPath();
 v.forEach((q,i)=>{const t=pos(q);if(i===0)ctx.moveTo(t.x,t.y);else ctx.lineTo(t.x,t.y);});
 ctx.closePath();
 ctx.fillStyle="rgba(185,71,94,.10)";ctx.fill();
 ctx.lineWidth=2.8;ctx.strokeStyle="#fff";ctx.stroke();
 ctx.lineWidth=1.7;ctx.strokeStyle="#b9475e";ctx.stroke();
 // Controle independente de cada aresta: basta arrastá-la.
 v.forEach((q,i)=>{
   const proximo=pos(v[(i+1)%v.length]),a=pos(q),mid={x:(a.x+proximo.x)/2,y:(a.y+proximo.y)/2};
   ctx.beginPath();ctx.fillStyle="#fff";ctx.strokeStyle="#b9475e";ctx.lineWidth=1.5;ctx.arc(mid.x,mid.y,5.5,0,Math.PI*2);ctx.fill();ctx.stroke();
 });
 v.forEach((q,i)=>{
   const t=pos(q);ctx.beginPath();ctx.arc(t.x,t.y,i===estado.selecionado?10:8,0,Math.PI*2);
   ctx.fillStyle=i===estado.selecionado?"#f7c473":"#fffdfa";ctx.fill();
   ctx.strokeStyle="#a73f55";ctx.lineWidth=2.5;ctx.stroke();
 });
}
function pontoTela(e){const r=canvas.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top};}
function telaNormal(q){return{x:Math.max(0,Math.min(1,(q.x-area.x)/area.w)),y:Math.max(0,Math.min(1,(q.y-area.y)/area.h))};}
function distancia(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
function distanciaLinha(p,a,b){
 const vx=b.x-a.x,vy=b.y-a.y;
 const t=Math.max(0,Math.min(1,((p.x-a.x)*vx+(p.y-a.y)*vy)/(vx*vx+vy*vy||1)));
 return distancia(p,{x:a.x+t*vx,y:a.y+t*vy});
}
canvas.addEventListener("pointerdown",e=>{
 const p=paginaAtual();if(!p)return;
 const toque=pontoTela(e),v=p.vertices;
 let indice=-1,proximidade=10000;
 v.forEach((q,i)=>{const d=distancia(toque,{x:area.x+q.x*area.w,y:area.y+q.y*area.h});if(d<proximidade){proximidade=d;indice=i;}});
 if(proximidade<=26){estado.arraste={modo:"ponto",indice,inicio:toque,originais:v.map(q=>({...q}))};estado.selecionado=indice;}
 else{
   let menor=10000,lado=-1;
   v.forEach((q,i)=>{const s=v[(i+1)%v.length];
     const d=distanciaLinha(toque,{x:area.x+q.x*area.w,y:area.y+q.y*area.h},{x:area.x+s.x*area.w,y:area.y+s.y*area.h});
     if(d<menor){menor=d;lado=i;}
   });
   if(menor<25){estado.arraste={modo:"lado",indice:lado,inicio:toque,originais:v.map(q=>({...q}))};estado.selecionado=lado;}
 }
 if(estado.arraste){e.preventDefault();canvas.setPointerCapture(e.pointerId);redesenhar();}
});
canvas.addEventListener("pointermove",e=>{
 const a=estado.arraste,p=paginaAtual();if(!a||!p)return;e.preventDefault();
 const pos=pontoTela(e),dx=(pos.x-a.inicio.x)/area.w,dy=(pos.y-a.inicio.y)/area.h;
 const mover=i=>{const antes=a.originais[i];p.vertices[i]={x:Math.max(0,Math.min(1,antes.x+dx)),y:Math.max(0,Math.min(1,antes.y+dy))};};
 mover(a.indice);
 if(a.modo==="lado")mover((a.indice+1)%p.vertices.length);
 redesenhar();
});
["pointerup","pointercancel","lostpointercapture"].forEach(evento=>canvas.addEventListener(evento,()=>{estado.arraste=null;}));
function adicionarVertice(){
 const p=paginaAtual();if(!p)return;
 const v=p.vertices;if(v.length>=14){notificar("Limite de 14 pontos por página.");return;}
 let indice=0,maior=-1;
 v.forEach((q,i)=>{const proximo=v[(i+1)%v.length],d=distancia(q,proximo);if(d>maior){maior=d;indice=i;}});
 const a=v[indice],b=v[(indice+1)%v.length];
 v.splice(indice+1,0,{x:(a.x+b.x)/2,y:(a.y+b.y)/2});
 estado.selecionado=indice+1;redesenhar();notificar("Novo vértice criado. Arraste até o limite desejado.");
}
function removerVertice(){
 const p=paginaAtual();if(!p)return;
 if(p.vertices.length<=3){notificar("O recorte precisa de pelo menos 3 vértices.");return;}
 p.vertices.splice(Math.min(estado.selecionado,p.vertices.length-1),1);
 estado.selecionado=0;redesenhar();
}
function redefinir(){
 const p=paginaAtual();if(!p)return;
 p.vertices=[{x:.06,y:.06},{x:.94,y:.06},{x:.94,y:.94},{x:.06,y:.94}];
 estado.selecionado=0;redesenhar();
}
function girar(){
 const p=paginaAtual();if(!p)return;
 const c=document.createElement("canvas");c.width=p.img.height;c.height=p.img.width;
 const g=c.getContext("2d");g.translate(c.width,0);g.rotate(Math.PI/2);g.drawImage(p.img,0,0);
 const img=new Image();img.onload=()=>{p.img=img;p.vertices=p.vertices.map(v=>({x:1-v.y,y:v.x}));miniaturas();redesenhar();};img.src=c.toDataURL("image/jpeg",.91);
}
function filtroCss(tipo){
 return tipo==="nitido"?"contrast(1.22) brightness(1.09) saturate(1.16)":
 tipo==="cinza"?"grayscale(1) contrast(1.1)":
 tipo==="pb"?"grayscale(1) contrast(2.25) brightness(1.13)":"none";
}
function gerarImagemRecortada(p,formato){
 const pontos=p.vertices;
 const esquerda=Math.min(...pontos.map(v=>v.x)),direita=Math.max(...pontos.map(v=>v.x)),
       superior=Math.min(...pontos.map(v=>v.y)),inferior=Math.max(...pontos.map(v=>v.y));
 const largura=Math.max(1,Math.round((direita-esquerda)*p.img.width));
 const altura=Math.max(1,Math.round((inferior-superior)*p.img.height));
 const maximo=1900,escala=Math.min(1,maximo/Math.max(largura,altura));
 const c=document.createElement("canvas");c.width=Math.max(1,Math.round(largura*escala));c.height=Math.max(1,Math.round(altura*escala));
 const g=c.getContext("2d",{alpha:true});
 if(formato!=="png"){g.fillStyle="#fff";g.fillRect(0,0,c.width,c.height);}
 const escalaX=c.width/(direita-esquerda),escalaY=c.height/(inferior-superior);
 g.save();g.beginPath();
 pontos.forEach((v,i)=>{const x=(v.x-esquerda)*escalaX,y=(v.y-superior)*escalaY;if(i===0)g.moveTo(x,y);else g.lineTo(x,y);});
 g.closePath();g.clip();g.filter=filtroCss(p.filtro);
 g.drawImage(p.img,-esquerda*escalaX,-superior*escalaY,escalaX,escalaY);
 g.restore();
 return c.toDataURL(formato==="png"?"image/png":"image/jpeg",.94);
}
function exportar(){
 if(estado.exportando||!estado.paginas.length)return;
 if(!disponivel()){notificar("Para salvar arquivos, abra a versão Android.");return;}
 estado.exportando=true;$("salvar").disabled=true;$("salvar").querySelector("span").textContent="Preparando páginas...";
 setTimeout(()=>{
 try{
  const formato=document.querySelector("input[name=formato]:checked").value;
  const nome=$("nomeArquivo").value.trim()||"Meu documento";
  Android.exportarInicio(formato,nome);
  estado.paginas.forEach(p=>Android.exportarPagina(gerarImagemRecortada(p,formato==="png"?"png":"jpg")));
  Android.exportarFim();
  notificar("Documento preparado. Aguarde a confirmação do Android.");
 }catch(e){notificar("Não foi possível exportar: "+e.message);}
 finally{estado.exportando=false;$("salvar").disabled=false;$("salvar").querySelector("span").textContent="Salvar documento";}
 },60);
}
window.flowScanStatus=mensagem=>{
 const el=$("aviso");el.textContent=mensagem;el.classList.add("visivel");
 if(avisoTemporizador)clearTimeout(avisoTemporizador);
 avisoTemporizador=setTimeout(()=>el.classList.remove("visivel"),4300);
};
window.flowScanDrive=ativo=>{
 estado.drive=!!ativo;$("botaoDrive").classList.toggle("ativo",!!ativo);
 $("driveTexto").textContent=ativo?"Drive conectado":"Conectar Drive";
};
window.flowScanDestino=nome=>{estado.drive=true;$("botaoDrive").classList.add("ativo");$("driveTexto").textContent=nome||"Backup em pasta";};
window.flowScanReceberImagem=receberImagem;

/* Biblioteca local e linha do tempo — conteúdo sempre escapado via textContent */
function formatarData(valor) {
 try {return new Date(Number(valor)||valor).toLocaleDateString("pt-BR",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"});}
 catch(e){return "";}
}
function elemento(tag,classe,texto){
 const e=document.createElement(tag);if(classe)e.className=classe;
 if(texto!==undefined)e.textContent=String(texto);return e;
}
function criarDocumento(arquivo){
 const card=elemento("article","documento");
 const emblema=elemento("div","doc-emblema",String(arquivo.formato||"pdf").toUpperCase());card.appendChild(emblema);
 const corpo=elemento("div","doc-corpo");
 corpo.appendChild(elemento("div","doc-nome",arquivo.nome||"Documento"));
 corpo.appendChild(elemento("div","doc-info",formatarData(arquivo.data)+" · "+(arquivo.paginas||1)+" pág."));
 const botoes=elemento("div","doc-comandos");
 [["Abrir","abrirDocumento"],["Compartilhar","compartilharDocumento"],["Excluir","excluirDocumento"]].forEach(([titulo,acao])=>{
  const botao=elemento("button",acao==="excluirDocumento"?"perigo":"",titulo);
  botao.type="button";
  botao.addEventListener("click",()=>{if(acao==="excluirDocumento"){
   if(!confirm("Excluir este documento salvo no aparelho?"))return;
  }chamar(acao,String(arquivo.id));});
  botoes.appendChild(botao);
 });
 corpo.appendChild(botoes);card.appendChild(corpo);return card;
}
function renderizarDocumentos(){
 const lista=$("listaArquivos");lista.replaceChildren();
 const busca=$("buscaArquivos").value.trim().toLocaleLowerCase("pt-BR");
 const itens=estado.documentos.filter(a=>String(a.nome).toLocaleLowerCase("pt-BR").includes(busca));
 $("totalArquivos").textContent=String(estado.documentos.length);
 if(!itens.length)lista.appendChild(elemento("div","estado-vazio",busca?"Nenhum documento corresponde à sua busca.":"Você ainda não salvou documentos. Digitalize ou importe para começar."));
 else itens.forEach(a=>lista.appendChild(criarDocumento(a)));
}
function renderizarRecentes(){
 const lista=$("recentes");lista.replaceChildren();
 if(!estado.documentos.length)lista.appendChild(elemento("div","estado-vazio mini","Ainda não há arquivos. Sua primeira digitalização aparecerá aqui."));
 else estado.documentos.slice(0,2).forEach(a=>lista.appendChild(criarDocumento(a)));
}
function renderizarHistorico(){
 const lista=$("listaHistorico");lista.replaceChildren();
 if(!estado.historico.length){
   lista.appendChild(elemento("div","estado-vazio","Seu histórico estará disponível depois da primeira digitalização."));
   return;
 }
 estado.historico.slice(0,120).forEach(item=>{
  const evento=elemento("article","evento");evento.appendChild(elemento("span","evento-ponto",item.tipo==="exportacao"?"✓":item.tipo==="importacao"?"↗":"•"));
  const corpo=elemento("div","evento-corpo");
  corpo.appendChild(elemento("strong","",item.titulo||"Atividade"));
  corpo.appendChild(elemento("span","evento-data",formatarData(item.data)));
  if(item.detalhes)corpo.appendChild(elemento("p","",item.detalhes));
  evento.appendChild(corpo);lista.appendChild(evento);
 });
}
window.flowScanArquivos=dados=>{try{estado.documentos=typeof dados==="string"?JSON.parse(dados):dados||[];renderizarDocumentos();renderizarRecentes();}catch(e){notificar("Falha ao ler os arquivos.");}};
window.flowScanHistorico=dados=>{try{estado.historico=typeof dados==="string"?JSON.parse(dados):dados||[];renderizarHistorico();}catch(e){notificar("Falha ao ler o histórico.");}};
window.flowScanArquivoSalvo=()=>{chamar("listarDocumentos");chamar("listarHistorico");};
document.querySelectorAll(".aba").forEach(b=>b.addEventListener("click",()=>abrirTela(b.dataset.tela)));
ligar("abrirTodos","click",()=>abrirTela("arquivos"));
ligar("buscaArquivos","input",renderizarDocumentos);

window.flowScanVoltar=()=>{if($("editor").classList.contains("aberta"))abrirTela("inicio");else if(!$("inicio").classList.contains("aberta"))abrirTela("inicio");else notificar("Flow Scan está pronto.");};
ligar("acaoCamera","click",()=>chamar("camera"));
ligar("acaoImportar","click",()=>chamar("importar"));
ligar("adicionar","click",()=>chamar("importar"));
ligar("botaoDrive","click",()=>chamar("conectarDrive"));
ligar("voltar","click",()=>abrirTela("inicio"));
ligar("addVertice","click",adicionarVertice);
ligar("tirarVertice","click",removerVertice);
ligar("resetar","click",redefinir);
ligar("girar","click",girar);
ligar("salvar","click",exportar);
document.querySelectorAll("[data-filtro]").forEach(b=>b.addEventListener("click",()=>{
 const p=paginaAtual();if(!p)return;p.filtro=b.dataset.filtro;
 document.querySelectorAll("[data-filtro]").forEach(x=>x.classList.toggle("ativo",x===b));
 $("valorFiltro").textContent=b.textContent;notificar("Filtro aplicado à página atual.");
}));
window.addEventListener("resize",()=>{if($("editor").classList.contains("aberta"))redesenhar();});
window.flowScanReady=true;
chamar("listarDocumentos");
chamar("listarHistorico");
})();
