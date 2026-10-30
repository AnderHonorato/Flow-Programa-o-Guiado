import { chromium } from '@playwright/test';
import axe from 'axe-core';
import { mkdir, writeFile } from 'node:fs/promises';
const destino=new URL('../../docs/evidencias/jarvis-0.4.0/',import.meta.url).pathname;await mkdir(destino,{recursive:true});const browser=await chromium.launch({headless:true});const resultados=[];
for(const [width,height] of [[320,740],[390,844],[768,1000],[1440,1000],[740,360]]){
 for(const tema of ['claro','escuro']){
 const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});const page=await context.newPage();const erros=[];page.on('pageerror',e=>erros.push(e.message));
 await page.addInitScript(({tema})=>{if(window!==window.top)return;localStorage.setItem('flow-nome','Interação QA');localStorage.setItem('flow-pagina','aula');localStorage.setItem('flow-aula','html-primeira-pagina');localStorage.setItem('flow-tema',tema);
 class Fala{constructor(t){this.text=t;}}window.SpeechSynthesisUtterance=Fala;let atual;window.flowFalas=[];Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{getVoices:()=>[{voiceURI:'br',name:'Brasil QA',lang:'pt-BR',localService:true},{voiceURI:'en',name:'English QA',lang:'en-US',localService:true}],addEventListener(){},removeEventListener(){},cancel(){atual=null;},pause(){},resume(){atual?.onresume?.();},speak(f){atual=f;window.flowFalas.push(f);setTimeout(()=>atual===f&&f.onstart?.(),25);}}});},{tema});
 await page.goto(process.env.FLOW_QA_URL||'http://127.0.0.1:4173');await page.getByRole('button',{name:'Ouvir aula',exact:true}).click();await page.locator('.jarvis-dock--falando').waitFor();
 const indicador=await page.locator('.jarvis-fala-status').innerText();await page.getByRole('button',{name:'Pausar',exact:true}).click();const vibraPausado=await page.locator('.jarvis-dock--falando').count();await page.getByRole('button',{name:'Parar',exact:true}).click();
 if(!await page.getByRole('button',{name:'Explorar termo',exact:true}).isVisible())await page.locator('.jarvis-ativador').click();
 await page.getByRole('button',{name:'Uma piada',exact:true}).click();await page.getByRole('button',{name:'Fingir braveza',exact:true}).click();await page.getByRole('button',{name:'Explorar termo',exact:true}).click();await page.getByLabel('Qual termo vamos explorar?',{exact:true}).fill('variável');await page.getByRole('button',{name:'Explicar termo',exact:true}).click();await page.getByRole('button',{name:'Ouvir explicação',exact:true}).click();await page.locator('.jarvis-dock--falando').waitFor();
 await page.evaluate(axe.source);const audit=await page.evaluate(async()=>window.axe.run(document,{iframes:false,runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}}));
 const layout=await page.evaluate(()=>{const d=document.querySelector('.jarvis-dock'),b=document.querySelector('.jarvis-balao'),r=b.getBoundingClientRect();return{overflow:document.documentElement.scrollWidth>innerWidth,balao:{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom},pequenos:[...d.querySelectorAll('button')].filter(e=>e.getBoundingClientRect().width<44||e.getBoundingClientRect().height<44).map(e=>e.innerText)};});
 await page.screenshot({path:`${destino}/${width}-${tema}-termo.png`});
 await page.keyboard.press('Escape');await page.getByRole('combobox',{name:/Idioma da voz/}).click();await page.getByRole('option',{name:'Inglês · alternativa',exact:true}).click();await page.getByRole('button',{name:'Ouvir aula',exact:true}).click();
 const ingles=await page.evaluate(()=>window.flowFalas.at(-1)?.lang);
 resultados.push({width,height,tema,indicador,vibraPausado,ingles,layout,violacoes:audit.violations.map(v=>({id:v.id,nos:v.nodes.map(n=>({alvo:n.target,resumo:n.failureSummary}))})),erros});await context.close();
 }
}
await browser.close();await writeFile(destino+'/interface.json',JSON.stringify(resultados,null,2));console.log(JSON.stringify(resultados));
