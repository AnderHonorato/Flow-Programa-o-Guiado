// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import type {Flow} from '../componentes/useFlow';
import {salvarRecursoLocal} from '../offline/armazenamento';
import Certificados,{gerarHtmlCertificado,type CertificadoInterno} from './Certificados';
const certificado:CertificadoInterno={codigo:'FLOW-123',titular:'Aluna <script>alert(1)</script>',aulaId:'html-1',titulo:'Página <img src=x onerror=alert(2)>',objetivo:'Criar "título" & parágrafo',emitidoEm:'2026-10-27T12:00:00Z',tentativaId:'t-1',tipo:'reconhecimento_interno_aula',emissor:'Flow',escopo:'Reconhecimento interno'};
let elemento:HTMLDivElement;
let raiz:ReturnType<typeof createRoot>;
beforeEach(()=>{Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});elemento=document.createElement('div');document.body.append(elemento);raiz=createRoot(elemento);});
afterEach(async()=>{await act(async()=>raiz.unmount());elemento.remove();vi.unstubAllGlobals();});
const flow=(id:string,online=true)=>({perfilId:id,sessao:{token:'token-teste',usuario:{id,nome:'Aluna',email:'a@e.com',papel:'aluno'}},online,sessaoExpirada:false,setAviso:vi.fn()} as unknown as Flow);
const esperar=()=>new Promise(r=>setTimeout(r,30));
async function esperarTexto(texto:string){for(let i=0;i<60;i++){await act(async()=>{await esperar();});if(elemento.textContent?.includes(texto))return;}throw new Error(`Texto não apareceu: ${texto}`);}
it('escapa todos os campos do HTML exportado e bloqueia scripts',()=>{
 const html=gerarHtmlCertificado(certificado),dom=new DOMParser().parseFromString(html,'text/html');
 expect(dom.querySelector('script,img')).toBeNull();expect(dom.body.textContent).toContain(certificado.titular);
 expect(dom.body.textContent).toContain(certificado.objetivo);expect(dom.querySelector('meta[http-equiv="Content-Security-Policy"]')?.getAttribute('content')).toContain("default-src 'none'");
});
it('consulta a API autenticada, exibe a resposta e guarda cópia offline por perfil',async()=>{
 const fetch=vi.fn().mockResolvedValue(new Response(JSON.stringify([certificado])));vi.stubGlobal('fetch',fetch);
 await act(async()=>{raiz.render(<Certificados flow={flow('perfil-rede')}/>);});await esperarTexto(certificado.titular);
 expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/certificados'),expect.objectContaining({headers:expect.objectContaining({Authorization:'Bearer token-teste'})}));
 expect(elemento.textContent).toContain(certificado.titular);expect(elemento.querySelector('script,img')).toBeNull();
 await act(async()=>{raiz.render(<Certificados flow={flow('perfil-rede',false)}/>);});await esperarTexto('Sem internet');
 expect(elemento.textContent).toContain('Sem internet');expect(elemento.textContent).toContain(certificado.titulo);
 await act(async()=>{raiz.render(<Certificados flow={flow('outro-perfil',false)}/>);});await act(async()=>{await esperar();});
 expect(elemento.textContent).not.toContain(certificado.titular);
});
it('preserva cópia anterior em falha e substitui com lista vazia em consulta válida',async()=>{
 const perfil='perfil-falha';await salvarRecursoLocal(perfil,'certificados-internos:1',{certificados:[certificado],recebidaEm:'2026-10-27T12:00:00Z'});
 const fetch=vi.fn().mockRejectedValueOnce(new TypeError('Falha na rede')).mockResolvedValue(new Response('[]'));vi.stubGlobal('fetch',fetch);
 await act(async()=>{raiz.render(<Certificados flow={flow(perfil)}/>);});await esperarTexto('desatualizada');
 expect(elemento.textContent).toContain(certificado.titular);expect(elemento.textContent).toContain('desatualizada');
 await act(async()=>{[...elemento.querySelectorAll('button')].find(b=>b.textContent==='Atualizar certificados')!.click();});await esperarTexto('Ainda não há aulas');
 expect(elemento.textContent).not.toContain(certificado.titular);expect(elemento.textContent).toContain('Ainda não há aulas');
});
