import {useEffect,useState} from 'react';
import type {Flow} from '../componentes/useFlow';
import {ErroApi,requisitar} from '../componentes/api';
import {lerRecursoLocal,salvarRecursoLocal} from '../offline/armazenamento';

export interface CertificadoInterno {
 codigo:string; titular:string; aulaId:string; titulo:string; objetivo:string; emitidoEm:string;
 tentativaId:string; tipo:'reconhecimento_interno_aula'; emissor:string; escopo:string;
}
interface CopiaCertificados {recebidaEm:string; certificados:CertificadoInterno[]}
const chave='certificados-internos:1';
function validarCertificados(dados:unknown):dados is CertificadoInterno[]{
 return Array.isArray(dados)&&dados.every(c=>c&&c.tipo==='reconhecimento_interno_aula'&&['codigo','titular','aulaId','titulo','objetivo','emitidoEm','tentativaId','emissor','escopo'].every(k=>typeof c[k]==='string')&&Number.isFinite(Date.parse(c.emitidoEm)));
}
function escaparHtml(texto:string){return texto.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));}
const data=(valor:string)=>new Date(valor).toLocaleDateString('pt-BR',{timeZone:'UTC'});
export function gerarHtmlCertificado(c:CertificadoInterno):string {
 const e=escaparHtml;
 return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(c.titulo)} — Flow</title><style>body{font:18px/1.7 system-ui,sans-serif;color:#1a1a1a;margin:0;padding:48px;background:#fffaf5}main{max-width:800px;margin:auto;border:2px solid #8f2d4a;padding:40px}h1{line-height:1.2}small{display:block}code{overflow-wrap:anywhere}@media print{body{padding:0;background:white}main{border:2px solid #333}}</style></head><body><main><p>${e(c.emissor)}</p><h1>Reconhecimento interno de conclusão de aula</h1><h2>${e(c.titular)}</h2><p>Concluiu a aula/oficina <strong>${e(c.titulo)}</strong>, com atividade aprovada pela administração.</p><p>Objetivo: ${e(c.objetivo)}</p><p>Data da aprovação: ${e(data(c.emitidoEm))}</p><p>Código do registro: <code>${e(c.codigo)}</code></p><small>${e(c.escopo)}</small><small>Este documento registra uma aula/oficina. Não atesta a conclusão da trilha inteira. Cópia consultada no aplicativo; o código identifica o registro interno e não constitui assinatura digital.</small></main></body></html>`;
}
function exportar(c:CertificadoInterno){
 const url=URL.createObjectURL(new Blob([gerarHtmlCertificado(c)],{type:'text/html;charset=utf-8'}));
 const link=document.createElement('a');link.href=url;link.download=`flow-certificado-${c.codigo.replace(/[^a-zA-Z0-9-]/g,'')}.html`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function imprimir(c:CertificadoInterno):boolean {
 const janela=window.open('','_blank');if(!janela)return false;
 janela.opener=null;janela.document.open();janela.document.write(gerarHtmlCertificado(c));janela.document.close();janela.focus();janela.print();return true;
}
export default function Certificados({flow}:{flow:Flow}){
 const [copia,setCopia]=useState<(CopiaCertificados&{perfilId:string})|null>(null);
 const [consultando,setConsultando]=useState(false);
 const [mensagem,setMensagem]=useState('');
 const [atualizacao,setAtualizacao]=useState(0);
 useEffect(()=>{
  let ativo=true;const controle=new AbortController();setCopia(null);setMensagem('');setConsultando(false);
  if(!flow.sessao)return ()=>controle.abort();
  const perfilId=flow.perfilId,token=flow.sessao.token;
  void (async()=>{
   try{const local=await lerRecursoLocal<CopiaCertificados>(perfilId,chave);if(ativo&&local&&validarCertificados(local.certificados))setCopia({...local,perfilId});}catch{if(ativo)setMensagem('O dispositivo não conseguiu ler a cópia salva.');}
   if(!ativo)return;
   if(!flow.online){setMensagem('Sem internet. A cópia recebida anteriormente continua disponível; a validade atual exige nova consulta ao servidor.');return;}
   if(flow.sessaoExpirada){setMensagem('Entre novamente para consultar as aprovações atuais. A cópia salva pode estar desatualizada.');return;}
   setConsultando(true);
   try{
    const certificados=await requisitar<unknown>('/certificados',token,{signal:controle.signal});
    if(!validarCertificados(certificados))throw new Error('O servidor retornou certificados em formato inválido.');
    if(!ativo)return;
    const recebida={certificados,recebidaEm:new Date().toISOString()};setCopia({...recebida,perfilId});
    setMensagem('Registros consultados no servidor.');
    try{await salvarRecursoLocal(perfilId,chave,recebida);}catch{if(ativo)setMensagem('Registros consultados; o dispositivo não conseguiu guardar uma cópia offline.');}
   }catch(erro){if(ativo)setMensagem(erro instanceof ErroApi&&erro.status===401?'Sessão expirada. Entre novamente para atualizar os registros. A cópia salva pode estar desatualizada.':'Não foi possível consultar o servidor. A última cópia recebida permanece disponível e pode estar desatualizada.');}
   finally{if(ativo)setConsultando(false);}
  })();
  return()=>{ativo=false;controle.abort();};
 },[flow.perfilId,flow.sessao?.token,flow.online,flow.sessaoExpirada,atualizacao]);
 const atual=copia?.perfilId===flow.perfilId?copia:null;
 return <section className="painel-secao" aria-labelledby="titulo-certificados"><h2 id="titulo-certificados">Certificados internos</h2><p>Reconhecimentos de aulas/oficinas com atividade aprovada pela administração no servidor. XP, diagnóstico e progresso local não emitem certificados. Eles não equivalem a diploma ou certificação profissional.</p>
  {!flow.sessao?<p>Entre em uma conta para consultar seus certificados. Você pode continuar aprendendo no perfil local.</p>:<>
   <p role="status">{consultando?'Consultando aprovações…':mensagem}</p>
   <button className="botao secundario" disabled={consultando||!flow.online||flow.sessaoExpirada} onClick={()=>setAtualizacao(a=>a+1)}>Atualizar certificados</button>
   {atual&&<p className="texto-auxiliar">Cópia recebida em {new Date(atual.recebidaEm).toLocaleString('pt-BR')}. Mudanças de aprovação aparecem na próxima consulta.</p>}
   {atual?.certificados.length===0&&<p>Ainda não há aulas com aprovação administrativa registrada. Atividades pendentes e em revisão não geram certificado.</p>}
   {atual?.certificados.map(c=><article className="certificado" key={c.codigo}><span className="sobretitulo">RECONHECIMENTO INTERNO · AULA/OFICINA</span><h3>{c.titulo}</h3><p>Titular: <strong>{c.titular}</strong></p><p>Objetivo: {c.objetivo}</p><small>Aprovação: {data(c.emitidoEm)}</small><small style={{overflowWrap:'anywhere'}}>Código: {c.codigo}</small><p>{c.escopo}</p><p className="texto-auxiliar">Este reconhecimento abrange esta aula, sem atestar a conclusão de uma trilha.</p><div className="botoes"><button className="botao secundario" onClick={()=>exportar(c)}>Exportar HTML</button><button className="botao secundario" onClick={()=>{if(!imprimir(c))flow.setAviso('Permita a abertura da janela de impressão ou exporte o HTML para imprimir no navegador.');}}>Imprimir</button></div></article>)}
  </>}
 </section>;
}
