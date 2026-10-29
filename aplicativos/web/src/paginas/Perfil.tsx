import {useEffect,useRef,useState} from 'react';
import type {Flow} from '../componentes/useFlow';
import Icone from '../componentes/Icone';
import {exportarPerfil,importarPerfil} from '../offline/armazenamento';
import {AvatarEvolucao, GaleriaEvolucao} from '../evolucao/Evolucao';
import EditorAvatar from '../perfil/EditorAvatar';
import {experiencia, evolucao} from '../evolucao/regras';
import {baixarPacote,listarPacotes,removerPacote,consultarEspaco,solicitarArmazenamentoPersistente,pacotePython,type PacoteAulas,type PacoteInstalado} from '../offline/pacotes';
function baixar(texto:string,nome:string){const url=URL.createObjectURL(new Blob([texto],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download=nome;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
const tamanho=(bytes:number)=>bytes===0?'0 KB':bytes>=1024*1024?`${(bytes/1024/1024).toFixed(1)} MB`:`${Math.max(1,Math.ceil(bytes/1024))} KB`;
export default function Perfil({flow,aoEntrar}:{flow:Flow;aoEntrar:()=>void}){
 const [espaco,setEspaco]=useState<{usado?:number;cota?:number;persistente:boolean}>({persistente:false});
 const [sw,setSw]=useState(false);
 const [pacotes,setPacotes]=useState<PacoteInstalado[]>([]);
 const [operacao,setOperacao]=useState<{id:string;prontas:number;total:number;removendo?:boolean}|null>(null);
 const perfilAtual=useRef(flow.perfilId);perfilAtual.current=flow.perfilId;
 useEffect(()=>{
  let ativo=true;setPacotes([]);setOperacao(null);
  void listarPacotes(flow.perfilId).then(p=>{if(ativo)setPacotes(p);}).catch(e=>{if(ativo)flow.setAviso(e.message);});
  void consultarEspaco().then(e=>{if(ativo)setEspaco(e);}).catch(()=>{});
  void navigator.serviceWorker?.getRegistration().then(r=>{if(ativo)setSw(!!r?.active);}).catch(()=>{});
  return()=>{ativo=false;};
 },[flow.perfilId]);
 const disponiveis:PacoteAulas[]=flow.catalogo.trilhas.map(t=>({id:`trilha:${t.id}`,titulo:t.titulo,aulas:t.modulos.filter(m=>m.estado==='publicado').flatMap(m=>m.aulas)})).filter(p=>p.aulas.length>0);
 disponiveis.push(pacotePython);
 async function gerenciar(pacote:PacoteAulas,remover=false){
  const perfil=flow.perfilId;setOperacao({id:pacote.id,prontas:0,total:pacote.recursos?.length??0,removendo:remover});
  try{
   if(remover)await removerPacote(perfil,pacote.id);
   else await baixarPacote(perfil,pacote,(prontas,total)=>{if(perfilAtual.current===perfil)setOperacao({id:pacote.id,prontas,total});});
   const [lista,uso]=await Promise.all([listarPacotes(perfil),consultarEspaco()]);
   if(perfilAtual.current===perfil){setPacotes(lista);setEspaco(uso);flow.setAviso(remover?'Pacote removido. Seu progresso e seus projetos foram preservados.':`${pacote.titulo} salvo neste dispositivo.`);}
  }catch(e){if(perfilAtual.current===perfil)flow.setAviso(e instanceof Error?e.message:'Não foi possível concluir o download. Tente novamente com conexão.');}
  finally{if(perfilAtual.current===perfil)setOperacao(null);}
 }
 return <>
  <div className="cabecalho-pagina"><div><span className="sobretitulo">UM ESPAÇO QUE É SEU</span><h1>Sua jornada, do seu jeito.</h1><p>Progresso, preferências e trabalho salvos com cuidado.</p></div><AvatarEvolucao perfilId={flow.perfilId} estado={flow.estado} tamanho={76}/></div>
  <EditorAvatar key={`avatar-${flow.perfilId}`} perfilId={flow.perfilId} avatar={flow.estado.avatar} indiceNivel={evolucao(flow.estado).indice} aoSalvar={flow.definirAvatar}/>
  <GaleriaEvolucao key={flow.perfilId} perfilId={flow.perfilId} estado={flow.estado}/>
  <div className="perfil-grade">
   <section className="painel-secao"><h2>{flow.nome}</h2><p>{flow.sessao?.usuario.email||'Perfil local neste dispositivo'}</p><div className="lista-dados"><div><span>Competências registradas</span><strong>{flow.estado.aulasConcluidas.length}</strong></div><div><span>Experiência conquistada</span><strong>{experiencia(flow.estado)} XP</strong></div><div><span>Envios aguardando internet</span><strong>{flow.fila.filter(t=>t.status==='aguardando_sincronizacao').length}</strong></div><div><span>Progresso remoto</span><small>{flow.sessaoExpirada?'Sessão expirada':flow.sessao?'Conta conectada':'Entre para sincronizar entre dispositivos'}</small></div></div><div className="botoes" style={{marginTop:22}}>{flow.sessaoExpirada?<><button className="botao primario" onClick={aoEntrar}>Entrar novamente</button><button className="botao secundario" onClick={()=>void flow.sair()}>Sair da conta</button></>:flow.sessao?<><button className="botao primario" disabled={flow.sincronizando||!flow.online} onClick={()=>void flow.sincronizar()}><Icone nome="rede"/>{flow.sincronizando?'Sincronizando…':'Sincronizar agora'}</button><button className="botao secundario" onClick={()=>void flow.sair()}>Sair da conta</button></>:<button className="botao primario" onClick={aoEntrar}>Vincular a uma conta <Icone nome="seta"/></button>}</div></section>
   <section className="painel-secao"><h2>Aprender sem internet</h2><p>As aulas incluídas e o laboratório HTML/CSS/JS estão no aplicativo. Na web, instale os recursos offline com uma conexão antes de sair.</p><div className="lista-dados"><div><span>Aplicação web offline</span><small>{sw?'Cache ativo neste navegador':'Instalação do cache ainda não confirmada'}</small></div><div><span>Armazenamento protegido</span><small>{espaco.persistente?'Persistente':'Pode ser removido pelo dispositivo'}</small></div><div><span>Espaço estimado</span><small>{espaco.usado!==undefined?tamanho(espaco.usado):'Não informado pelo navegador'}{espaco.cota?` de ${tamanho(espaco.cota)}`:''}</small></div><div><span>Pacotes deste perfil</span><small>{tamanho(pacotes.reduce((s,p)=>s+p.bytes,0))}</small></div></div><button className="botao secundario" style={{marginTop:20}} onClick={()=>void solicitarArmazenamentoPersistente().then(p=>{setEspaco(e=>({...e,persistente:p}));flow.setAviso(p?'O navegador autorizou armazenamento persistente.':'O navegador não autorizou persistência. Mantenha uma cópia exportada.');}).catch(e=>flow.setAviso(e.message))}>Proteger armazenamento</button><p className="texto-auxiliar" style={{marginTop:15}}>GPT, envio ao professor e novos downloads exigem internet. A narração offline depende de voz local instalada.</p></section>
   <section className="painel-secao"><h2>Seu trabalho vai com você</h2><p>Exporte uma cópia do progresso e dos envios. O arquivo pode conter o código e informações que você escreveu: guarde com cuidado. Os arquivos binários dos pacotes precisam ser baixados novamente em outro dispositivo.</p><div className="botoes"><button className="botao secundario" onClick={()=>void exportarPerfil(flow.perfilId).then(s=>baixar(s,'flow-meu-aprendizado.json')).catch(e=>flow.setAviso(e.message))}><Icone nome="download"/> Exportar meus dados</button><label className="botao secundario" style={{cursor:'pointer'}}>Importar cópia<input type="file" accept="application/json,.json" style={{maxWidth:200}} onChange={e=>{const f=e.target.files?.[0];if(f)void f.text().then(s=>importarPerfil(flow.perfilId,s)).then(()=>window.location.reload()).catch(e=>flow.setAviso(e.message));}}/></label></div></section>
   <section className="painel-secao"><h2>Pacotes no dispositivo</h2><p>Salve as aulas publicadas de cada trilha. O runtime Python é opcional e ocupa cerca de 12 MB.</p><div className="lista-dados">{[...disponiveis,...pacotes.filter(p=>!disponiveis.some(d=>d.id===p.id))].map(p=>{
    const instalado=pacotes.find(i=>i.id===p.id),atual=operacao?.id===p.id;
    return <div key={p.id} style={{display:'block'}}><div style={{display:'flex',justifyContent:'space-between',gap:12}}><strong>{p.titulo}</strong><small>{instalado?`${tamanho(instalado.bytes)} · baixado`:`${p.aulas.length} aulas${p.id===pacotePython.id?' · 6 arquivos':''}`}</small></div><div className="botoes" style={{marginTop:12}}><button className="botao secundario" disabled={!!operacao||!flow.online} onClick={()=>void gerenciar(p)}><Icone nome="download"/>{instalado?'Atualizar pacote':'Baixar pacote'}</button>{instalado&&<button className="botao secundario" disabled={!!operacao} onClick={()=>void gerenciar(p,true)}>Remover pacote</button>}</div>{atual&&<p role="status">{operacao.removendo?'Removendo pacote…':operacao.total?`Baixando arquivos: ${operacao.prontas} de ${operacao.total}`:'Salvando aulas…'}{!operacao.removendo&&operacao.total>0&&<progress aria-label={`Download de ${p.titulo}`} max={operacao.total} value={operacao.prontas}/>}</p>}</div>;
   })}</div><p className="texto-auxiliar" style={{marginTop:15}}>Aulas em produção editorial ainda não entram nos downloads. Python usa WebAssembly; instale o runtime e teste uma aula antes de ficar sem conexão. Remover pacotes preserva o progresso e os projetos.</p></section>
  </div>
 </>;
}
