# Executor separado e opt-in

Implementação local verificável; este documento não declara um serviço publicado. O processo FastAPI principal autentica o aluno e envia somente código e configuração didática por HTTP a outro serviço. Somente o controlador em `executores/` usa Docker CLI. Nenhum `exec`, subprocesso de aluno ou Docker socket é utilizado pela API principal.

O executor fica **desativado por padrão**. O frontend usa a sessão normal e a rota `/api/execucoes`; o token interno nunca pode ser uma variável `VITE_*`, estar no APK, aparecer no navegador ou ser enviado ao contêiner de aluno. As execuções não alteram progresso, não corrigem por GPT e não aprovam atividades.

## Contrato público

`POST /api/execucoes`, com `Authorization: Bearer TOKEN_DE_SESSAO`:

```json
{
  "linguagem": "python",
  "codigo": "print(sum([2, 3, 5]))"
}
```

Linguagens: `python`, `node` e `backend-python`. Código limitado a 32 KiB UTF-8. Campos extras, imagem arbitrária, argumentos Docker, host remoto e dependências para instalar são recusados. Não existe entrada interativa: o controlador utiliza stdin para transferir o código e encerra a entrada.

Resposta:

```json
{
  "status": "concluido",
  "codigoSaida": 0,
  "saida": "10\n",
  "duracaoMs": 320,
  "respostaHttp": null
}
```

`status` pode ser `concluido`, `erro`, `tempo_excedido` ou `saida_excedida`. `codigoSaida` pode ser nulo em interrupções. stdout e stderr compartilham um teto de 64 KiB. Trechos UTF-8 incompletos são descartados para respeitar esse limite em bytes. A duração inclui preparação e remoção; o prazo de **5 segundos** abrange a execução/attach, após criar o contêiner. Docker create tem timeout de 8 segundos e remoção de 5 segundos; o proxy usa timeout de 22 segundos.

401 indica sessão ausente/expirada; 422 entrada inválida; 429 capacidade ocupada; 503 serviço desativado/indisponível; 502 resposta inválida do controlador. Falhas internas não retornam segredos ou detalhes Docker. O proxy não segue redirecionamentos e ignora proxies HTTP do ambiente (`trust_env=False`).

## Backend HTTP real

`backend-python` inicia um processo Python dentro do mesmo contêiner e realiza uma requisição HTTP real exclusivamente a `127.0.0.1:8000`. Não há porta publicada ou URL permanente. Exemplo de código:

```python
from http.server import BaseHTTPRequestHandler, HTTPServer

class Rota(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200 if self.path == '/saude' else 404)
        self.end_headers()
        self.wfile.write(b'{"total":10}')

HTTPServer(('127.0.0.1', 8000), Rota).serve_forever()
```

Envie o código acima em `codigo`, `linguagem: "backend-python"` e `requisicaoHttp: {"metodo":"GET","caminho":"/saude"}`. O campo opcional `corpo` aceita até 4096 caracteres e é enviado como JSON; métodos permitidos: GET, POST, PUT, PATCH, DELETE e HEAD. Caminho tem até 1024 caracteres ASCII e deve começar por `/`, sem host, espaços ou caracteres de controle. Padrão: GET `/`.

`respostaHttp` contém `{status:200,corpo:"{\"total\":10}",truncada:false}`. Corpo de resposta limitado a 4096 bytes; respostas maiores têm `truncada:true`. O cliente tenta a conexão durante até 2,5 segundos; não segue redirecionamentos. Encerrada a requisição, o processo servidor e o contêiner são removidos. Não há instalação de Flask/FastAPI: o ambiente inicial tem a biblioteca padrão Python. Isso permite praticar HTTP verdadeiro sem internet; bibliotecas adicionais requerem uma imagem revisada em futura versão.

Saída e resposta HTTP são dados **não confiáveis**, controlados pelo código do aluno. O marcador interno de resposta pode ser forjado pelo próprio programa; não deve fundamentar aprovação, certificados ou avaliação objetiva privilegiada. Testes de avaliação resistentes a fraude exigem um avaliador externo separado.

## Isolamento aplicado

Cada execução cria um contêiner novo e usa `docker create/start/rm` por lista de argumentos, sem shell. O aluno não escolhe imagem ou opções. As imagens oficiais estão fixadas por digest:

| Runtime | Imagem |
| --- | --- |
| Python | `python:3.12.8-alpine3.21@sha256:ba13ef990f6e5d13014e9e8d04c02a8fdb0fe53d6dccf6e19147f316e6cc3a84` |
| Node | `node:22.14.0-alpine3.21@sha256:9bef0ef1e268f60627da9ba7d7605e8831d5b56ad07487d24d1aa386336d1944` |

Digest fixo torna a execução reprodutível; não indica ausência de CVEs. Antes de uso público, revisar versões/correções e repetir os testes ao atualizar os dois digests em `executores/docker.py`.

Controles: rede `none` (loopback interno permanece disponível), IPC `none`, raiz somente leitura, tmpfs `/tmp` de 16 MiB com noexec/nosuid/nodev, UID/GID 65534, capabilities removidas, `no-new-privileges`, seccomp padrão do Docker, memória e swap total 128 MiB, 64 processos, 0,5 CPU, 64 descritores, core dumps desativados e logs Docker desativados. Não são montados volumes, diretórios de usuário ou socket Docker no contêiner de aluno. Nenhum segredo/variável de credencial do host é repassado. Node limita também o heap a 64 MiB.

