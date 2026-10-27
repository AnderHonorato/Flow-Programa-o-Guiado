// @vitest-environment jsdom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import Diagnostico,{questoesDiagnostico,recomendarAula} from './Diagnostico';
let elemento:HTMLDivElement;
let raiz:ReturnType<typeof createRoot>;
beforeEach(()=>{Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});elemento=document.createElement('div');document.body.append(elemento);raiz=createRoot(elemento);});
afterEach(async()=>{await act(async()=>raiz.unmount());elemento.remove();});
const botao=(texto:string)=>[...elemento.querySelectorAll('button')].find(b=>b.textContent?.includes(texto))!;
it('permite pular ou começar do zero sem responder',async()=>{
 const abrir=vi.fn(),pular=vi.fn();await act(async()=>raiz.render(<Diagnostico aoAbrir={abrir} aoPular={pular}/>));
 expect(botao('Conferir resposta').disabled).toBe(true);
 await act(async()=>botao('Pular diagnóstico').click());expect(pular).toHaveBeenCalledOnce();
 await act(async()=>botao('Começar do zero').click());expect(abrir.mock.calls[0][0].id).toBe('html-primeira-pagina');
});
it('explica cinco respostas e recomenda a primeira lacuna sem bloquear outras trilhas',async()=>{
 const abrir=vi.fn();await act(async()=>raiz.render(<Diagnostico aoAbrir={abrir} aoPular={()=>{}}/>));
 for(let i=0;i<5;i++){
  const escolha=i===1?1:questoesDiagnostico[i].correta;
  await act(async()=>elemento.querySelectorAll<HTMLButtonElement>('.alternativa')[escolha].click());
  await act(async()=>botao('Conferir resposta').click());
  expect(elemento.querySelector('[role="status"]')?.textContent).toBe(questoesDiagnostico[i].feedback[escolha]);
  await act(async()=>botao(i===4?'Ver sugestão':'Próxima questão').click());
 }
 expect(elemento.textContent).toContain('4 de 5');expect(elemento.textContent).toContain('CSS: forma e layout');
 await act(async()=>botao('Abrir aula sugerida').click());expect(abrir.mock.calls[0][0].id).toBe('css-box-model');
 expect(botao('Explorar outras trilhas')).toBeTruthy();
});
it('sugere aplicação de funções quando todas estão corretas',()=>{expect(recomendarAula(questoesDiagnostico.map(q=>q.correta)).id).toBe('js-funcoes');});
