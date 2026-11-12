import test from 'node:test';
import assert from 'node:assert/strict';
import { interpretarBadging, interpretarCertificado, interpretarCertificados, avaliarAtualizacao } from '../scripts/android-preflight-atualizacao.mjs';

const anterior = { pacote: 'br.com.ander.flow', versionCode: 6, versionName: '0.6.0', minSdk: 23, maxSdk: null, abis: ['arm64-v8a'] };
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


test('rejeita APK que exige Android superior ao SDK 35 do perfil A35', () => {
  const resultado = avaliarAtualizacao(anterior, { ...novo, minSdk: 36 }, cert, cert);
  assert.ok(resultado.problemas.includes('SDK_INCOMPATIVEL_A35'));
  assert.equal(resultado.aprovado, false);
});
test('rejeita APK apenas x86 mesmo se a versão anterior tiver ABI em comum', () => {
  const antigoX86 = { ...anterior, abis: ['x86_64'] };
  const resultado = avaliarAtualizacao(antigoX86, { ...novo, abis: ['x86_64'] }, cert, cert);
  assert.ok(resultado.problemas.includes('ABI_INCOMPATIVEL_A35'));
});
test('permite APK universal sem bibliotecas nativas', () => {
  assert.equal(avaliarAtualizacao({ ...anterior, abis: [] }, { ...novo, abis: [] }, cert, cert).aprovado, true);
});
test('não aceita digest de assinatura truncado ou malformado', () => {
  const resultado = avaliarAtualizacao(anterior, novo, 'abcd', 'abcd');
  assert.ok(resultado.problemas.includes('ASSINATURA_NAO_VERIFICADA'));
});
test('rejeita lista de arquiteturas inválida sem lançar exceção', () => {
  const resultado = avaliarAtualizacao(anterior, { ...novo, abis: null }, cert, cert);
  assert.ok(resultado.problemas.includes('ABI_NAO_VERIFICADA'));
});

test('extrai maxSdkVersion e bloqueia Android 15 fora do limite', () => {
  const badging = "package: name='br.com.ander.flow' versionCode='7' versionName='0.6.1'\nsdkVersion:'23'\nmaxSdkVersion:'34'\n";
  const metadados = interpretarBadging(badging);
  assert.equal(metadados.maxSdk, 34);
  const resultado = avaliarAtualizacao(anterior, metadados, cert, cert);
  assert.ok(resultado.problemas.includes('MAX_SDK_INCOMPATIVEL_A35'));
  assert.equal(resultado.aprovado, false);
});
test('aceita limite maxSdkVersion igual ou superior ao SDK 35', () => {
  assert.equal(avaliarAtualizacao(anterior, { ...novo, maxSdk: 35 }, cert, cert).aprovado, true);
  assert.equal(avaliarAtualizacao(anterior, { ...novo, maxSdk: 36 }, cert, cert).aprovado, true);
});
test('bloqueia maxSdkVersion malformado', () => {
  assert.ok(avaliarAtualizacao(anterior, { ...novo, maxSdk: NaN }, cert, cert).problemas.includes('MAX_SDK_INCOMPATIVEL_A35'));
});

// Regressão: apksigner pode listar múltiplos signatários. Comparar apenas #1 é inseguro.
test('bloqueia APK com múltiplos signatários mesmo quando o primeiro coincide', () => {
  const texto = 'Signer #1 certificate SHA-256 digest: ' + cert + '\\nSigner #2 certificate SHA-256 digest: ' + 'b'.repeat(64) + '\\n';
  assert.deepEqual(interpretarCertificados(texto), [cert, 'b'.repeat(64)]);
  assert.equal(interpretarCertificado(texto), null);
  assert.ok(avaliarAtualizacao(anterior, novo, cert, interpretarCertificado(texto)).problemas.includes('ASSINATURA_NAO_VERIFICADA'));
});
test('rejeita certificados duplicados, numerados incorretamente ou truncados', () => {
  assert.equal(interpretarCertificado('Signer #2 certificate SHA-256 digest: ' + cert), null);
  assert.equal(interpretarCertificado('Signer #1 certificate SHA-256 digest: ' + cert + '\\nSigner #1 certificate SHA-256 digest: ' + cert), null);
  assert.equal(interpretarCertificado('Signer #1 certificate SHA-256 digest: abcd'), null);
});
test('aceita SHA-256 com letras maiúsculas e separadores dois-pontos', () => {
  const digest = cert.toUpperCase().match(/../g).join(':');
  assert.equal(interpretarCertificado('Signer #1 certificate SHA-256 digest: ' + digest), cert);
  assert.equal(avaliarAtualizacao(anterior, novo, cert.toUpperCase(), cert).aprovado, true);
});
