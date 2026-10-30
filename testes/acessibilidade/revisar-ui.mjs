import { chromium } from '@playwright/test';
import axe from 'axe-core';
import { writeFile, mkdir } from 'node:fs/promises';
const destino = new URL('./evidencias/', import.meta.url);
await mkdir(destino,{recursive:true});
const browser = await chromium.launch({headless:true});
const resultado={data:new Date().toISOString(),escopo:'Interface principal. Iframes de código isolados sem injeção de scripts de auditoria.',base:process.env.FLOW_URL||'http://127.0.0.1:4173',telas:[],interacoes:[],erros:[]};
async function analisarAcessibilidade(page){
 await page.evaluate(axe.source);
 return page.evaluate(async()=>window.axe.run(document,{iframes:false,runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}}));
}
async function preparar(page){
 const proxima=page.getByRole('button',{name:/Próxima etapa/});
 if(await proxima.isVisible()){await proxima.click();await proxima.click();await page.getByLabel('Entendi o objetivo e sei qual resultado vou procurar.').check();await page.getByRole('button',{name:/Começar a construir/}).click();}
}
async function abrir(viewport,pagina='inicio',tema='claro'){
 const context=await browser.newContext({viewport,reducedMotion:'reduce'});
 await context.addInitScript(({pagina,tema})=>{if(window!==window.top)return;localStorage.setItem('flow-nome','Revisão QA');localStorage.setItem('flow-pagina',pagina);localStorage.setItem('flow-aula','html-primeira-pagina');localStorage.setItem('flow-tema',tema);},{pagina,tema});
 const page=await context.newPage();page.on('pageerror',e=>resultado.erros.push(e.message));
 await page.goto(resultado.base);await page.waitForSelector('h1');await page.waitForTimeout(500);return {context,page};
}
for(const [nome,viewport] of [['desktop',{width:1440,height:1000}],['celular',{width:390,height:844}]]){
 for(const tema of ['claro','escuro']){
  for(const pagina of ['inicio','trilhas','aula','perfil']){
   const {context,page}=await abrir(viewport,pagina,tema);const id=`${nome}-${tema}-${pagina}`;
   const axe=await analisarAcessibilidade(page);
   const overflow=await page.evaluate(()=>({largura:innerWidth,documento:document.documentElement.scrollWidth,elementos:[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&(r.right>innerWidth+1||r.left < -1)&&getComputedStyle(e).position!=='fixed';}).slice(0,8).map(e=>({tag:e.tagName,classe:e.className,texto:e.textContent?.slice(0,70)}))}));
   resultado.telas.push({id,overflow,violacoes:axe.violations.map(v=>({id:v.id,impacto:v.impact,descricao:v.description,ajuda:v.helpUrl,nos:v.nodes.map(n=>({alvo:n.target,html:n.html,resumo:n.failureSummary}))}))});
   await page.screenshot({path:new URL(`${id}.png`,destino).pathname,fullPage:true});console.log(id,axe.violations.map(v=>v.id),overflow.documento);
   if(pagina==='aula'){
    await page.getByRole('tab',{name:'Laboratório',exact:true}).click();await preparar(page);
    await page.getByRole('heading',{name:'Seu laboratório'}).waitFor();
    const labAxe=await analisarAcessibilidade(page);
    const labOverflow=await page.evaluate(()=>({largura:innerWidth,documento:document.documentElement.scrollWidth}));
    resultado.telas.push({id:`${nome}-${tema}-laboratorio`,overflow:labOverflow,violacoes:labAxe.violations.map(v=>({id:v.id,impacto:v.impact,nos:v.nodes.map(n=>({alvo:n.target,resumo:n.failureSummary}))}))});
    await page.screenshot({path:new URL(`${nome}-${tema}-laboratorio.png`,destino).pathname,fullPage:true});console.log(`${nome}-${tema}-laboratorio`,labAxe.violations.map(v=>v.id),labOverflow.documento);
   }
   await context.close();
  }
 }
}
// Navegação por teclado e modalidade: observação do comportamento real.
{
 const {context,page}=await abrir({width:1440,height:1000});
 await page.getByRole('button',{name:'Entrar',exact:true}).click();
 const focoInicial=await page.evaluate(()=>({html:document.activeElement?.outerHTML,noModal:!!document.activeElement?.closest('[role=dialog]')}));
 await page.keyboard.press('Escape');const escapeFecha=await page.getByRole('dialog').count()===0;
 if(escapeFecha)await page.getByRole('button',{name:'Entrar',exact:true}).click();
 const focos=[];for(let i=0;i<15;i++){await page.keyboard.press('Tab');focos.push(await page.evaluate(()=>({texto:document.activeElement?.textContent?.slice(0,80),tag:document.activeElement?.tagName,noModal:!!document.activeElement?.closest('[role=dialog]')})));}
 const axe=await analisarAcessibilidade(page);
 resultado.interacoes.push({id:'modal-conta-teclado',focoInicial,escapeFecha,focos,axe:axe.violations.map(v=>({id:v.id,impacto:v.impact,nos:v.nodes.map(n=>({alvo:n.target,resumo:n.failureSummary}))}))});
 await page.screenshot({path:new URL('desktop-conta.png',destino).pathname,fullPage:true});await context.close();
}
{
 const {context,page}=await abrir({width:390,height:844});
 await page.getByRole('button',{name:'Abrir navegação'}).click();
 const antes=await page.locator('.barra-lateral').getAttribute('class');await page.keyboard.press('Escape');const depois=await page.locator('.barra-lateral').getAttribute('class');
 resultado.interacoes.push({id:'menu-celular',classeAntes:antes,classeDepoisEscape:depois,botao:await page.getByRole('button',{name:'Abrir navegação'}).evaluate(e=>({expanded:e.getAttribute('aria-expanded'),controls:e.getAttribute('aria-controls')}))});
 await page.screenshot({path:new URL('celular-menu.png',destino).pathname,fullPage:true});await context.close();
}
{
 const {context,page}=await abrir({width:1440,height:1000},'aula');
 const abas=page.getByRole('tab');await abas.first().focus();await page.keyboard.press('ArrowRight');
 resultado.interacoes.push({id:'abas-aula',aposSeta:await page.evaluate(()=>({ativo:document.activeElement?.textContent,selected:document.activeElement?.getAttribute('aria-selected')})),atributos:await abas.evaluateAll(es=>es.map(e=>({nome:e.textContent,tabindex:e.getAttribute('tabindex'),controls:e.getAttribute('aria-controls'),id:e.id}))),paineis:await page.getByRole('tabpanel').count()});
 await abas.filter({hasText:'Fixar'}).click();await page.screenshot({path:new URL('desktop-fixar.png',destino).pathname,fullPage:true});
 await abas.filter({hasText:'Laboratório'}).click();await preparar(page);await page.screenshot({path:new URL('desktop-laboratorio.png',destino).pathname,fullPage:true});
 const axe=await analisarAcessibilidade(page);resultado.interacoes.push({id:'laboratorio-axe',violacoes:axe.violations.map(v=>({id:v.id,impacto:v.impact,nos:v.nodes.map(n=>({alvo:n.target,resumo:n.failureSummary}))}))});
 await context.setOffline(true);await page.getByRole('button',{name:'Enviar desafio'}).click();
 await page.waitForTimeout(400);resultado.interacoes.push({id:'estado-offline',texto:await page.locator('body').innerText().then(s=>s.slice(-3000))});await context.close();
}
await writeFile(new URL('resultado-ui.json',destino),JSON.stringify(resultado,null,2));await browser.close();console.log('Fim da auditoria.');
