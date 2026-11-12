import test from 'node:test';
import assert from 'node:assert/strict';
import { interpretarBadging, interpretarCertificado, avaliarAtualizacao } from '../scripts/android-preflight-atualizacao.mjs';

const anterior = { pacote: 'br.com.ander.flow', versionCode: 6, versionName: '0.6.0', minSdk: 23, abis: ['arm64-v8a'] };
const novo = { ...anterior, versionCode: 7, versionName: '0.6.1' };
const cert = 'a'.repeat(64);
test('extrai metadados reais do aapt e certificado do apksigner', () => {
  const texto = "package: name='br.com.ander.flow' versionCode='7' versionName='0.6.1'\nsdkVersion:'23'\nnative-code: 'arm64-v8a' 'armeabi-v7a'\n";
  assert.deepEqual(interpretarBadging(texto), { ...novo, abis: ['arm64-v8a', 'armeabi-v7a'] });
  assert.equal(interpretarCertificado('Signer #1 certificate SHA-256 digest: ' + cert.toUpperCase()), cert);
});
test('aprova atualização de mesmo pacote, assinatura e versão crescente', () => {
  assert.deepEqual(avaliarAtualizacao(anterior, novo, cert, cert).problemas, []);
});
test('bloqueia assinatura diferente antes de qualquer instalação', () => {
  assert.deepEqual(avaliarAtualizacao(anterior, novo, cert, 'b'.repeat(64)).problemas, ['ASSINATURA_DIFERENTE']);
});
test('bloqueia versionCode igual ou menor', () => {
  assert.ok(avaliarAtualizacao(anterior, { ...novo, versionCode: 6 }, cert, cert).problemas.includes('VERSION_CODE_NAO_CRESCENTE'));
  assert.ok(avaliarAtualizacao(anterior, { ...novo, versionCode: 5 }, cert, cert).problemas.includes('VERSION_CODE_NAO_CRESCENTE'));
});
test('bloqueia troca do pacote e falta de assinatura', () => {
  const resultado = avaliarAtualizacao(anterior, { ...novo, pacote: 'br.com.outro.app' }, null, cert);
  assert.ok(resultado.problemas.includes('PACOTE_DIFERENTE'));
  assert.ok(resultado.problemas.includes('ASSINATURA_NAO_VERIFICADA'));
});
test('bloqueia APK sem metadados, SDK ou arquitetura compatível', () => {
  assert.ok(avaliarAtualizacao(null, novo, cert, cert).problemas.includes('METADADOS_INVALIDOS'));
  assert.ok(avaliarAtualizacao(anterior, { ...novo, minSdk: null }, cert, cert).problemas.includes('SDK_NAO_VERIFICADO'));
  assert.ok(avaliarAtualizacao(anterior, { ...novo, abis: ['x86_64'] }, cert, cert).problemas.includes('ABI_SEM_INTERSECAO'));
});
