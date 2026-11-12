#!/usr/bin/env node
/**
 * Gate de atualização de APKs. Nunca instala, remove ou altera dados Android.
 * Uso: node scripts/android-preflight-atualizacao.mjs anterior.apk novo.apk [saida.json]
 * Exige Android SDK (ANDROID_HOME/ANDROID_SDK_ROOT) com build-tools 35.0.0.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const PACOTE = 'br.com.ander.flow';
// Perfil de compatibilidade técnica; não substitui teste no aparelho físico.
export const PERFIL_A35 = Object.freeze({ sdk: 35, abi: 'arm64-v8a' });
export function interpretarBadging(texto) {
  const pacote = texto.match(/^package:\s+name='([^']+)'\s+versionCode='(\d+)'\s+versionName='([^']+)'/m);
  const sdk = texto.match(/^sdkVersion:'(\d+)'/m);
  const maxSdk = texto.match(/^maxSdkVersion:'(\d+)'/m);
  const abis = texto.match(/^native-code:[ \\t]*([^\\r\\n]*)$/m);
  // Falhar fechado quando aapt declara metadados ambíguos ou corrompidos.
  // A ausência de native-code é válida (APK universal), mas uma linha
  // native-code presente e inválida nunca deve ser tratada como universal.
  const linhas = texto.split(/\\r?\\n/);
  const declaracoes = prefixo => linhas.filter(linha => linha.startsWith(prefixo));
  if (declaracoes('package:').length !== 1 || declaracoes('sdkVersion:').length !== 1 ||
      declaracoes('maxSdkVersion:').length > 1 || declaracoes('native-code:').length > 1) return null;
  if (!pacote || !sdk || (declaracoes('maxSdkVersion:').length && !maxSdk)) return null;
  if (declaracoes('native-code:').length && !abis) return null;
  const arquiteturas = abis ? [...abis[1].matchAll(/'([^']+)'/g)].map(m => m[1]) : [];
  if (abis && (!arquiteturas.length || abis[1].replace(/'[^']+'/g, '').trim() !== '')) return null;
  return {
    pacote: pacote[1], versionCode: Number(pacote[2]), versionName: pacote[3],
    minSdk: sdk ? Number(sdk[1]) : null,
    maxSdk: maxSdk ? Number(maxSdk[1]) : null,
    abis: arquiteturas
  };
}
export function interpretarCertificados(texto) {
  // Nunca inferir assinatura única de um APK com múltiplos signatários.
  // Falha fechada: uma linha de certificado malformada não pode desaparecer
  // da contagem, deixando o primeiro signatário aparentemente válido.
  const declaracoes = texto.split(/\r?\n/).filter(linha => /^\s*Signer\s*#\s*\d+\s+certificate\s+SHA-256\s+digest\b/i.test(linha));
  const linhas = [...texto.matchAll(/^Signer #(\d+) certificate SHA-256 digest:[ \t]*([^\r\n]*?)[ \t]*$/gim)];
  if (!linhas.length || declaracoes.length !== linhas.length) return [];
  const ids = linhas.map(linha => Number(linha[1]));
  const digests = linhas.map(linha => linha[2].replaceAll(':', '').toLowerCase());
  if (new Set(ids).size !== ids.length || ids.some((id, indice) => id !== indice + 1)) return [];
  return digests.every(digest => /^[0-9a-f]{64}$/.test(digest)) ? digests : [];
}
export function interpretarCertificado(texto) {
  const certificados = interpretarCertificados(texto);
  return certificados.length === 1 ? certificados[0] : null;
}
export function avaliarAtualizacao(anterior, novo, certificadoAnterior, certificadoNovo) {
  const problemas = [];
  if (!anterior || !novo) problemas.push('METADADOS_INVALIDOS');
  else {
    if (anterior.pacote !== PACOTE || novo.pacote !== PACOTE) problemas.push('PACOTE_DIFERENTE');
    if (!Number.isSafeInteger(anterior.versionCode) || !Number.isSafeInteger(novo.versionCode) || novo.versionCode <= anterior.versionCode) problemas.push('VERSION_CODE_NAO_CRESCENTE');
    if (!novo.versionName || novo.versionName === anterior.versionName) problemas.push('VERSION_NAME_NAO_ATUALIZADO');
    if (!Number.isSafeInteger(novo.minSdk) || !Number.isSafeInteger(anterior.minSdk)) problemas.push('SDK_NAO_VERIFICADO');
    else if (novo.minSdk > PERFIL_A35.sdk) problemas.push('SDK_INCOMPATIVEL_A35');
    // maxSdkVersion presente e inferior ao Android do aparelho impede instalação.
    if (novo.maxSdk !== null && novo.maxSdk !== undefined && (!Number.isSafeInteger(novo.maxSdk) || novo.maxSdk < PERFIL_A35.sdk)) problemas.push('MAX_SDK_INCOMPATIVEL_A35');
    // APK sem bibliotecas nativas é universal; caso contrário, deve incluir ARM64.
    if (!Array.isArray(novo.abis) || !Array.isArray(anterior.abis)) problemas.push('ABI_NAO_VERIFICADA');
    else if (novo.abis.length > 0 && !novo.abis.includes(PERFIL_A35.abi)) problemas.push('ABI_INCOMPATIVEL_A35');
    if (Array.isArray(anterior.abis) && Array.isArray(novo.abis) && anterior.abis.length && novo.abis.length && !anterior.abis.some(abi => novo.abis.includes(abi))) problemas.push('ABI_SEM_INTERSECAO');
  }
  const normalizar = valor => typeof valor === 'string' ? valor.toLowerCase() : null;
  const antigo = normalizar(certificadoAnterior);
  const atual = normalizar(certificadoNovo);
  if (!/^[0-9a-f]{64}$/.test(antigo || '') || !/^[0-9a-f]{64}$/.test(atual || '')) problemas.push('ASSINATURA_NAO_VERIFICADA');
  else if (antigo !== atual) problemas.push('ASSINATURA_DIFERENTE');
  return { aprovado: problemas.length === 0, problemas, pacoteEsperado: PACOTE };
}
export function verificarArquivos(anterior, novo, executar = spawnSync, ambiente = process.env) {
  const raiz = ambiente.ANDROID_HOME || ambiente.ANDROID_SDK_ROOT;
  if (!raiz) throw new Error('ANDROID_HOME/ANDROID_SDK_ROOT ausente.');
  const extensao = process.platform === 'win32' ? '.bat' : '';
  const aapt = join(raiz, 'build-tools', '35.0.0', 'aapt' + (process.platform === 'win32' ? '.exe' : ''));
  const apksigner = join(raiz, 'build-tools', '35.0.0', 'apksigner' + extensao);
  for (const caminho of [anterior, novo]) if (!existsSync(caminho)) throw new Error('APK ausente: ' + caminho);
  const executarFerramenta = (bin, args) => {
    const resultado = executar(bin, args, { encoding: 'utf8', timeout: 120000, shell: process.platform === 'win32' && bin.endsWith('.bat') });
    if (resultado.error || resultado.status !== 0) throw new Error('Falha ao executar ' + bin.split(/[\\/]/).pop() + ': ' + String(resultado.stderr || resultado.error?.message || '').slice(0, 300));
    return resultado.stdout || '';
  };
  const metadados = [anterior, novo].map(apk => interpretarBadging(executarFerramenta(aapt, ['dump', 'badging', apk])));
  const certificados = [anterior, novo].map(apk => interpretarCertificado(executarFerramenta(apksigner, ['verify', '--print-certs', apk])));
  const resultado = avaliarAtualizacao(...metadados, ...certificados);
  return {
    ...resultado,
    anterior: { ...metadados[0], sha256: createHash('sha256').update(readFileSync(anterior)).digest('hex'), certificadoSha256: certificados[0] },
    novo: { ...metadados[1], sha256: createHash('sha256').update(readFileSync(novo)).digest('hex'), certificadoSha256: certificados[1] },
    perfilTecnico: PERFIL_A35,
    aviso: 'Compara APKs de CI e compatibilidade teórica com Android 15/ARM64; não comprova a assinatura do aplicativo instalado nem instalação no Galaxy A35 físico.'
  };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [arquivoAnterior, arquivoNovo, destino] = process.argv.slice(2);
    if (!arquivoAnterior || !arquivoNovo) throw new Error('Informe APK anterior e APK novo.');
    const resultado = verificarArquivos(resolve(arquivoAnterior), resolve(arquivoNovo));
    const json = JSON.stringify(resultado, null, 2) + '\n';
    if (destino) { mkdirSync(dirname(resolve(destino)), { recursive: true }); writeFileSync(resolve(destino), json); }
    process.stdout.write(json);
    if (!resultado.aprovado) process.exitCode = 1;
  } catch (erro) { console.error(erro.message); process.exitCode = 2; }
}
