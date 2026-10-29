import {test,expect,type Page} from '@playwright/test';
async function iniciar(page:Page){await page.goto('/');await page.getByLabel('Como podemos chamar você?').fill('Perfil QA');await page.getByRole('button',{name:'Começar no meu dispositivo'}).click();await expect(page.getByRole('heading',{name:/Seu próximo passo/})).toBeVisible();}
async function perfil(page:Page){const atalho=page.getByRole('navigation',{name:'Atalhos do aplicativo'});if(await atalho.isVisible())await atalho.getByRole('button',{name:'Evolução',exact:true}).click();else await page.locator('.barra-lateral').getByRole('button',{name:/Perfil QA Perfil local/}).click();await expect(page.getByRole('heading',{name:'Um perfil com a sua cara.'})).toBeVisible();}
async function fotoTeste(page:Page){return page.evaluate(()=>{const c=document.createElement('canvas');c.width=800;c.height=400;const x=c.getContext('2d')!;x.fillStyle='#e73e50';x.fillRect(0,0,400,400);x.fillStyle='#176ee1';x.fillRect(400,0,400,400);return c.toDataURL('image/png').split(',')[1];});}
test('escolhe desenhos de três estilos, confirma e preserva o avatar ao reabrir',async({page})=>{
 await iniciar(page);await perfil(page);
 await page.getByRole('button',{name:'Pixel',exact:true}).click();await page.getByRole('button',{name:'Escolher avatar Mago Pixel',exact:true}).click();
 await expect(page.locator('.cabecalho-pagina .evo-avatar .perfil-desenho')).toHaveCount(0);
 await page.getByRole('button',{name:'Confirmar avatar',exact:true}).click();await expect(page.locator('.cabecalho-pagina .evo-avatar')).toHaveAttribute('title','Mago Pixel');
 await page.reload();await expect(page.locator('.cabecalho-pagina .evo-avatar')).toHaveAttribute('title','Mago Pixel');
 await page.getByRole('button',{name:'Games',exact:true}).click();await page.getByRole('button',{name:'Escolher avatar Ninja da Névoa',exact:true}).click();
 await page.getByRole('button',{name:'Cancelar alterações',exact:true}).click();await expect(page.locator('.cabecalho-pagina .evo-avatar')).toHaveAttribute('title','Mago Pixel');
 await page.getByRole('button',{name:'Cartoon',exact:true}).click();await expect(page.getByRole('button',{name:'Escolher avatar Coruja Lume',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Conquistados',exact:true}).click();await expect(page.getByRole('button',{name:'Luminar: bloqueado, requer 2000 XP',exact:true})).toBeDisabled();
});
test('foto recortada tem pixels reais, persiste e pode ser substituída sem mudar XP',async({page})=>{
 await iniciar(page);await perfil(page);const bytes=Buffer.from(await fotoTeste(page),'base64');
 await page.getByLabel('Escolher foto de perfil',{exact:true}).setInputFiles({name:'perfil.png',mimeType:'image/png',buffer:bytes});
 await page.getByRole('slider',{name:'Posição horizontal da foto',exact:true}).fill('100');
 await expect.poll(()=>page.locator('.perfil-avatar-retrato canvas').evaluate((c:HTMLCanvasElement)=>Array.from(c.getContext('2d')!.getImageData(190,190,1,1).data))).toEqual([23,110,225,255]);
 await page.getByRole('button',{name:'Confirmar foto de perfil',exact:true}).click();
 await expect(page.locator('.cabecalho-pagina img.evo-foto-perfil')).toBeVisible();
 const imagem=await page.locator('.cabecalho-pagina img.evo-foto-perfil').getAttribute('src');expect(imagem).toMatch(/^data:image\/png;base64,/);expect(imagem!.length).toBeLessThanOrEqual(240000);
 await page.reload();await expect(page.locator('.cabecalho-pagina img.evo-foto-perfil')).toHaveAttribute('src',imagem!);
 await page.getByLabel('Escolher foto de perfil',{exact:true}).setInputFiles({name:'falso.png',mimeType:'image/png',buffer:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>')});
 await expect(page.locator('.perfil-avatar-erro')).toContainText('não é uma imagem válida');
 await expect(page.locator('.cabecalho-pagina img.evo-foto-perfil')).toHaveAttribute('src',imagem!);
 await page.getByRole('button',{name:'Trocar foto por um avatar',exact:true}).click();await page.getByRole('button',{name:'Confirmar avatar',exact:true}).click();
 await expect(page.locator('.cabecalho-pagina img.evo-foto-perfil')).toHaveCount(0);await expect(page.locator('.cabecalho-pagina .evo-avatar')).toHaveAttribute('title','Raposa Aurora');
 await expect(page.locator('.lista-dados').filter({hasText:'Experiência conquistada'})).toContainText('0 XP');
});
test('novo emblema revela descrição e aquisição; ficha e replay preservam a data',async({page})=>{
 await iniciar(page);await page.getByRole('button',{name:'Continuar aprendendo',exact:true}).click();await page.getByRole('tab',{name:'Fixar',exact:true}).click();
 const q=page.locator('fieldset.questao');await q.nth(0).getByRole('button',{name:'A h1',exact:true}).click();await q.nth(1).getByRole('button',{name:'A h1 e p são filhos de body.',exact:true}).click();await page.getByRole('button',{name:'Enviar avaliação',exact:true}).click();
 const celebracao=page.getByRole('complementary',{name:'Recompensa de evolução',exact:true});await expect(celebracao.getByRole('heading',{name:'Primeira conexão',exact:true})).toBeVisible();await expect(celebracao).toContainText('Acertar uma questão após enviar a avaliação.');
 const data=await celebracao.locator('time').getAttribute('datetime');expect(Number.isFinite(Date.parse(data!))).toBe(true);
 await celebracao.getByRole('button',{name:'Ver coleção',exact:true}).click();await page.getByRole('button',{name:'Ver detalhes de Primeira conexão',exact:true}).click();
 const ficha=page.getByRole('dialog',{name:'Primeira conexão',exact:true});await expect(ficha.locator('time')).toHaveAttribute('datetime',data!);await ficha.getByRole('button',{name:'Rever animação',exact:true}).click();await expect(ficha.locator('time')).toHaveAttribute('datetime',data!);
 await page.keyboard.press('Escape');await expect(ficha).toHaveCount(0);await page.reload();await expect(page.locator('.recompensa-celebracao')).toHaveCount(0);await page.getByRole('button',{name:'Ver detalhes de Primeira conexão',exact:true}).click();await expect(page.getByRole('dialog').locator('time')).toHaveAttribute('datetime',data!);
});
