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