O controlador aceita até duas execuções simultâneas por processo e recusa excedentes com 429; execute **um worker/controlador por host**. O fluxo remove o contêiner após sucesso, erro, cancelamento, timeout ou excesso de saída. Falha de remoção bloqueia novas execuções naquele controlador até intervenção/reinício. Um encerramento forçado do processo/host pode deixar contêineres: parar serviço, conferir `docker ps -a --filter label=flow.executor=aluno` e remover explicitamente apenas os IDs correspondentes antes de reiniciar. Não há garantia de limpeza após SIGKILL ou falha do host.

## Operação em host dedicado

O Docker socket permite controlar o host e equivale, na prática, a acesso administrativo. O processo controlador e membros do grupo `docker` devem ser considerados privilegiados, mesmo rodando com um usuário de serviço. **Não montar socket na API, não compartilhar o host com banco, credenciais GPT, dados pessoais ou outros serviços e nunca expor o daemon Docker na rede.** Contêineres compartilham o kernel: esta implementação não equivale a VM/microVM e não elimina risco de fuga por vulnerabilidade do runtime/kernel. Antes de operação pública, usar host dedicado descartável, atualizações, monitoramento, cotas por conta/IP no gateway e avaliar gVisor/Kata/microVM.

No host dedicado Linux com Docker, cgroup v2 e seccomp habilitado:

```sh
python -m venv .venv
.venv/bin/python -m pip install -r executores/requirements.txt
docker pull python:3.12.8-alpine3.21@sha256:ba13ef990f6e5d13014e9e8d04c02a8fdb0fe53d6dccf6e19147f316e6cc3a84
docker pull node:22.14.0-alpine3.21@sha256:9bef0ef1e268f60627da9ba7d7605e8831d5b56ad07487d24d1aa386336d1944
```

Provisionar imagens é uma ação administrativa com internet. A execução usa `--pull=never` e não acessa rede externa. Gere o token com `python -c 'import secrets; print(secrets.token_urlsafe(48))'` em terminal privado, salve por gerenciador de segredos/arquivo de ambiente protegido e não faça commit.

Ambiente exclusivo do controlador:

```dotenv
EXECUTOR_HABILITADO=1
EXECUTOR_TOKEN=TOKEN_ALEATORIO_COM_PELO_MENOS_32_CARACTERES
```

```sh
python -m uvicorn executores.controlador:app --host 127.0.0.1 --port 8091 --workers 1 --limit-concurrency 8
```

O exemplo `executores/flow-executor.service` mantém a porta em loopback e usa usuário de serviço. Ajustar diretório, venv e conta; `/etc/flow-executor.env` deve ser protegido (root, modo 0600). Para a API em outro host, conectar por rede privada/VPN e proxy TLS autenticado, permitindo somente a origem da API. Não abrir a porta 8091 à internet. A autenticação bearer interna não substitui TLS em tráfego entre hosts.

Ambiente exclusivo da API:

```dotenv
EXECUTOR_URL=http://127.0.0.1:8091
EXECUTOR_TOKEN=MESMO_TOKEN_INTERNO
```

O exemplo de loopback acima serve para desenvolvimento; em produção o URL deve alcançar o proxy/rede privada do host dedicado. Se API estiver em contêiner, `127.0.0.1` pertence ao contêiner da API: configurar o endereço privado correto. Não configurar `EXECUTOR_HABILITADO` na API; ela não inicia controlador. `EXECUTOR_URL` é configuração administrativa, nunca entrada do cliente. O controlador não usa o banco nem registra código, nome, e-mail ou tokens.

## Verificação reproduzível

Com dependências de desenvolvimento da API instaladas:

```sh
python -m pytest -c executores/pytest.ini executores/testes -q
FLOW_TESTE_DOCKER=1 python -m pytest -c executores/pytest.ini executores/testes -q
python -m pytest -c servidor/pytest.ini servidor/testes -q
python -m compileall -q executores servidor/rotas
```

Sem `FLOW_TESTE_DOCKER=1`, os testes que executam contêineres são explicitamente pulados. Os demais cobrem opt-in, autenticação interna, limite de corpo, entrada e proxy com servidor HTTP real local. Os testes Docker exercitam Python, Node, backend HTTP, UID, raiz protegida, ausência de segredo/socket, rede externa bloqueada, limites cgroup reais, timeout, excesso de saída, erro e cancelamento com remoção. Não executam código de aluno diretamente no host.

O serviço é online e depende de autenticação/API/controlador disponíveis. Não substitui HTML/CSS/JS no iframe ou o runtime Python WebAssembly offline. A execução remota não foi publicada nesta etapa e não existe integração automática com correção GPT.

Evidências locais de 27/10/2026: **26 testes aprovados com `FLOW_TESTE_DOCKER=1`**, sem contêineres de aluno restantes; inclui concorrência real e recusa da terceira execução. Regressão da API: **22 aprovados**. `compileall` passou. O pytest emitiu somente o aviso de depreciação já existente de Starlette/TestClient/httpx. Uma primeira execução concorrente com build Docker no storage-driver `vfs` excedeu prazos de create/rm; os contêineres residuais em estado Created foram removidos explicitamente e a suíte foi repetida após o build. Cancelamento durante create agora aguarda sua conclusão antes da limpeza. Manter o daemon do executor dedicado, sem builds concorrentes.
