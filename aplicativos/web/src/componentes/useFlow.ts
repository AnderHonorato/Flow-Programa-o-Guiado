import {useCallback,useEffect,useRef,useState} from 'react';
import type {Aula,ArquivosCodigo} from '../../../../contratos/tipos';
import {catalogoIncluido,lerCatalogoLocal,atualizarCatalogo} from '../offline/catalogo';
import {lerEstado,salvarEstado,enfileirarTentativa,listarFila,sincronizarFila,vincularPerfil,combinarEstados,lerSincronizacao,type EstadoLocal,type TentativaLocal} from '../offline/armazenamento';
import {atualizarRevisao} from '../offline/revisao';
import {baseApi,requisitar,type Sessao} from './api';
export const catalogo=catalogoIncluido;
export const aulas=catalogo.trilhas.flatMap(t=>t.modulos.flatMap(m=>m.aulas));
const estadoInicial:EstadoLocal={aulasConcluidas:[],respostas:{},revisoes:{},xp:0,ultimaAula:''};
export function useFlow(){
 const [catalogoAtual,setCatalogoAtual]=useState(catalogoIncluido);
 const [nome,setNome]=useState(()=>localStorage.getItem('flow-nome')||'');
 const [idLocal]=useState(()=>{let id=localStorage.getItem('flow-id-local');if(!id){id=crypto.randomUUID();localStorage.setItem('flow-id-local',id);}return id;});
 const [sessao,setSessao]=useState<Sessao|null>(()=>{try{return JSON.parse(sessionStorage.getItem('flow-sessao')||'null');}catch{return null;}});
 const perfilId=sessao?.usuario.id||idLocal;
 const [estado,setEstado]=useState<EstadoLocal>(estadoInicial);
 const [fila,setFila]=useState<TentativaLocal[]>([]);
 const [carregando,setCarregando]=useState(true);
 const [online,setOnline]=useState(navigator.onLine);
 const [aviso,setAviso]=useState('');
 const [sincronizando,setSincronizando]=useState(false);
 const [sessaoExpirada,setSessaoExpirada]=useState(false);
 const pronto=useRef<string|null>(null);
 const perfilAtual=useRef(perfilId);perfilAtual.current=perfilId;
 const sessaoAtual=useRef(sessao);sessaoAtual.current=sessao;
 const estadoAtual=useRef(estado);estadoAtual.current=estado;
 const gravacao=useRef<Promise<void>>(Promise.resolve());
 useEffect(()=>{const atualizar=()=>setOnline(navigator.onLine);window.addEventListener('online',atualizar);window.addEventListener('offline',atualizar);return()=>{window.removeEventListener('online',atualizar);window.removeEventListener('offline',atualizar);};},[]);
 useEffect(()=>{
  let ativo=true;const controle=new AbortController();setCatalogoAtual(catalogoIncluido);
  void lerCatalogoLocal(perfilId).then(async local=>{
   if(!ativo||perfilAtual.current!==perfilId)return;
   setCatalogoAtual(local);
   if(online){try{const remoto=await atualizarCatalogo(perfilId,baseApi,controle.signal);if(ativo&&perfilAtual.current===perfilId)setCatalogoAtual(remoto);}catch{/* conteúdo incluído ou a última cópia validada permanecem disponíveis */}}
  });
  return()=>{ativo=false;controle.abort();};
 },[perfilId,online]);
 useEffect(()=>{let ativo=true;pronto.current=null;setCarregando(true);void gravacao.current.then(()=>Promise.all([lerEstado(perfilId),listarFila(perfilId)])).then(([e,f])=>{if(ativo&&perfilAtual.current===perfilId){setEstado(e);setFila(f);pronto.current=perfilId;setCarregando(false);}}).catch(()=>{if(ativo){setCarregando(false);setAviso('O armazenamento local não está disponível. Verifique as permissões do navegador antes de editar.');}});return()=>{ativo=false;};},[perfilId]);
 useEffect(()=>{if(pronto.current===perfilId){gravacao.current=gravacao.current.then(()=>salvarEstado(perfilId,estado)).catch(()=>{if(perfilAtual.current===perfilId)setAviso('Não foi possível salvar o progresso. Exporte seus dados no perfil.');});}},[estado,perfilId]);
 const sincronizar=useCallback(async()=>{if(!sessao||!navigator.onLine||pronto.current!==perfilId)return;setSincronizando(true);try{
  await gravacao.current;
  const resultado=await sincronizarFila(perfilId,sessao.token,baseApi);
  const [remoto,filaAtual,situacao]=await Promise.all([lerEstado(perfilId),listarFila(perfilId),lerSincronizacao(perfilId)]);
  if(perfilAtual.current!==perfilId||sessaoAtual.current?.token!==sessao.token)return;
  setEstado(combinarEstados(estadoAtual.current,remoto));setFila(filaAtual);
  setSessaoExpirada(Boolean(situacao.sessaoExpirada));
  setAviso(situacao.erro|| (resultado.pendentes?`${resultado.pendentes} envio(s) aguardam nova tentativa. Seus dados estão preservados.`:'Seu progresso foi sincronizado.'));
 }catch(e){if(perfilAtual.current===perfilId&&sessaoAtual.current?.token===sessao.token)setAviso(e instanceof Error?e.message:'Sem conexão com o servidor. Seu trabalho está salvo.');}finally{if(perfilAtual.current===perfilId&&sessaoAtual.current?.token===sessao.token)setSincronizando(false);}},[perfilId,sessao]);
 useEffect(()=>{if(sessao&&online&&!carregando)void sincronizar();},[sessao,online,carregando]);
 function iniciar(nomeNovo:string){const n=nomeNovo.trim().slice(0,60)||'Estudante';localStorage.setItem('flow-nome',n);setNome(n);}
 async function autenticar(nova:Sessao){
  await gravacao.current;
  if(pronto.current===perfilId)await salvarEstado(perfilId,estadoAtual.current);
  if(!sessao)await vincularPerfil(idLocal,nova.usuario.id);
  sessionStorage.setItem('flow-sessao',JSON.stringify(nova));setSessaoExpirada(false);setSessao(nova);iniciar(nova.usuario.nome);
 }
 async function sair(){await gravacao.current;if(sessaoAtual.current?.token!==sessao?.token)return;sessionStorage.removeItem('flow-sessao');setSessao(null);setSessaoExpirada(false);setSincronizando(false);setAviso('Sessão encerrada. Você voltou ao seu perfil local.');if(sessao)try{await requisitar('/sessao',sessao.token,{method:'DELETE'});}catch{/* sessão local termina mesmo sem rede */}}
 function registrarResposta(aula:Aula,questao:string,correta:boolean){if(pronto.current!==perfilId)return;setEstado(e=>({...e,respostas:{...e.respostas,[`${aula.id}:${questao}`]:correta},revisoes:{...e.revisoes,[aula.id]:atualizarRevisao(e.revisoes[aula.id],correta?'correta':'incorreta')}}));}
 function concluir(aula:Aula){if(pronto.current!==perfilId)return false;const aprovado=aula.questoes.every(q=>estado.respostas[`${aula.id}:${q.id}`]);if(!aprovado){setAviso('Responda corretamente às questões e passe nas verificações do laboratório para registrar a competência.');return false;}setEstado(e=>({...e,aulasConcluidas:[...new Set([...e.aulasConcluidas,aula.id])],xp:e.xp+(e.aulasConcluidas.includes(aula.id)?0:50),revisoes:{...e.revisoes,[aula.id]:{etapa:0,proxima:new Date(Date.now()+86400000).toISOString()}}}));return true;}
 async function enviar(aula:Aula,arquivos:ArquivosCodigo){const tentativa:TentativaLocal={id:crypto.randomUUID(),aulaId:aula.id,arquivos,criadaEm:new Date().toISOString(),status:'aguardando_sincronizacao'};await enfileirarTentativa(perfilId,tentativa);const atualizada=await listarFila(perfilId);if(perfilAtual.current!==perfilId)return;setFila(atualizada);setAviso(sessao&&online?'Trabalho salvo. Enviando para a fila de validação…':'Aguardando sincronização. Entre em uma conta quando tiver conexão para enviar ao professor.');if(sessao&&online)await sincronizar();}
 return {catalogo:catalogoAtual,aulas:catalogoAtual.trilhas.flatMap(t=>t.modulos.flatMap(m=>m.aulas)),nome,iniciar,sessao,sessaoExpirada,autenticar,sair,perfilId,estado,setEstado,fila,carregando,online,aviso,setAviso,sincronizando,sincronizar,registrarResposta,concluir,enviar};
}
export type Flow=ReturnType<typeof useFlow>;
