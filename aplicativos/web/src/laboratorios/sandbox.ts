import type { ArquivosCodigo, Aula } from '../../../../contratos/tipos';
import { verificarSaida } from './saida';
import { instrumentarJavascript } from './instrumentacao';
export interface TesteLaboratorio { id: string; descricao: string; tipo: string; seletor?: string; esperado?: string; propriedade?: string }
export interface MensagemLaboratorio { canal: 'flow-laboratorio'; token: string; tipo: 'console' | 'erro' | 'pronto' | 'inspecao' | 'testes'; nivel?: string; texto?: string; linha?: number; dados?: unknown }
const serializar = (valor: unknown) => JSON.stringify(valor).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
/** Apenas marcação: scripts e handlers no HTML são removidos. JS pertence ao arquivo JS. */
export function limparHtml(html: string): string {
  const documento = new DOMParser().parseFromString(html, 'text/html');
  documento.querySelectorAll('script,iframe,frame,object,embed,base,meta,link').forEach(no => no.remove());
  documento.querySelectorAll('*').forEach(elemento => {
    for (const atributo of [...elemento.attributes]) {
      if (/^on/i.test(atributo.name) || ['srcdoc', 'action', 'formaction', 'ping', 'target'].includes(atributo.name.toLowerCase()) || /^javascript:/i.test(atributo.value.trim()) || (/^(?:https?|ftp):/i.test(atributo.value.trim()) && !(elemento.localName === 'a' && atributo.name.toLowerCase() === 'href'))) elemento.removeAttribute(atributo.name);
    }
  });
  return documento.body.innerHTML;
}
export function testesDaAula(aula: Aula): TesteLaboratorio[] {
  const declarados = (aula as Aula & { testes?: TesteLaboratorio[] }).testes;
  if (declarados?.length) return aula.linguagem === 'python' ? declarados : [...declarados, { id: 'runtime-sem-erros', descricao: 'O JavaScript executa sem erros.', tipo: 'sem_erros' }];
  if (aula.linguagem === 'python') return [];
  return [{ id: 'conteudo', descricao: 'A página apresenta conteúdo visível.', tipo: 'conteudo' }, { id: 'erros', descricao: 'O código executa sem erros de JavaScript.', tipo: 'sem_erros' }];
}
export function criarDocumento(arquivos: ArquivosCodigo, token: string, testes: TesteLaboratorio[] = []): string {
  const nonce = crypto.randomUUID().replace(/-/g, '');
  const guarda = `__flow_${nonce}`;
  let codigo = ''; let erroSintaxe = '';
  try { codigo = instrumentarJavascript(arquivos.js, guarda); } catch (erro) { erroSintaxe = erro instanceof Error ? erro.message : String(erro); }
  const corpo = limparHtml(arquivos.html);
  const original = new DOMParser().parseFromString(arquivos.html, 'text/html');
  const escaparHtml = (texto: string) => texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const idioma = escaparHtml(original.documentElement.lang || '');
  const titulo = escaparHtml(original.title);
  const codigoExecutavel = `(() => { let __inicio = performance.now(); let __passos = 0; setInterval(() => { __inicio = performance.now(); __passos = 0; }, 100); function ${guarda}(){ if (++__passos > 50000 || performance.now() - __inicio > 1200) throw new Error('Execução interrompida: limite de tempo ou repetições. Revise seus laços.'); }\n${codigo}\n})();\n//# sourceURL=aluno.js`;
  const bootstrap = `(() => {
'use strict';
const token = ${serializar(token)};
const enviar = (tipo, dados = {}) => parent.postMessage({canal:'flow-laboratorio', token, tipo, ...dados}, '*');
const testes = ${serializar(testes)};
const verificarSaida = ${verificarSaida.toString()};
let erros = 0; let quantidadeLogs = 0; const registros = [];
const seguro = valor => { try { if (typeof valor === 'string') return valor.slice(0,4000); if (valor instanceof Error) return valor.message; return JSON.stringify(valor)?.slice(0,4000) ?? String(valor); } catch { return '[objeto circular]'; } };
for (const nivel of ['log','info','warn','error','debug']) console[nivel] = (...valores) => {const texto=valores.map(seguro).join(' ');registros.push(texto);if(registros.length>200)registros.shift();if(quantidadeLogs++<200)enviar('console',{nivel,texto});else if(quantidadeLogs===201)enviar('console',{nivel:'warn',texto:'Console limitado a 200 mensagens por execução.'});};
addEventListener('error', evento => { erros++; enviar('erro',{texto: evento.message, linha:evento.lineno}); });
addEventListener('unhandledrejection', evento => { erros++; enviar('erro',{texto:seguro(evento.reason)}); });
const htmlOriginal = ${serializar(arquivos.html)};
function seletor(elemento) { if(elemento.id) return '#' + CSS.escape(elemento.id); const partes=[]; while(elemento && elemento !== document.body){let parte=elemento.tagName.toLowerCase(); if(elemento.parentElement){const iguais=[...elemento.parentElement.children].filter(no=>no.tagName===elemento.tagName);if(iguais.length>1)parte+=':nth-of-type('+(iguais.indexOf(elemento)+1)+')';} partes.unshift(parte);elemento=elemento.parentElement;}return partes.join(' > '); }
let inspecionar = false;
// allow-forms no iframe habilita o evento nativo; form-action 'none' na CSP
// continua bloqueando envio direto, inclusive form.submit() fora deste listener.
// Bloqueia o envio, preservando submit, foco do label e seleção dos controles.
addEventListener('submit', evento => evento.preventDefault(), true);
addEventListener('click', evento => { const alvo = evento.target; if (!(alvo instanceof Element)) return; if(alvo.closest('a')) evento.preventDefault(); if(!inspecionar)return; evento.preventDefault();evento.stopPropagation(); const estilo=getComputedStyle(alvo);const retangulo=alvo.getBoundingClientRect();const tag=alvo.tagName.toLowerCase();const busca=alvo.id ? 'id="'+alvo.id+'"' : '<'+tag;const indice=htmlOriginal.indexOf(busca); enviar('inspecao',{linha:indice < 0 ? 1 : htmlOriginal.slice(0,indice).split('\\n').length,dados:{seletor:seletor(alvo),tag,texto:alvo.textContent?.slice(0,160),largura:Math.round(retangulo.width),altura:Math.round(retangulo.height),margem:estilo.margin,padding:estilo.padding,display:estilo.display,arvore:[...document.body.querySelectorAll('*')].slice(0,30).map(no=>({tag:no.tagName.toLowerCase(),profundidade:(()=>{let p=no,n=0;while(p.parentElement&&p.parentElement!==document.body){n++;p=p.parentElement;}return n;})()}))}}); },true);
function testar(){ const resultados=testes.map(teste=>{try{const elemento=teste.seletor ? document.querySelector(teste.seletor) : null;let aprovado=false;let detalhe='';switch(teste.tipo){case 'elemento':aprovado=!!elemento;break;case 'texto':aprovado=teste.esperado === undefined ? !!elemento?.textContent?.trim() : !!elemento?.textContent?.includes(teste.esperado);break;case 'atributo':aprovado=!!elemento && (teste.esperado === undefined ? elemento.hasAttribute(teste.propriedade||'') : elemento.getAttribute(teste.propriedade||'')===teste.esperado);break;case 'estilo':aprovado=!!elemento && getComputedStyle(elemento).getPropertyValue(teste.propriedade||'').trim()===teste.esperado;break;case 'evento':{const alvo=document.querySelector(teste.propriedade||teste.seletor);const antes=alvo?.textContent;elemento?.dispatchEvent(new MouseEvent('click',{bubbles:true}));aprovado=!!elemento && (teste.esperado ? !!alvo?.textContent?.includes(teste.esperado) : antes!==alvo?.textContent);break;}case 'conteudo':aprovado=!!document.body.innerText.trim();break;case 'sem_erros':aprovado=erros===0;break;case 'javascript':aprovado=verificarSaida(registros,teste.esperado||'',teste.propriedade) && erros===0;break;default:detalhe='Verificação indisponível para este tipo.';}return {id:teste.id,descricao:teste.descricao,aprovado,detalhe};}catch(erro){return {id:teste.id,descricao:teste.descricao,aprovado:false,detalhe:seguro(erro)};}});enviar('testes',{dados:resultados});}
addEventListener('message', evento => {if(evento.source!==parent || evento.data?.token!==token)return;if(evento.data.acao==='testar')testar();if(evento.data.acao==='inspecionar')inspecionar=!!evento.data.ativo;});
${erroSintaxe ? `erros++;enviar('erro',{texto:${serializar(erroSintaxe)}});` : `const script=document.createElement('script');script.nonce=${serializar(nonce)};script.textContent=${serializar(codigoExecutavel)};document.body.append(script);script.remove();`}
enviar('pronto');
})();`;
  return `<!doctype html><html lang="${idioma}"><head><meta charset="utf-8"><title>${titulo}</title><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline'; img-src data:; font-src 'none'; connect-src 'none'; media-src 'none'; object-src 'none'; frame-src 'none'; worker-src 'none'; base-uri 'none'; form-action 'none'"><style>body{font-family:system-ui,sans-serif;margin:20px;overflow-wrap:anywhere}*{box-sizing:border-box}</style><style>${arquivos.css.replace(/<\/style/gi, '<\\/style')}</style></head><body>${corpo}<script nonce="${nonce}">${bootstrap}</script></body></html>`;
}
