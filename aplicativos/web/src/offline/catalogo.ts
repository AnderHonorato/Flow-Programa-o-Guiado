import type {Catalogo} from '../../../../contratos/tipos';
import dados from '../../../../conteudos/catalogo.json';
import {lerRecursoLocal,salvarRecursoLocal} from './armazenamento';

export const catalogoIncluido=dados as Catalogo;
const objeto=(v:unknown):v is Record<string,unknown>=>typeof v==='object'&&v!==null&&!Array.isArray(v);
const texto=(v:unknown)=>typeof v==='string';
const textos=(v:unknown)=>Array.isArray(v)&&v.every(texto);
const arquivos=(v:unknown)=>objeto(v)&&['html','css','js'].every(c=>texto(v[c]))&&(v.python===undefined||texto(v.python));
/** Valida a fronteira pública antes de salvar ou apresentar conteúdo do CMS. */
export function validarCatalogo(valor:unknown):valor is Catalogo {
 if(!objeto(valor)||valor.versao!==1||!Array.isArray(valor.trilhas))return false;
 const ids=new Set<string>();
 const id=(v:unknown)=>typeof v==='string'&&v.length>0&&v.length<=200&&!ids.has(v)&&Boolean(ids.add(v));
 return valor.trilhas.every(t=>objeto(t)&&id(t.id)&&['titulo','descricao','cor'].every(c=>texto(t[c]))&&textos(t.preRequisitos)&&Array.isArray(t.modulos)&&t.modulos.every(m=>
  objeto(m)&&id(m.id)&&texto(m.titulo)&&['publicado','em_producao'].includes(String(m.estado))&&Array.isArray(m.aulas)&&m.aulas.every(a=>
   objeto(a)&&id(a.id)&&['titulo','objetivo','desafio','variacao','resumo','competencia'].every(c=>texto(a[c]))&&
   ['preRequisitos','blocos','pontosDificeis','pistas','rubrica'].every(c=>textos(a[c]))&&
   ['html','css','javascript','dom','python','api'].includes(String(a.linguagem))&&arquivos(a.arquivos)&&
   Array.isArray(a.exemplos)&&a.exemplos.every(e=>objeto(e)&&texto(e.titulo)&&texto(e.codigo)&&textos(e.explicacao))&&
   Array.isArray(a.questoes)&&a.questoes.every(q=>objeto(q)&&texto(q.id)&&texto(q.enunciado)&&Array.isArray(q.alternativas)&&q.alternativas.every(r=>objeto(r)&&texto(r.texto)&&typeof r.correta==='boolean'&&texto(r.feedback)))&&
   (a.testes===undefined||(Array.isArray(a.testes)&&a.testes.every(e=>objeto(e)&&texto(e.id)&&texto(e.descricao)&&['elemento','texto','atributo','estilo','evento','javascript','python'].includes(String(e.tipo))&&['seletor','esperado','propriedade'].every(c=>e[c]===undefined||texto(e[c])))))
  )));
}

export async function lerCatalogoLocal(perfil:string):Promise<Catalogo>{
 try{const salvo=await lerRecursoLocal<unknown>(perfil,'catalogo:publicado');return validarCatalogo(salvo)?salvo:catalogoIncluido;}catch{return catalogoIncluido;}
}

export async function atualizarCatalogo(perfil:string,api:string,signal?:AbortSignal):Promise<Catalogo>{
 const resposta=await fetch(`${api.replace(/\/$/,'')}/catalogo`,{credentials:'omit',signal:signal??AbortSignal.timeout(15000),headers:{Accept:'application/json'}});
 if(!resposta.ok)throw new Error('O catálogo remoto está indisponível. O catálogo do dispositivo continua disponível.');
 const corpo:unknown=await resposta.json();
 const catalogo=objeto(corpo)&&'catalogo' in corpo?corpo.catalogo:corpo;
 if(!validarCatalogo(catalogo))throw new Error('O catálogo recebido é inválido. O catálogo do dispositivo foi preservado.');
 if(signal?.aborted)throw new DOMException('Atualização cancelada','AbortError');
 await salvarRecursoLocal(perfil,'catalogo:publicado',catalogo);
 return catalogo;
}
