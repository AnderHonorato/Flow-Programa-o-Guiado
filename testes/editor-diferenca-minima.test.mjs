import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const fonte = await readFile(new URL('../aplicativos/web/src/laboratorios/diferencaMinima.ts', import.meta.url), 'utf8');
const codigo = ts.transpileModule(fonte, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { diferencaMinima } = await import('data:text/javascript,' + encodeURIComponent(codigo));

for (const [anterior, proximo] of [
  ['abc', 'abXc'],
  ['abc', 'ac'],
  ['abc', 'XYZ'],
  ['', 'novo'],
  ['texto', ''],
  ['const a = 1;\nconst b = 2;', 'const a = 1;\nconst b = 3;'],
  ['á😀fim', 'á😀 novo fim'],
  ['igual', 'igual']
]) {
  test('sincronização incremental preserva o resultado: ' + JSON.stringify([anterior, proximo]), () => {
    const { from, to, insert } = diferencaMinima(anterior, proximo);
    assert.equal(anterior.slice(0, from) + insert + anterior.slice(to), proximo);
    assert.ok(from >= 0 && to >= from && to <= anterior.length);
  });
}

test('inserção no meio não substitui prefixo nem sufixo', () => {
  assert.deepEqual(diferencaMinima('linha 1\nlinha 3', 'linha 1\nlinha 2\nlinha 3'), { from: 8, to: 8, insert: 'linha 2\n' });
});
