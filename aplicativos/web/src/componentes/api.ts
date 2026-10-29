import { Capacitor } from '@capacitor/core';
export const baseApi = (import.meta.env.VITE_API_URL || (Capacitor.isNativePlatform() ? 'https://flow-programacao-guiada-anderhonoratos-projects.vercel.app/api' : '/api')).replace(/\/$/,'');
export interface DetalheAcesso { codigo: string; mensagem: string; motivo?: string | null; ate?: string | null; estado?: string }
export function detalheDeAcesso(valor: unknown): DetalheAcesso | undefined {
 if (!valor || typeof valor !== 'object' || !('codigo' in valor) || !('mensagem' in valor) || typeof valor.codigo !== 'string' || typeof valor.mensagem !== 'string') return;
 const dado=valor as Record<string,unknown>;
 return {codigo:valor.codigo,mensagem:valor.mensagem,motivo:typeof dado.motivo==='string'?dado.motivo:null,ate:typeof dado.ate==='string'?dado.ate:null,estado:typeof dado.estado==='string'?dado.estado:undefined};
}
export function mensagemDeAcesso(detalhe: DetalheAcesso) {
 const motivo=detalhe.motivo&&!detalhe.mensagem.includes(detalhe.motivo)?` Motivo: ${detalhe.motivo}`:'';
 const data=detalhe.ate&&Number.isFinite(Date.parse(detalhe.ate))?` Até ${new Date(detalhe.ate).toLocaleString('pt-BR')}.`:'';
 return detalhe.mensagem+motivo+data;
}
export function notificarAcesso(status:number,dados:unknown,token?:string) {
 const detalhe=detalheDeAcesso((dados as {detail?:unknown}|null)?.detail);
 if(token&&[401,403].includes(status)&&detalhe&&['CONTA_BANIDA','CONTA_INATIVA','SESSAO_REVOGADA','CONTA_EXCLUIDA'].includes(detalhe.codigo)&&typeof window!=='undefined')window.dispatchEvent(new CustomEvent('flow:sessao-invalidada',{detail:{token,...detalhe}}));
 return detalhe;
}
export class ErroApi extends Error { constructor(mensagem:string,public status:number,public detalhe?:DetalheAcesso){super(mensagem);} }
export async function requisitar<T>(caminho:string,token?:string,opcoes:RequestInit={}):Promise<T>{
 const resposta=await fetch(`${baseApi}${caminho}`,{...opcoes,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`} : {}),...opcoes.headers},signal:opcoes.signal||AbortSignal.timeout(25000)});
 const texto=await resposta.text();
 let dados:unknown;try{dados=texto?JSON.parse(texto):null;}catch{throw new ErroApi('O servidor não respondeu no formato esperado. Seu trabalho continua salvo neste dispositivo.',resposta.status);}
 if(!resposta.ok){const acesso=notificarAcesso(resposta.status,dados,token);const detalhe=(dados as {detail?:unknown})?.detail;throw new ErroApi(acesso?mensagemDeAcesso(acesso):typeof detalhe==='string'?detalhe:`Não foi possível concluir a solicitação (${resposta.status}).`,resposta.status,acesso);}
 return dados as T;
}
export interface Usuario {id:string;nome:string;email:string;papel:string}
export interface Sessao {token:string;usuario:Usuario}
