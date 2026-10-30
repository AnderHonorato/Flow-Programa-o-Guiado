import {useEffect,useRef} from 'react';
import {ErroApi,requisitar} from '../componentes/api';
import {listarRecursosLocais,removerRecursoLocal,salvarRecursoLocal} from '../offline/armazenamento';

interface Leitura {id:string;aulaId:string;segundos:number}
const prefixo='leitura-pendente:1:';
const envios=new Map<string,Promise<void>>();
export async function guardarLeitura(perfilId:string,aulaId:string,id=crypto.randomUUID()) {
 const leitura:Leitura={id,aulaId,segundos:20};
 await salvarRecursoLocal(perfilId,prefixo+id,leitura);
 window.dispatchEvent(new CustomEvent('flow:leitura-registrada',{detail:{perfilId}}));
}
/** Cada visita conta após 20 segundos visíveis. Não concede XP nem certifica leitura. */
export function useRegistroLeitura(perfilId:string,aulaId:string,ativa:boolean) {
 const visita=useRef({perfilId,aulaId,id:crypto.randomUUID(),segundos:0,registrada:false});
 if(visita.current.perfilId!==perfilId||visita.current.aulaId!==aulaId)visita.current={perfilId,aulaId,id:crypto.randomUUID(),segundos:0,registrada:false};
 useEffect(()=>{
  if(!ativa)return;
  const atual=visita.current;let anterior=Date.now(),ocupado=false;
  const timer=window.setInterval(()=>{
   const agora=Date.now(),delta=Math.min(2,Math.max(0,(agora-anterior)/1000));anterior=agora;
   if(document.hidden||atual.registrada||ocupado)return;
   atual.segundos+=delta;if(atual.segundos<20)return;
   ocupado=true;
   void guardarLeitura(perfilId,aulaId,atual.id).then(()=>{atual.registrada=true;}).catch(()=>{/* Repetir a mesma visita em caso de falha local. */}).finally(()=>{ocupado=false;});
  },1000);
  const visibilidade=()=>{anterior=Date.now();};document.addEventListener('visibilitychange',visibilidade);
  return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',visibilidade);};
 },[perfilId,aulaId,ativa]);
}
export function enviarLeituras(perfilId:string,token:string,vigente:()=>boolean=()=>true):Promise<void> {
 const chave=perfilId+':'+token;const existente=envios.get(chave);if(existente)return existente;
 const tarefa=(async()=>{
  for(const recurso of await listarRecursosLocais(perfilId)){
   if(!vigente())return;if(!recurso.chave.startsWith(prefixo))continue;
   const leitura=recurso.conteudo as Partial<Leitura>|null;
   if(!leitura||typeof leitura.id!=='string'||!/^[-\w]{1,100}$/.test(leitura.id)||typeof leitura.aulaId!=='string'||leitura.aulaId.length>100||leitura.segundos!==20){await removerRecursoLocal(perfilId,recurso.chave);continue;}
   try{await requisitar('/leituras',token,{method:'POST',body:JSON.stringify(leitura)});await removerRecursoLocal(perfilId,recurso.chave);}
   catch(erro){if(erro instanceof ErroApi&&[404,422].includes(erro.status)){await removerRecursoLocal(perfilId,recurso.chave);continue;}throw erro;}
  }
 })().finally(()=>{if(envios.get(chave)===tarefa)envios.delete(chave);});
 envios.set(chave,tarefa);return tarefa;
}
export function useFilaLeituras(perfilId:string,token:string|undefined,online:boolean) {
 const credencial=useRef({perfilId,token,online});credencial.current={perfilId,token,online};
 useEffect(()=>{
  if(!token||!online)return;
  let ativo=true;
  const vigente=()=>ativo&&credencial.current.perfilId===perfilId&&credencial.current.token===token&&credencial.current.online;
  const enviar=()=>{if(vigente())void enviarLeituras(perfilId,token,vigente).catch(()=>{/* A fila permanece para a próxima conexão. */});};
  const evento=(e:Event)=>{if((e as CustomEvent<{perfilId:string}>).detail?.perfilId===perfilId)enviar();};
  enviar();const tempo=window.setInterval(enviar,60000);window.addEventListener('flow:leitura-registrada',evento);
  return()=>{ativo=false;clearInterval(tempo);window.removeEventListener('flow:leitura-registrada',evento);};
 },[perfilId,token,online]);
}
