import test from 'node:test';
import assert from 'node:assert/strict';
import { classificarFalha, interpretarArgumentos, executarDiagnostico } from '../scripts/android-diagnosticar-instalacao.mjs';

test('diagnostica assinatura divergente sem recomendar apagar dados', () => {
  const falha = classificarFalha('Failure [INSTALL_FAILED_UPDATE_INCOMPATIBLE: Package signatures do not match]');
  assert.equal(falha.codigo, 'ASSINATURA_DIFERENTE');
  assert.match(falha.orientacao, /mesma chave/);
});
test('reconhece restricao do Android sem sugerir contornar protecoes', () => {
  assert.equal(classificarFalha('Failure [INSTALL_FAILED_USER_RESTRICTED]').codigo, 'RESTRICAO_ANDROID');
});
test('nao instala quando existem dois dispositivos sem serial explicito', () => {
  const chamadas = [];
  const executar = (bin, args) => {
    chamadas.push(args);
    return { status: 0, stdout: 'List of devices attached\nA device\nB device\n', stderr: '' };
  };
  const resultado = executarDiagnostico({ apk: 'nao-importa.apk', serial: null }, executar);
  assert.equal(resultado.codigo, 'MULTIPLOS_DISPOSITIVOS');
  assert.deepEqual(chamadas, [['devices', '-l']]);
});
test('somente diagnostico nao chama adb install nem altera aparelho', () => {
  const chamadas = [];
  const executar = (_, args) => {
    chamadas.push(args.join(' '));
    if (args[0] === 'devices') return { status: 0, stdout: 'List of devices attached\nABC device model:SM-A356E\n', stderr: '' };
    if (args.includes('ro.product.model')) return { status: 0, stdout: 'SM-A356E', stderr: '' };
    if (args.includes('ro.build.version.release')) return { status: 0, stdout: '15', stderr: '' };
    return { status: 0, stdout: 'package:br.com.ander.flow', stderr: '' };
  };
  const resultado = executarDiagnostico({ apk: null, serial: null, somenteDiagnostico: true }, executar);
  assert.equal(resultado.ok, true);
  assert.equal(resultado.modelo, 'SM-A356E');
  assert.equal(resultado.instaladoNoUsuarioPrincipal, true);
  assert.equal(chamadas.some(x => x.includes('install')), false);
});
test('argumentos rejeitam serial sem valor', () => {
  assert.throws(() => interpretarArgumentos(['--serial']), /exige/);
});

test('ADB ausente apresenta bloqueio real em vez de dizer que nao ha aparelho', () => {
  const retorno = executarDiagnostico({ apk: 'teste.apk', serial: null }, () => ({
    status: null, error: Object.assign(new Error('spawn adb ENOENT'), { code: 'ENOENT' })
  }));
  assert.equal(retorno.codigo, 'ADB_AUSENTE');
  assert.equal(retorno.etapa, 'conexao');
});
test('dispositivo nao autorizado nao tenta instalar', () => {
  const chamadas = [];
  const retorno = executarDiagnostico({ apk: 'teste.apk', serial: null }, (_, args) => {
    chamadas.push(args.join(' '));
    return { status: 0, stdout: 'List of devices attached\nSM123 unauthorized\n', stderr: '' };
  });
  assert.equal(retorno.codigo, 'ADB_NAO_AUTORIZADO');
  assert.equal(chamadas.length, 1);
});
test('serial inexistente e bloqueado antes de consultar ou instalar', () => {
  const chamadas = [];
  const retorno = executarDiagnostico({ apk: 'teste.apk', serial: 'OUTRO' }, (_, args) => {
    chamadas.push(args.join(' '));
    return { status: 0, stdout: 'List of devices attached\nSM123 device\n', stderr: '' };
  });
  assert.equal(retorno.codigo, 'SERIAL_NAO_ENCONTRADO');
  assert.deepEqual(chamadas, ['devices -l']);
});

