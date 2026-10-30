import {test,expect,type Page,type APIRequestContext} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
interface Sessao{token:string;usuario:{id:string;nome:string;email:string;papel:string}}
let adminEmail:string,senhaAdmin:string;
const senhaAluno='Aluno-QA-'+randomUUID();
test.beforeAll(async({},info)=>{
 const base=String(info.project.use.baseURL||'http://127.0.0.1:4173');const db=process.env.DATABASE_URL||'sqlite:////tmp/flow-050-e2e.db';
 test.skip(!['127.0.0.1','localhost'].includes(new URL(base).hostname)||!db.startsWith('sqlite:'),'As fixtures administrativas só são criadas no banco SQLite local de teste.');
 adminEmail='admin-'+randomUUID()+'@example.com';senhaAdmin='QA-Privado-'+randomUUID();
 execFileSync('python',['-c',`import json,sys\nfrom servidor.banco import criar_banco\nfrom servidor.modelos import Usuario\nfrom servidor.seguranca import hash_senha\nd=json.load(sys.stdin)\nm,f=criar_banco(d['banco'])\nwith f() as s:\n s.add(Usuario(nome='Gestão QA',email=d['email'],senha_hash=hash_senha(d['senha']),papel='admin'));s.commit()\nm.dispose()`],{input:JSON.stringify({banco:db,email:adminEmail,senha:senhaAdmin}),stdio:['pipe','pipe','pipe']});
});
// Contas de cenário são fixtures locais; cadastro público é coberto por fluxo.spec.
// Isso evita que testes independentes disparem o limite real de login/cadastro em CI rápida.
async function aluno(){
 const nome='Estudante '+randomUUID().slice(0,8),email=randomUUID()+'@example.com',banco=process.env.DATABASE_URL||'sqlite:////tmp/flow-050-e2e.db';
 const saida=execFileSync('python',['-c',`import json,sys\nfrom servidor.banco import criar_banco\nfrom servidor.modelos import Usuario\nfrom servidor.seguranca import hash_senha,criar_sessao\nd=json.load(sys.stdin)\nm,f=criar_banco(d['banco'])\nwith f() as s:\n u=Usuario(nome=d['nome'],email=d['email'],senha_hash=hash_senha(d['senha']),papel='aluno');s.add(u);s.flush();t=criar_sessao(s,u,168);s.commit();print(json.dumps({'token':t,'usuario':{'id':u.id,'nome':u.nome,'email':u.email,'papel':u.papel}}))\nm.dispose()`],{input:JSON.stringify({banco,nome,email,senha:senhaAluno}),stdio:['pipe','pipe','pipe']});
 return JSON.parse(saida.toString()) as Sessao;
}
async function administrador(request:APIRequestContext){const r=await request.post('/api/sessao',{data:{email:adminEmail,senha:senhaAdmin}});expect(r.ok()).toBe(true);return await r.json() as Sessao;}
async function abrir(page:Page,sessao:Sessao,pagina='inicio'){
 await page.addInitScript(({sessao,pagina})=>{if(window!==window.top)return;sessionStorage.setItem('flow-sessao',JSON.stringify(sessao));localStorage.setItem('flow-nome',sessao.usuario.nome);localStorage.setItem('flow-pagina',pagina);localStorage.setItem('flow-aula','html-primeira-pagina');},{sessao,pagina});
 await page.goto('/');await expect(page.getByRole('region',{name:'Verificação de entrada'})).toHaveCount(0);
}
async function adminUsuarios(page:Page,conta:Sessao,nome:string){await abrir(page,conta,'admin');await page.getByRole('tab',{name:'Usuários',exact:true}).click();await page.getByRole('button',{name:'Gerenciar usuário '+nome,exact:true}).click();}
async function escolher(page:Page,rotulo:string,opcao:string){await page.getByRole('combobox',{name:new RegExp(rotulo)}).click();await page.getByRole('option',{name:opcao,exact:true}).click();}

test('opinião e leitura chegam ao servidor e à administração; ranking protege dados privados',async({page,request,browser})=>{
 const s=await aluno(),a=await administrador(request);await page.clock.install();await abrir(page,s,'aula');await expect(page.getByRole('heading',{name:'Avalie esta aula',exact:true})).toBeVisible();
 await page.clock.runFor(21000);
 await expect.poll(async()=>{const r=await request.get('/api/comunidade/'+s.usuario.id,{headers:{Authorization:'Bearer '+s.token}});return (await r.json()).leituras;}).toBe(1);
 await page.getByRole('button',{name:'5 estrelas',exact:true}).click();const comentario='A explicação guiada ajudou a entender a estrutura. '+s.usuario.nome;await page.getByLabel('Conte como foi sua experiência').fill(comentario);await page.getByRole('button',{name:'Enviar opinião da aula',exact:true}).click();await expect(page.locator('.opiniao-aula-sucesso')).toContainText('enviada à administração');
 const menu=page.getByRole('button',{name:'Abrir navegação',exact:true});if(await menu.isVisible())await menu.click();await page.getByRole('navigation',{name:'Navegação principal'}).getByRole('button',{name:'Comunidade e ranking',exact:true}).click();
 await page.getByLabel('Buscar participante').fill(s.usuario.nome);await page.getByRole('button',{name:'Buscar',exact:true}).click();await page.getByRole('button',{name:'Ver perfil de '+s.usuario.nome,exact:true}).click();await expect(page.locator('.membro-perfil')).toContainText('Leituras registradas');await expect(page.locator('.membro-perfil')).not.toContainText(s.usuario.email);
 const pub=await request.get('/api/comunidade');expect(pub.status()).toBe(401);
 const ctx=await browser.newContext();try{const p=await ctx.newPage();await abrir(p,a,'admin');await p.getByRole('tab',{name:'Opiniões das aulas',exact:true}).click();await expect(p.locator('.admin-opinioes-lista')).toContainText(comentario);await expect(p.getByLabel('5 de 5 estrelas').first()).toBeVisible();}finally{await ctx.close();}
});

