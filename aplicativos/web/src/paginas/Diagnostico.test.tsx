// @vitest-environment jsdom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import Diagnostico,{questoesDiagnostico,recomendarAula} from './Diagnostico';
import {lerRecursoLocal,salvarRecursoLocal} from '../offline/armazenamento';

const dados=vi.hoisted(()=>new Map<string,unknown>());
vi.mock('../offline/armazenamento',()=>({
 lerRecursoLocal:vi.fn(async(perfil:string,chave:string)=>structuredClone(dados.get(`${perfil}:${chave}`))),
 salvarRecursoLocal:vi.fn(async(perfil:string,chave:string,valor:unknown)=>{dados.set(`${perfil}:${chave}`,structuredClone(valor));}),
}));
let elemento:HTMLDivElement;
let raiz:ReturnType<typeof createRoot>;
beforeEach(()=>{
 Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});dados.clear();vi.clearAllMocks();
 elemento=document.createElement('div');document.body.append(elemento);raiz=createRoot(elemento);
});
afterEach(async()=>{await act(async()=>raiz.unmount());elemento.remove();vi.restoreAllMocks();});
const botao=(texto:string)=>[...elemento.querySelectorAll('button')].find(b=>b.textContent?.includes(texto))!;
const alternativas=()=>[...elemento.querySelectorAll<HTMLButtonElement>('.alternativa')];
const montar=async(perfilId='perfil-a',aoAbrir=vi.fn(),aoPular=vi.fn())=>{await act(async()=>raiz.render(<Diagnostico perfilId={perfilId} aoAbrir={aoAbrir} aoPular={aoPular}/>));return {aoAbrir,aoPular};};

