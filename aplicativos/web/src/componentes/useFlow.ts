import { evolucao } from '../evolucao/regras';
import { registrarHistorico } from '../evolucao/historico';
import { validarAvatar, type AvatarPerfil } from '../perfil/avatar';
import { escolher, analisar, combinarAvaliacoes, respostasDasAvaliacoes } from '../aprendizagem/avaliacao';
import {useCallback,useEffect,useRef,useState} from 'react';
import type {Aula,ArquivosCodigo} from '../../../../contratos/tipos';
import {catalogoIncluido,lerCatalogoLocal,atualizarCatalogo} from '../offline/catalogo';
import {lerEstado,salvarEstado,enfileirarTentativa,listarFila,sincronizarFila,vincularPerfil,combinarEstados,lerSincronizacao,type EstadoLocal,type TentativaLocal} from '../offline/armazenamento';
import {atualizarRevisao} from '../offline/revisao';
import {baseApi,requisitar,mensagemDeAcesso,type DetalheAcesso,type Sessao,type Usuario} from './api';
import {useSessaoVerificada} from '../seguranca/useSessaoVerificada';
import {useFilaLeituras} from '../aprendizagem/useRegistroLeitura';
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
 const [aviso,setAviso]=useState(()=>{try{return sessionStorage.getItem('flow-acesso-aviso')||'';}catch{return '';}});
 const [sincronizando,setSincronizando]=useState(false);
 const [sessaoExpirada,setSessaoExpirada]=useState(false);
 const pronto=useRef<string|null>(null);
 const perfilAtual=useRef(perfilId);perfilAtual.current=perfilId;
 const sessaoAtual=useRef(sessao);sessaoAtual.current=sessao;
 const estadoAtual=useRef(estado);estadoAtual.current=estado;
 const gravacao=useRef<Promise<void>>(Promise.resolve());
 const {verificandoSessao,erroVerificacao}=useSessaoVerificada({sessao,online,aoInvalidar:invalidarAcesso,aoExpirar:()=>setSessaoExpirada(true),aoAtualizar:atualizarUsuario});
 useFilaLeituras(perfilId,sessao?.token,online&&!sessaoExpirada);
 function invalidarAcesso(detalhe:DetalheAcesso){
  const anterior=sessaoAtual.current;if(!anterior)return;
  if(pronto.current===anterior.usuario.id){const copia=estadoAtual.current;gravacao.current=gravacao.current.then(()=>salvarEstado(anterior.usuario.id,copia)).catch(()=>{});}
  sessaoAtual.current=null;pronto.current=null;sessionStorage.removeItem('flow-sessao');
  const mensagem=mensagemDeAcesso(detalhe);try{sessionStorage.setItem('flow-acesso-aviso',mensagem);}catch{/* A notificação permanece nesta tela. */}
  setSessao(null);setSessaoExpirada(false);setSincronizando(false);setAviso(mensagem);
  const local=localStorage.getItem('flow-nome-local')||'Estudante';localStorage.setItem('flow-nome',local);setNome(local);
 }
 function atualizarUsuario(usuario:Usuario){
  const anterior=sessaoAtual.current;if(!anterior||anterior.usuario.id!==usuario.id)return;
  if(['id','nome','email','papel'].every(k=>anterior.usuario[k as keyof Usuario]===usuario[k as keyof Usuario]))return;
  const nova={token:anterior.token,usuario:{id:usuario.id,nome:usuario.nome,email:usuario.email,papel:usuario.papel}};
  sessaoAtual.current=nova;sessionStorage.setItem('flow-sessao',JSON.stringify(nova));setSessao(nova);setNome(usuario.nome);localStorage.setItem('flow-nome',usuario.nome);
 }
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
 useEffect(()=>{let ativo=true;pronto.current=null;setCarregando(true);void gravacao.current.then(()=>Promise.all([lerEstado(perfilId),listarFila(perfilId)])).then(([e,f])=>{if(ativo&&perfilAtual.current===perfilId){setEstado({...e,historicoConquistas:registrarHistorico(e,e)});setFila(f);pronto.current=perfilId;setCarregando(false);}}).catch(()=>{if(ativo){setCarregando(false);setAviso('O armazenamento local não está disponível. Verifique as permissões do navegador antes de editar.');}});return()=>{ativo=false;};},[perfilId]);
 useEffect(()=>{if(pronto.current===perfilId){gravacao.current=gravacao.current.then(()=>salvarEstado(perfilId,estado)).catch(()=>{if(perfilAtual.current===perfilId)setAviso('Não foi possível salvar o progresso. Exporte seus dados no perfil.');});}},[estado,perfilId]);
 const sincronizar=useCallback(async(silencioso=false)=>{if(!sessao||!navigator.onLine||pronto.current!==perfilId)return;setSincronizando(true);try{
  await gravacao.current;
  const resultado=await sincronizarFila(perfilId,sessao.token,baseApi);
  const [remoto,filaAtual,situacao]=await Promise.all([lerEstado(perfilId),listarFila(perfilId),lerSincronizacao(perfilId)]);
  if(perfilAtual.current!==perfilId||sessaoAtual.current?.token!==sessao.token)return;
  const combinado=combinarEstados(estadoAtual.current,remoto);
  combinado.avaliacoes=combinarAvaliacoes(remoto.avaliacoes,estadoAtual.current.avaliacoes);
  combinado.respostas=respostasDasAvaliacoes({...estadoAtual.current.respostas,...remoto.respostas},combinado.avaliacoes);
  combinado.historicoConquistas={...estadoAtual.current.historicoConquistas,...remoto.historicoConquistas};
  combinado.historicoConquistas=registrarHistorico(combinado,combinado);
  combinado.xp=combinado.aulasConcluidas.length*100+Object.values(combinado.respostas).filter(Boolean).length*10;
  setEstado(combinado);setFila(filaAtual);
  setSessaoExpirada(Boolean(situacao.sessaoExpirada));
  if(!silencioso||situacao.erro||resultado.pendentes)setAviso(situacao.erro|| (resultado.pendentes?`${resultado.pendentes} envio(s) aguardam nova tentativa. Seus dados estão preservados.`:'Seu progresso foi sincronizado.'));
 }catch(e){if(perfilAtual.current===perfilId&&sessaoAtual.current?.token===sessao.token)setAviso(e instanceof Error?e.message:'Sem conexão com o servidor. Seu trabalho está salvo.');}finally{if(perfilAtual.current===perfilId&&sessaoAtual.current?.token===sessao.token)setSincronizando(false);}},[perfilId,sessao]);
 useEffect(()=>{if(sessao&&online&&!carregando)void sincronizar();},[sessao,online,carregando]);
 const assinaturaAvaliacoes=JSON.stringify([estado.avaliacoes ?? {},estado.avatar,estado.historicoConquistas]);
 useEffect(()=>{
  if(!sessao||!online||carregando||pronto.current!==perfilId||!(Object.keys(estado.avaliacoes??{}).length||estado.avatar||Object.keys(estado.historicoConquistas??{}).length))return;
  const timer=setTimeout(()=>void sincronizar(true),800);
  return()=>clearTimeout(timer);
 },[assinaturaAvaliacoes,sessao,online,carregando,perfilId,sincronizar]);
 function iniciar(nomeNovo:string){const n=nomeNovo.trim().slice(0,60)||'Estudante';localStorage.setItem('flow-nome',n);if(!sessaoAtual.current)localStorage.setItem('flow-nome-local',n);setNome(n);}
 async function autenticar(nova:Sessao,signal?:AbortSignal){
  const origem=perfilId,tokenAnterior=sessaoAtual.current?.token;
  const conferir=()=>{if(signal?.aborted||perfilAtual.current!==origem||sessaoAtual.current?.token!==tokenAnterior)throw new Error('A entrada foi cancelada. Tente novamente.');};
  conferir();
  await gravacao.current;
  conferir();
  if(pronto.current===perfilId)await salvarEstado(perfilId,estadoAtual.current);
  if(!sessao)await vincularPerfil(idLocal,nova.usuario.id);
  await Promise.all([lerEstado(nova.usuario.id),listarFila(nova.usuario.id)]);conferir();
  sessionStorage.removeItem('flow-acesso-aviso');sessaoAtual.current=nova;sessionStorage.setItem('flow-sessao',JSON.stringify(nova));setSessaoExpirada(false);setSessao(nova);iniciar(nova.usuario.nome);
 }
 async function sair(){await gravacao.current;if(sessaoAtual.current?.token!==sessao?.token)return;sessionStorage.removeItem('flow-sessao');setSessao(null);setSessaoExpirada(false);setSincronizando(false);setAviso('Sessão encerrada. Você voltou ao seu perfil local.');if(sessao)try{await requisitar('/sessao',sessao.token,{method:'DELETE'});}catch{/* sessão local termina mesmo sem rede */}}
 function escolherResposta(aula:Aula,questao:string,indice:number){
  if(pronto.current!==perfilId)return;
  setEstado(e=>{const atual=e.avaliacoes?.[aula.id];const nova=escolher(aula,atual,questao,indice);return nova===atual?e:{...e,avaliacoes:{...e.avaliacoes,[aula.id]:nova}};});
 }
 function enviarAvaliacao(aula:Aula){
  if(pronto.current!==perfilId)return;
  setEstado(e=>{
   const prova=e.avaliacoes?.[aula.id];if(!prova||prova.enviadaEm)return e;
   const resultado=analisar(aula,prova);if(!resultado.completa)return e;
   const respostas={...e.respostas};for(const item of resultado.itens)respostas[`${aula.id}:${item.questao.id}`]=item.correta;
   const proximo={...e,respostas,xp:e.aulasConcluidas.length*100+Object.values(respostas).filter(Boolean).length*10,
    avaliacoes:{...e.avaliacoes,[aula.id]:{...prova,enviadaEm:new Date().toISOString()}},
    revisoes:{...e.revisoes,[aula.id]:atualizarRevisao(e.revisoes[aula.id],resultado.acertos===resultado.total?'correta':'incorreta')}};
   return {...proximo,historicoConquistas:registrarHistorico(e,proximo)};
  });
 }
 function revisarAvaliacao(aula:Aula){if(pronto.current!==perfilId)return;setEstado(e=>{const prova=e.avaliacoes?.[aula.id];return prova?.enviadaEm?{...e,avaliacoes:{...e.avaliacoes,[aula.id]:{...prova,revisada:true}}}:e;});}
 function concluir(aula:Aula){
  if(pronto.current!==perfilId)return false;
  if(!estado.avaliacoes?.[aula.id]?.revisada){setAviso('Envie a avaliação e leia a correção antes de registrar a competência.');return false;}
  setEstado(e=>{const aulasConcluidas=[...new Set([...e.aulasConcluidas,aula.id])];const proximo={...e,aulasConcluidas,xp:aulasConcluidas.length*100+Object.values(e.respostas).filter(Boolean).length*10,revisoes:{...e.revisoes,[aula.id]:{etapa:0,proxima:new Date(Date.now()+86400000).toISOString()}}};return {...proximo,historicoConquistas:registrarHistorico(e,proximo)};});return true;
 }
 async function definirAvatar(avatar:AvatarPerfil){
  if(pronto.current!==perfilId||perfilAtual.current!==perfilId)throw new Error('O perfil ainda está abrindo. Tente novamente.');
  if(!validarAvatar(avatar,evolucao(estadoAtual.current).indice))throw new Error('Escolha uma foto ou um avatar válido.');
  const tarefa=gravacao.current.then(async()=>{const atual=await lerEstado(perfilId);await salvarEstado(perfilId,{...atual,avatar});});
  gravacao.current=tarefa.catch(()=>{});
  await tarefa;
  if(perfilAtual.current!==perfilId||pronto.current!==perfilId)return;
  setEstado(e=>({...e,avatar}));
 }
 async function enviar(aula:Aula,arquivos:ArquivosCodigo){const tentativa:TentativaLocal={id:crypto.randomUUID(),aulaId:aula.id,arquivos,criadaEm:new Date().toISOString(),status:'aguardando_sincronizacao'};await enfileirarTentativa(perfilId,tentativa);const atualizada=await listarFila(perfilId);if(perfilAtual.current!==perfilId)return;setFila(atualizada);setAviso(sessao&&online?'Trabalho salvo. Enviando para a fila de validação…':'Aguardando sincronização. Entre em uma conta quando tiver conexão para enviar ao professor.');if(sessao&&online)await sincronizar();}
 return {catalogo:catalogoAtual,aulas:catalogoAtual.trilhas.flatMap(t=>t.modulos.flatMap(m=>m.aulas)),nome,iniciar,sessao,sessaoExpirada,autenticar,sair,perfilId,estado:pronto.current===perfilId?estado:estadoInicial,setEstado,fila:pronto.current===perfilId?fila:[],carregando:carregando||pronto.current!==perfilId,verificandoSessao,erroVerificacao,online,aviso,setAviso,sincronizando,sincronizar,escolherResposta,enviarAvaliacao,revisarAvaliacao,concluir,enviar,definirAvatar};
}
export type Flow=ReturnType<typeof useFlow>;
