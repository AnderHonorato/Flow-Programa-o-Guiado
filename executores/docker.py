"""Apenas este controlador tem acesso ao Docker; código via stdin, nunca shell."""
import asyncio
import logging
import time
import uuid

from executores.contratos import EntradaExecucao, RespostaHttp, ResultadoExecucao


IMAGEM_PYTHON = 'python:3.12.8-alpine3.21@sha256:ba13ef990f6e5d13014e9e8d04c02a8fdb0fe53d6dccf6e19147f316e6cc3a84'
IMAGEM_NODE = 'node:22.14.0-alpine3.21@sha256:9bef0ef1e268f60627da9ba7d7605e8831d5b56ad07487d24d1aa386336d1944'
LIMITE_SAIDA = 65536
MARCADOR_HTTP = '\nFLOW_HTTP_RESULTADO='

INICIADOR_PYTHON = '''import json,sys
dados=json.load(sys.stdin)
exec(compile(dados['codigo'], '<aluno>', 'exec'), {'__name__':'__main__'})
'''

INICIADOR_NODE = '''const fs = require('node:fs');
const dados = JSON.parse(fs.readFileSync(0, 'utf8'));
const Module = require('node:module');
const programa = new Module('/tmp/aluno.cjs');
programa.filename = '/tmp/aluno.cjs';
programa.paths = Module._nodeModulePaths('/tmp');
programa._compile(dados.codigo, '/tmp/aluno.cjs');
'''

# O cliente e o servidor real compartilham APENAS o loopback do contêiner.
# Resultado é diagnóstico do aluno, nunca evidência confiável de aprovação.
INICIADOR_BACKEND = '''import http.client,json,subprocess,sys,time
dados=json.load(sys.stdin)
with open('/tmp/aluno.py', 'w', encoding='utf-8') as arquivo:
 arquivo.write(dados['codigo'])
processo=subprocess.Popen(['python','-I','-u','/tmp/aluno.py'])
requisicao=dados.get('requisicaoHttp') or {'metodo':'GET','caminho':'/','corpo':''}
limite=time.monotonic()+2.5
try:
 while True:
  conexao=http.client.HTTPConnection('127.0.0.1',8000,timeout=0.4)
  try:
   conexao.request(requisicao['metodo'],requisicao['caminho'],body=requisicao.get('corpo','').encode('utf-8'),headers={'Content-Type':'application/json'})
   resposta=conexao.getresponse()
   corpo=resposta.read(4097)
   resultado={'status':resposta.status,'corpo':corpo[:4096].decode('utf-8','ignore'),'truncada':len(corpo)>4096}
   print('\\nFLOW_HTTP_RESULTADO='+json.dumps(resultado),flush=True)
   break
  except (OSError,http.client.HTTPException):
   if time.monotonic()>limite or processo.poll() is not None:
    print('Servidor HTTP indisponível em 127.0.0.1:8000.',flush=True)
    sys.exit(1)
   time.sleep(0.05)
  finally:
   conexao.close()
finally:
 processo.terminate()
 try:
  processo.wait(timeout=0.3)
 except subprocess.TimeoutExpired:
  processo.kill()
  processo.wait()
'''


class ExecutorIndisponivel(Exception):
    pass