it('permite pular ou começar do zero sem responder',async()=>{
 const {aoAbrir,aoPular}=await montar();
 expect(botao('Próxima questão').disabled).toBe(true);
 await act(async()=>botao('Pular diagnóstico').click());expect(aoPular).toHaveBeenCalledOnce();
 await act(async()=>botao('Começar do zero').click());expect(aoAbrir.mock.calls[0][0].id).toBe('html-primeira-pagina');
});
it('trava a primeira alternativa inclusive índice zero, sem revelar acerto antes do envio',async()=>{
 await montar();
 await act(async()=>alternativas()[0].click());
 expect(alternativas()[0].getAttribute('aria-pressed')).toBe('true');
 expect(alternativas().every(b=>b.disabled)).toBe(true);
 await act(async()=>alternativas()[1].click());
 expect(alternativas()[0].getAttribute('aria-pressed')).toBe('true');
 expect(elemento.querySelector('.correta,.incorreta')).toBeNull();
 expect(elemento.textContent).not.toContain(questoesDiagnostico[0].feedback[0]);
 expect(elemento.textContent).not.toContain('Pontuação:');
 expect(elemento.querySelector('[role="status"]')?.textContent).toContain('não pode ser alterada');
});
it('analisa somente no envio das cinco escolhas e mostra os erros e o raciocínio correto',async()=>{
 const {aoAbrir}=await montar();
 for(let i=0;i<5;i++){
  const escolha=i===1?1:questoesDiagnostico[i].correta;
  await act(async()=>alternativas()[escolha].click());
  expect(elemento.textContent).not.toContain(questoesDiagnostico[i].feedback[escolha]);
  expect(elemento.textContent).not.toContain('Pontuação:');
  if(i<4)await act(async()=>botao('Próxima questão').click());
 }
 expect(botao('Enviar diagnóstico').disabled).toBe(false);
 await act(async()=>botao('Enviar diagnóstico').click());
 expect(elemento.textContent).toContain('4 de 5');expect(elemento.textContent).toContain('80 / 100');
 expect(elemento.textContent).toContain('CSS: forma e layout');
 expect(elemento.querySelectorAll('.correcao-questao')).toHaveLength(5);
 expect(elemento.querySelector('.correcao-questao.incorreta')?.textContent).toContain('O que deveria ter marcado: Verdadeiro');
 expect(elemento.querySelector('.correcao-questao.incorreta')?.textContent).toContain(questoesDiagnostico[1].feedback[0]);
 expect(botao('Refazer diagnóstico')).toBeUndefined();
 await act(async()=>botao('Abrir aula sugerida').click());expect(aoAbrir.mock.calls[0][0].id).toBe('css-box-model');
 expect(botao('Explorar outras trilhas')).toBeTruthy();
});
it('restaura a primeira escolha travada ao reabrir e preserva a avaliação enviada',async()=>{
 await montar();
 await act(async()=>alternativas()[0].click());
 await act(async()=>raiz.unmount());raiz=createRoot(elemento);
 await montar();
 expect(alternativas()[0].getAttribute('aria-pressed')).toBe('true');
 expect(alternativas().every(b=>b.disabled)).toBe(true);
 await act(async()=>botao('Próxima questão').click());
 for(let i=1;i<5;i++){
  await act(async()=>alternativas()[questoesDiagnostico[i].correta].click());
  if(i<4)await act(async()=>botao('Próxima questão').click());
 }
 await act(async()=>botao('Enviar diagnóstico').click());
 await act(async()=>raiz.unmount());raiz=createRoot(elemento);
 await montar();
 expect(elemento.textContent).toContain('100 / 100');
 expect(alternativas()).toHaveLength(0);
});
it('não exibe nem aplica dados do perfil anterior quando uma leitura atrasada termina',async()=>{
 let resolver!:(valor:unknown)=>void;
 vi.mocked(lerRecursoLocal).mockImplementationOnce(()=>new Promise(r=>{resolver=r;}));
 await montar('perfil-antigo');
 expect(elemento.textContent).toContain('Recuperando seu diagnóstico');
 await montar('perfil-novo');
 expect(elemento.textContent).toContain('Questão 1 de 5');
 await act(async()=>resolver({versao:1,respostas:[0,0,1,0,0],indice:4,enviada:true}));
 expect(elemento.textContent).not.toContain('100 / 100');
 expect(elemento.textContent).toContain('Questão 1 de 5');
 await act(async()=>alternativas()[0].click());
 expect(vi.mocked(salvarRecursoLocal).mock.calls.at(-1)?.[0]).toBe('perfil-novo');
});
it('aguarda a gravação pendente antes de sair pelo botão de pular',async()=>{
 let resolver!:()=>void;
 vi.mocked(salvarRecursoLocal).mockImplementationOnce(()=>new Promise<void>(r=>{resolver=r;}));
 const {aoPular}=await montar();
 await act(async()=>alternativas()[0].click());
 await act(async()=>botao('Pular diagnóstico').click());
 expect(aoPular).not.toHaveBeenCalled();
 await act(async()=>resolver());
 expect(aoPular).toHaveBeenCalledOnce();
});
it('preserva a escolha e impede avançar se o dispositivo falhar ao salvar',async()=>{
 vi.mocked(salvarRecursoLocal).mockRejectedValueOnce(new Error('Sem espaço'));
 await montar();
 await act(async()=>alternativas()[0].click());
 expect(elemento.querySelector('[role="alert"]')?.textContent).toContain('Não foi possível salvar');
 expect(alternativas()[0].getAttribute('aria-pressed')).toBe('true');
 expect(alternativas().every(b=>b.disabled)).toBe(true);
 expect(botao('Próxima questão').disabled).toBe(true);
 await act(async()=>botao('Tentar salvar novamente').click());
 expect(botao('Próxima questão').disabled).toBe(false);
 await act(async()=>botao('Próxima questão').click());
 expect(elemento.textContent).toContain('Questão 2 de 5');
});
it('sugere aplicação de funções quando todas estão corretas',()=>{expect(recomendarAula(questoesDiagnostico.map(q=>q.correta)).id).toBe('js-funcoes');});