test('banimento revoga sessão ativa, informa motivo no login e reativar exige nova sessão',async({page,request,browser})=>{
 const s=await aluno(),a=await administrador(request);await page.clock.install();await abrir(page,s);const ctx=await browser.newContext();
 try{const p=await ctx.newPage();await adminUsuarios(p,a,s.usuario.nome);await escolher(p,'Nova situação','Banida · bloquear acesso');await p.getByLabel('Motivo da ação').fill('Restrição temporária de teste da administração');await p.getByRole('button',{name:'Salvar situação da conta',exact:true}).click();
 await expect.poll(async()=>(await request.get('/api/eu',{headers:{Authorization:'Bearer '+s.token}})).status()).toBe(403);
 await page.bringToFront();await page.clock.runFor(21000);await expect.poll(()=>page.evaluate(()=>sessionStorage.getItem('flow-sessao')===null)).toBe(true);await expect(page.locator('.aviso-global')).toContainText('Restrição temporária');
 await page.getByRole('button',{name:'Entrar',exact:true}).click();const dialogo=page.getByRole('dialog');await dialogo.getByLabel('E-mail',{exact:true}).fill(s.usuario.email);await dialogo.getByLabel('Senha',{exact:true}).fill(senhaAluno);await dialogo.getByRole('button',{name:'Entrar na minha conta',exact:true}).click();await expect(dialogo.locator('.erro')).toContainText('Restrição temporária');
 await escolher(p,'Nova situação','Ativa · permitir entrada');await p.getByLabel('Motivo da ação').fill('Restrição revisada pela administração');await p.getByRole('button',{name:'Salvar situação da conta',exact:true}).click();await expect.poll(async()=>(await request.get('/api/admin/usuarios/'+s.usuario.id,{headers:{Authorization:'Bearer '+a.token}})).json().then(u=>u.estado)).toBe('ativo');
 expect((await request.get('/api/eu',{headers:{Authorization:'Bearer '+s.token}})).status()).toBe(401);
 await dialogo.getByRole('button',{name:'Entrar na minha conta',exact:true}).click();await expect(dialogo).toHaveCount(0);await expect.poll(()=>page.evaluate(()=>JSON.parse(sessionStorage.getItem('flow-sessao')||'null')?.usuario.id)).toBe(s.usuario.id);
 }finally{await ctx.close();}
});

test('exclusão confirmada remove usuário e invalida acesso; administrador não pode excluir a si mesmo',async({page,request})=>{
 const s=await aluno(),a=await administrador(request);await adminUsuarios(page,a,s.usuario.nome);await page.getByRole('button',{name:'Quero apagar esta conta',exact:true}).click();await page.getByLabel('Motivo da ação').fill('Exclusão da conta temporária de teste');await page.getByLabel('Digite o e-mail para confirmar a exclusão').fill(s.usuario.email);await page.getByRole('button',{name:'Apagar usuário definitivamente',exact:true}).click();
 await expect.poll(async()=>(await request.get('/api/admin/usuarios/'+s.usuario.id,{headers:{Authorization:'Bearer '+a.token}})).status()).toBe(404);expect((await request.get('/api/eu',{headers:{Authorization:'Bearer '+s.token}})).status()).toBe(401);
 const propria=await request.delete('/api/admin/usuarios/'+a.usuario.id,{headers:{Authorization:'Bearer '+a.token},data:{motivo:'Tentativa protegida no teste',confirmacao:a.usuario.email}});expect(propria.status()).toBe(409);
});

test('entrada visual autentica com etapas reais e abre o perfil sem repetir formulário',async({page,request})=>{
 const s=await aluno();await page.route('**/api/eu',async rota=>{await new Promise(r=>setTimeout(r,250));await rota.continue();});await page.goto('/');await expect(page.getByRole('heading',{level:1})).toContainText('Sua ideia.');await page.getByRole('button',{name:'Entrar na minha conta',exact:true}).click();const d=page.getByRole('dialog');await d.getByLabel('E-mail',{exact:true}).fill(s.usuario.email);await d.getByLabel('Senha',{exact:true}).fill(senhaAluno);await d.getByRole('button',{name:'Entrar na minha conta',exact:true}).click();await expect(page.getByRole('region',{name:'Verificação de entrada'}).first()).toBeVisible();await expect(d).toHaveCount(0);await expect(page.getByRole('heading',{name:/Seu próximo passo/})).toBeVisible();expect(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('flow-sessao')||'null')?.usuario.id)).toBe(s.usuario.id);
});
