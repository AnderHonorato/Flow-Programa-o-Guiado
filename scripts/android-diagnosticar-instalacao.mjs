#!/usr/bin/env node
/**
 * Diagnostica falhas de instalacao no Android sem remover aplicativos ou dados.
 * Uso: node scripts/android-diagnosticar-instalacao.mjs <apk> [--serial SERIAL] [--somente-diagnostico]
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

export const PACOTE = 'br.com.ander.flow';
// Busca ferramentas locais sem exigir alteracoes globais no PATH do Windows.
export function localizarAdb(ambiente = process.env, existe = existsSync) {
  const candidatos = [
    ambiente.ANDROID_HOME && join(ambiente.ANDROID_HOME, 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb'),
    ambiente.ANDROID_SDK_ROOT && join(ambiente.ANDROID_SDK_ROOT, 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb'),
    ambiente.LOCALAPPDATA && join(ambiente.LOCALAPPDATA, 'AnderFlow', 'android-tools', 'platform-tools', 'adb.exe'),
    join(homedir(), 'AppData', 'Local', 'Android', 'Sdk', 'platform-tools', 'adb.exe'),
  ].filter(Boolean);
  return candidatos.find(caminho => existe(caminho)) || 'adb';
}


export function classificarFalha(saida) {
  const regras = [
    [/INSTALL_FAILED_UPDATE_INCOMPATIBLE|signatures do not match/i, 'ASSINATURA_DIFERENTE', 'Ja existe uma instalacao assinada com outra chave. Nao desinstale sem antes salvar os dados; gere uma atualizacao com a mesma chave.'],
    [/INSTALL_FAILED_VERSION_DOWNGRADE/i, 'VERSAO_ANTIGA', 'O APK tem versionCode inferior ao instalado. Gere uma versao mais recente.'],
    [/INSTALL_FAILED_OLDER_SDK|INSTALL_FAILED_NEWER_SDK/i, 'SDK_INCOMPATIVEL', 'Confira minSdkVersion e versao do Android.'],
    [/INSTALL_FAILED_NO_MATCHING_ABIS/i, 'ABI_INCOMPATIVEL', 'O APK nao inclui a arquitetura exigida pelo dispositivo.'],
    [/INSTALL_FAILED_INSUFFICIENT_STORAGE/i, 'SEM_ESPACO', 'Libere armazenamento antes de tentar novamente.'],
    [/INSTALL_FAILED_USER_RESTRICTED|INSTALL_FAILED_VERIFICATION_FAILURE|INSTALL_FAILED_BLOCKED/i, 'RESTRICAO_ANDROID', 'Verifique restricoes de instalacao do perfil e a origem do APK; nao desative protecoes.'],
    [/INSTALL_PARSE_FAILED|INSTALL_FAILED_INVALID_APK/i, 'APK_INVALIDO', 'Confira integridade SHA-256, assinatura e geracao do APK.'],
    [/more than one device\/emulator/i, 'MULTIPLOS_DISPOSITIVOS', 'Informe --serial para selecionar explicitamente o aparelho.'],
    [/unauthorized/i, 'ADB_NAO_AUTORIZADO', 'Autorize a depuracao USB na tela do aparelho.'],
    [/no devices\/emulators found|device offline/i, 'DISPOSITIVO_INDISPONIVEL', 'Conecte o aparelho e verifique adb devices -l.'],
  ];
  for (const [expressao, codigo, orientacao] of regras) {
    if (expressao.test(saida)) return { codigo, orientacao };
  }
  return { codigo: 'FALHA_NAO_CLASSIFICADA', orientacao: 'Consulte a saida do ADB; nao remova o aplicativo sem backup.' };
}

export function interpretarArgumentos(args) {
  const resultado = { apk: null, serial: null, somenteDiagnostico: false };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--serial') {
      if (!args[i + 1] || args[i + 1].startsWith('--')) throw new Error('--serial exige um identificador.');
      resultado.serial = args[++i];
    } else if (arg === '--somente-diagnostico') resultado.somenteDiagnostico = true;
    else if (!arg.startsWith('--') && !resultado.apk) resultado.apk = resolve(arg);
    else throw new Error('Argumento desconhecido: ' + arg);
  }
  if (!resultado.apk && !resultado.somenteDiagnostico) throw new Error('Informe o caminho do APK.');
  return resultado;
}

export function executarDiagnostico(opcoes, executar = (binario, args) => spawnSync(binario, args, { encoding: 'utf8', timeout: 120_000 })) {
  const adb = localizarAdb();
  let serialSelecionado = opcoes.serial;
  const comando = (args) => {
    const retorno = executar(adb, [...(serialSelecionado ? ['-s', serialSelecionado] : []), ...args]);
    return { status: retorno.status, saida: [retorno.stdout, retorno.stderr, retorno.error?.message].filter(Boolean).join('\n').trim() };
  };
  const dispositivos = executar(adb, ['devices', '-l']);
  if (dispositivos.error || dispositivos.status !== 0) {
    const detalhe = [dispositivos.stderr, dispositivos.error?.message].filter(Boolean).join(' ');
    return {
      ok: false, etapa: 'conexao', codigo: dispositivos.error?.code === 'ENOENT' ? 'ADB_AUSENTE' : 'ADB_INDISPONIVEL',
      orientacao: 'Instale Android SDK Platform-Tools e verifique o caminho do adb; nenhuma instalacao foi tentada.',
      detalhe: detalhe.slice(0, 500)
    };
  }
  const linhas = (dispositivos.stdout || '').split(/\r?\n/);
  const entradas = linhas.map(linha => linha.trim().match(/^(\S+)\s+(device|unauthorized|offline)\b/)).filter(Boolean);
  const escolhido = opcoes.serial ? entradas.find(item => item[1] === opcoes.serial) : null;
  if (opcoes.serial && (!escolhido || escolhido[2] !== 'device')) {
    const codigo = escolhido?.[2] === 'unauthorized' ? 'ADB_NAO_AUTORIZADO' :
      escolhido?.[2] === 'offline' ? 'DISPOSITIVO_INDISPONIVEL' : 'SERIAL_NAO_ENCONTRADO';
    return { ok: false, etapa: 'selecao', codigo, orientacao: 'Confira adb devices -l, conecte e autorize o aparelho antes de instalar.' };
  }
  if (!opcoes.serial && !entradas.some(item => item[2] === 'device')) {
    const codigo = entradas.some(item => item[2] === 'unauthorized') ? 'ADB_NAO_AUTORIZADO' : 'DISPOSITIVO_INDISPONIVEL';
    return { ok: false, etapa: 'selecao', codigo, orientacao: 'Confira adb devices -l e autorize o aparelho; nenhuma instalacao foi tentada.' };
  }
  const disponiveis = (dispositivos.stdout || '').split(/\r?\n/).filter(l => /^\S+\s+device\b/.test(l));
  if (!opcoes.serial && disponiveis.length !== 1) {
    return { ok: false, etapa: 'selecao', dispositivos: disponiveis.length, ...classificarFalha(disponiveis.length ? 'more than one device/emulator' : 'no devices/emulators found') };
  }
  const serial = opcoes.serial || disponiveis[0].trim().split(/\s+/)[0];
  // Fixar o aparelho evita que uma conexao posterior redirecione a instalacao.
  serialSelecionado = serial;
  const props = comando(['shell', 'getprop', 'ro.product.model']);
  const android = comando(['shell', 'getprop', 'ro.build.version.release']);
  const instalado = comando(['shell', 'pm', 'list', 'packages', '--user', '0', PACOTE]);
  const sdk = comando(['shell', 'getprop', 'ro.build.version.sdk']);
  const abi = comando(['shell', 'getprop', 'ro.product.cpu.abilist']);
  const presente = instalado.saida.split(/\r?\n/).includes('package:' + PACOTE);
  const detalhes = presente ? comando(['shell', 'dumpsys', 'package', PACOTE]) : null;
  const codigoInstalado = detalhes?.saida.match(/\bversionCode=(\d+)\b/)?.[1];
  const nomeInstalado = detalhes?.saida.match(/\bversionName=([^\s]+)/)?.[1];
  const base = {
    dispositivo: serial, modelo: props.saida, android: android.saida,
    sdk: /^\d+$/.test(sdk.saida) ? Number(sdk.saida) : null,
    abis: abi.saida ? abi.saida.split(',').map(item => item.trim()).filter(Boolean) : [],
    pacote: PACOTE, instaladoNoUsuarioPrincipal: presente,
    versaoInstalada: presente ? { codigo: codigoInstalado ? Number(codigoInstalado) : null, nome: nomeInstalado || null } : null,
  };
  if (opcoes.somenteDiagnostico) return { ok: true, etapa: 'diagnostico', ...base };
  if (!existsSync(opcoes.apk)) return { ok: false, etapa: 'arquivo', ...base, codigo: 'APK_AUSENTE', orientacao: 'Confira o caminho do APK.' };
  const tentativa = comando(['install', '-r', '-t', opcoes.apk]);
  if (tentativa.status === 0 && /Success/i.test(tentativa.saida)) return { ok: true, etapa: 'instalacao', ...base, resultado: 'Success' };
  return { ok: false, etapa: 'instalacao', ...base, ...classificarFalha(tentativa.saida), detalhe: tentativa.saida.slice(0, 1500) };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const opcoes = interpretarArgumentos(process.argv.slice(2));
    const resultado = executarDiagnostico(opcoes);
    console.log(JSON.stringify(resultado, null, 2));
    if (!resultado.ok) process.exitCode = 1;
  } catch (erro) {
    console.error(erro.message);
    process.exitCode = 2;
  }
}
