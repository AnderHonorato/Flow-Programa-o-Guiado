import {useState} from 'react';
import Icone from './Icone';
export const urlPublica='https://flow-programacao-guiada-anderhonoratos-projects.vercel.app';
export default function Compartilhar(){
 const [aberto,abrir]=useState(false),[mensagem,definirMensagem]=useState('');
 return <div className="compartilhar-flow"><button type="button" aria-expanded={aberto} onClick={()=>abrir(!aberto)}><Icone nome="rede" tamanho={18}/><span>Compartilhar app</span></button>{aberto&&<div className="compartilhar-flow-painel"><p>Link público · abre em qualquer rede com internet.</p><a href={urlPublica} target="_blank" rel="noopener noreferrer">Abrir Flow online ↗</a><label>Endereço para compartilhar<input type="url" value={urlPublica} readOnly onFocus={e=>e.currentTarget.select()}/></label><button type="button" onClick={()=>{if(!navigator.clipboard){definirMensagem('Selecione e copie o endereço acima.');return;}void navigator.clipboard.writeText(urlPublica).then(()=>definirMensagem('Link copiado. Pode compartilhar!')).catch(()=>definirMensagem('Selecione e copie o endereço acima.'));}}>Copiar link público</button>{mensagem&&<small role="status">{mensagem}</small>}</div>}</div>;
}
