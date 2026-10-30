import { useEffect, useRef, useState } from 'react';
import { ErroApi, requisitar, type DetalheAcesso, type Sessao, type Usuario } from '../componentes/api';

interface Props { sessao:Sessao|null; online:boolean; aoInvalidar:(detalhe:DetalheAcesso)=>void; aoExpirar:()=>void; aoAtualizar:(usuario:Usuario)=>void }
/** O servidor decide o acesso. O polling só atualiza a interface de uma sessão já revogada. */
export function useSessaoVerificada(props:Props) {
 const atual=useRef(props);atual.current=props;
 const [situacao,setSituacao]=useState<{token?:string;verificando:boolean;erro:string}>({verificando:Boolean(props.sessao&&props.online),erro:''});
 const token=props.sessao?.token;
 useEffect(()=>{
  function invalidada(evento:Event){const d=(evento as CustomEvent<DetalheAcesso&{token:string}>).detail;if(d?.token===atual.current.sessao?.token)atual.current.aoInvalidar(d);}
  window.addEventListener('flow:sessao-invalidada',invalidada);
  return()=>window.removeEventListener('flow:sessao-invalidada',invalidada);
 },[]);
 useEffect(()=>{
  if(!token||!props.online){setSituacao({token,verificando:false,erro:''});return;}
  let ativo=true,ocupado=false;
  const controle=new AbortController();
  setSituacao({token,verificando:true,erro:''});
  async function verificar(){
   if(!ativo||ocupado||document.hidden||atual.current.sessao?.token!==token)return;
   ocupado=true;
   try{
    const usuario=await requisitar<Usuario>('/eu',token,{cache:'no-store',signal:AbortSignal.any([controle.signal,AbortSignal.timeout(10000)])});
    const vigente=atual.current.sessao;
    if(!ativo||!vigente||vigente.token!==token)return;
    if(usuario.id!==vigente.usuario.id||typeof usuario.nome!=='string'||typeof usuario.email!=='string'||!['aluno','admin'].includes(usuario.papel))throw new Error('A sessão não pôde ser confirmada.');
    atual.current.aoAtualizar(usuario);setSituacao({token,verificando:false,erro:''});
   }catch(erro){
    if(!ativo||atual.current.sessao?.token!==token)return;
    if(erro instanceof ErroApi&&erro.status===401&&!erro.detalhe)atual.current.aoExpirar();
    setSituacao({token,verificando:false,erro:erro instanceof Error?erro.message:'Não foi possível verificar o acesso agora.'});
   }finally{ocupado=false;}
  }
  void verificar();const tempo=window.setInterval(()=>void verificar(),20000);
  const retomar=()=>{if(!document.hidden)void verificar();};
  window.addEventListener('focus',retomar);document.addEventListener('visibilitychange',retomar);
  return()=>{ativo=false;controle.abort();clearInterval(tempo);window.removeEventListener('focus',retomar);document.removeEventListener('visibilitychange',retomar);};
 },[token,props.online]);
 return {verificandoSessao:Boolean(token&&props.online&&(situacao.token!==token||situacao.verificando)),erroVerificacao:situacao.token===token?situacao.erro:''};
}
