/** Runtime oficial fixado; arquivos públicos apenas, sem credenciais. */
import {mkdir,writeFile,stat,readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const versao='0.29.3';
const destino=new URL('../aplicativos/web/public/pyodide/',import.meta.url);
await mkdir(destino,{recursive:true});
const nomes=['pyodide.js','pyodide.mjs','pyodide.asm.js','pyodide.asm.wasm','python_stdlib.zip','pyodide-lock.json'];
const inventario=[];
for(const nome of nomes){
 const caminho=new URL(nome,destino);
 execFileSync('curl',['--fail','--location','--silent','--show-error','--retry','2',`https://cdn.jsdelivr.net/pyodide/v${versao}/full/${nome}`,'--output',fileURLToPath(caminho)],{stdio:'inherit'});
 const dados=await readFile(caminho);
 inventario.push({nome,bytes:dados.length,sha256:createHash('sha256').update(dados).digest('hex')});
 console.log(`Python local: ${nome} (${(await stat(caminho)).size} bytes)`);
}
await writeFile(new URL('runtime.json',destino),JSON.stringify({versao,origem:'https://cdn.jsdelivr.net/pyodide/',arquivos:inventario},null,2));
// A distribuição acompanha as licenças, inclusive no APK local.
const licencas = new URL('../aplicativos/web/public/licencas/', import.meta.url);
await mkdir(licencas, {recursive:true});
for (const [nome,origem] of [
 ['Pyodide-MPL-2.0.txt',`https://raw.githubusercontent.com/pyodide/pyodide/${versao}/LICENSE`],
 ['Python-3.13.2.txt','https://raw.githubusercontent.com/python/cpython/v3.13.2/LICENSE']
]) execFileSync('curl',['--fail','--location','--silent','--show-error','--retry','2',origem,'--output',fileURLToPath(new URL(nome,licencas))],{stdio:'inherit'});
