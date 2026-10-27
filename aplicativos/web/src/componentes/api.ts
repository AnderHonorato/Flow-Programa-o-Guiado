import { Capacitor } from '@capacitor/core';
export const baseApi = (import.meta.env.VITE_API_URL || (Capacitor.isNativePlatform() ? 'https://flow-programacao-guiada.vercel.app/api' : '/api')).replace(/\/$/,'');
export class ErroApi extends Error { constructor(mensagem:string,public status:number){super(mensagem);} }
export async function requisitar<T>(caminho:string,token?:string,opcoes:RequestInit={}):Promise<T>{
 const resposta=await fetch(`${baseApi}${caminho}`,{...opcoes,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`} : {}),...opcoes.headers},signal:opcoes.signal||AbortSignal.timeout(25000)});
 const texto=await resposta.text();
 let dados:unknown;try{dados=texto?JSON.parse(texto):null;}catch{throw new ErroApi('O servidor não respondeu no formato esperado. Seu trabalho continua salvo neste dispositivo.',resposta.status);}
 if(!resposta.ok){const detalhe=(dados as {detail?:unknown})?.detail;throw new ErroApi(typeof detalhe==='string'?detalhe:`Não foi possível concluir a solicitação (${resposta.status}).`,resposta.status);}
 return dados as T;
}
export interface Usuario {id:string;nome:string;email:string;papel:string}
export interface Sessao {token:string;usuario:Usuario}