test('fixa o serial do aparelho em todas as consultas ADB', () => {
  const chamadas = [];
  const executar = (_, args) => {
    chamadas.push(args);
    if (args[0] === 'devices') return { status: 0, stdout: 'List of devices attached\nA35 device model:SM-A356E\n', stderr: '' };
    if (args.includes('ro.product.model')) return { status: 0, stdout: 'SM-A356E', stderr: '' };
    if (args.includes('ro.build.version.release')) return { status: 0, stdout: '15', stderr: '' };
    return { status: 0, stdout: '', stderr: '' };
  };
  const resultado = executarDiagnostico({ apk: null, serial: null, somenteDiagnostico: true }, executar);
  assert.equal(resultado.ok, true);
  assert.equal(resultado.dispositivo, 'A35');
  assert.deepEqual(chamadas[0], ['devices', '-l']);
  for (const chamada of chamadas.slice(1)) assert.deepEqual(chamada.slice(0, 2), ['-s', 'A35']);
});

test('localiza SDK isolado sem modificar PATH global', async () => {
  const { localizarAdb } = await import('../scripts/android-diagnosticar-instalacao.mjs');
  const local = 'C:/Users/AS/AppData/Local/AnderFlow/android-tools/platform-tools/adb.exe';
  assert.equal(localizarAdb({ LOCALAPPDATA: 'C:/Users/AS/AppData/Local' }, caminho => caminho.replaceAll('\\', '/') === local), local.replaceAll('/', requireSeparador()));
});
function requireSeparador() { return process.platform === 'win32' ? '\\' : '/'; }


test('consulta SDK, ABIs e versao instalada sem modificar o Android', () => {
  const chamadas = [];
  const executar = (_, args) => {
    chamadas.push(args.join(' '));
    if (args[0] === 'devices') return { status: 0, stdout: 'List of devices attached\nA35 device model:SM-A356E\n' };
    const comando = args.join(' ');
    if (comando.includes('ro.product.model')) return { status: 0, stdout: 'SM-A356E' };
    if (comando.includes('ro.build.version.release')) return { status: 0, stdout: '15' };
    if (comando.includes('ro.build.version.sdk')) return { status: 0, stdout: '35' };
    if (comando.includes('ro.product.cpu.abilist')) return { status: 0, stdout: 'arm64-v8a,armeabi-v7a' };
    if (comando.includes('pm list packages')) return { status: 0, stdout: 'package:br.com.ander.flow' };
    if (comando.includes('dumpsys package')) return { status: 0, stdout: 'versionCode=8 minSdk=24 targetSdk=35\nversionName=0.6.2' };
    return { status: 0, stdout: '' };
  };
  const resultado = executarDiagnostico({ apk: null, serial: null, somenteDiagnostico: true }, executar);
  assert.equal(resultado.ok, true);
  assert.equal(resultado.sdk, 35);
  assert.deepEqual(resultado.abis, ['arm64-v8a', 'armeabi-v7a']);
  assert.deepEqual(resultado.versaoInstalada, { codigo: 8, nome: '0.6.2' });
  assert.equal(chamadas.some(chamada => / install | uninstall | pm clear /.test(' ' + chamada + ' ')), false);
});

test('sem pacote instalado nao consulta dumpsys nem inventa versao', () => {
  const chamadas = [];
  const executar = (_, args) => {
    chamadas.push(args.join(' '));
    if (args[0] === 'devices') return { status: 0, stdout: 'List of devices attached\nA35 device\n' };
    return { status: 0, stdout: '' };
  };
  const resultado = executarDiagnostico({ apk: null, serial: null, somenteDiagnostico: true }, executar);
  assert.equal(resultado.versaoInstalada, null);
  assert.equal(resultado.sdk, null);
  assert.deepEqual(resultado.abis, []);
  assert.equal(chamadas.some(chamada => chamada.includes('dumpsys')), false);
});