async def comando_docker(*argumentos, timeout=8):
    processo = await asyncio.create_subprocess_exec('docker', *argumentos,
        stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
    try:
        saida, _ = await asyncio.wait_for(processo.communicate(), timeout)
    except BaseException:
        if processo.returncode is None:
            processo.kill()
        await processo.wait()
        raise
    if processo.returncode != 0:
        raise ExecutorIndisponivel('Docker indisponível ou imagem não provisionada.')
    return saida


class ExecutorDocker:
    def __init__(self):
        self.bloqueado = False

    async def executar(self, entrada: EntradaExecucao) -> ResultadoExecucao:
        if self.bloqueado:
            raise ExecutorIndisponivel('Executor aguardando limpeza operacional.')
        inicio = time.monotonic()
        nome = 'flow-aluno-' + uuid.uuid4().hex
        processo = None
        saida = bytearray()
        status = None
        codigo = None
        imagem = IMAGEM_NODE if entrada.linguagem == 'node' else IMAGEM_PYTHON
        runtime = ['node', '--max-old-space-size=64', '-e', INICIADOR_NODE] if entrada.linguagem == 'node' else [
            'python', '-I', '-u', '-c', INICIADOR_BACKEND if entrada.linguagem == 'backend-python' else INICIADOR_PYTHON]
        try:
            criacao = asyncio.create_task(comando_docker('create', '--pull=never', '--name', nome,
                '--label', 'flow.executor=aluno', '--network', 'none', '--ipc', 'none',
                '--read-only', '--tmpfs', '/tmp:rw,noexec,nosuid,nodev,size=16m',
                '--user', '65534:65534', '--cap-drop', 'ALL',
                '--security-opt', 'no-new-privileges:true', '--memory', '128m', '--memory-swap', '128m',
                '--pids-limit', '64', '--cpus', '0.5', '--ulimit', 'nofile=64:64', '--ulimit', 'core=0:0',
                '--log-driver', 'none', '--stop-timeout', '1', '--workdir', '/tmp',
                '--env', 'HOME=/tmp', '--env', 'PORT=8000', '--interactive',
                '--entrypoint', runtime[0], imagem, *runtime[1:]))
            try:
                await asyncio.shield(criacao)
            except asyncio.CancelledError:
                # O daemon pode continuar create após o cliente cancelar.
                # Esperar sua conclusão evita remover antes de o contêiner existir.
                try:
                    await criacao
                except (ExecutorIndisponivel, OSError, asyncio.TimeoutError):
                    pass
                raise
            processo = await asyncio.create_subprocess_exec('docker', 'start', '--attach', '--interactive', nome,
                stdin=asyncio.subprocess.PIPE, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.STDOUT)

            async def acompanhar():
                processo.stdin.write(entrada.model_dump_json().encode('utf-8'))
                await processo.stdin.drain()
                processo.stdin.close()
                while True:
                    parte = await processo.stdout.read(4096)
                    if not parte:
                        break
                    restante = LIMITE_SAIDA - len(saida)
                    saida.extend(parte[:restante])
                    if len(parte) > restante:
                        return 'saida_excedida'
                await processo.wait()
                return 'concluido' if processo.returncode == 0 else 'erro'

            try:
                status = await asyncio.wait_for(acompanhar(), timeout=5)
                codigo = processo.returncode
            except asyncio.TimeoutError:
                status = 'tempo_excedido'
        except (OSError, asyncio.TimeoutError) as erro:
            raise ExecutorIndisponivel('Executor indisponível. Tente mais tarde.') from erro
        finally:
            # Mesmo timeout, excesso de saída, erro e cancelamento removem o contêiner.
            # Encerrar o cliente attach libera contrapressão do pipe antes de rm.
            if processo and processo.returncode is None:
                processo.kill()
            if processo:
                await asyncio.wait_for(processo.communicate(), timeout=2)
            try:
                await asyncio.shield(comando_docker('rm', '--force', nome, timeout=5))
            except (ExecutorIndisponivel, OSError, asyncio.TimeoutError):
                self.bloqueado = True
                logging.getLogger(__name__).error('Falha de limpeza do contêiner %s; executor bloqueado.', nome)
        if self.bloqueado:
            raise ExecutorIndisponivel('Executor aguardando limpeza operacional.')
        texto = saida.decode('utf-8', 'ignore')
        resposta_http = None
        if entrada.linguagem == 'backend-python' and status == 'concluido':
            try:
                antes, registro = texto.rsplit(MARCADOR_HTTP, 1)
                linha, _, depois = registro.partition('\n')
                resposta_http = RespostaHttp.model_validate_json(linha)
                # stdout/stderr multiplexados podem chegar após o registro HTTP.
                texto = antes + depois
            except ValueError:
                status = 'erro'
        return ResultadoExecucao(status=status, codigoSaida=codigo, saida=texto,
            duracaoMs=round((time.monotonic() - inicio) * 1000), respostaHttp=resposta_http)
