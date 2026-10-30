# Flow Programação Guiada

Escola de programação em português com aplicativo web/PWA e Android Capacitor. Versão **0.6.0 de teste**: laboratório executável, currículo autoral, perfil local, revisões, sincronização autenticada e correção pedagógica manual por administrador.

## Executar

Requisitos: Node22+, Python3.12+, JDK21 completo e Android SDK35/Build Tools34+35 para APK.

```bash
npm ci
npm run provisionar:python
python -m pip install -r servidor/requirements-desenvolvimento.txt
python -m uvicorn servidor.principal:app --port 8000
```

Em outro terminal: `npm run dev` (http://localhost:5173). O proxy encaminha `/api` para a API local. SQLite é criado e migrado automaticamente para desenvolvimento. Em produção use `DATABASE_URL` Postgres, conforme [.env.exemplo](.env.exemplo).

```bash
npm run lint
npm test
python -m pytest servidor/testes -q
python conteudos/verificadores/auditar_catalogo.py
npm run build
npm run preview --workspace aplicativos/web -- --port 4173
npm run test:e2e
ANDROID_HOME=/caminho/sdk JAVA_HOME=/caminho/jdk21 bash scripts/android-compilar.sh
```

O provisionamento baixa **Pyodide0.29.3 oficial**, sem dependências opcionais; os seis arquivos são empacotados no APK. Na web, o perfil permite baixar o runtime Python para uso offline. Fontes Inter/JetBrains Mono são locais e licenciadas sob OFL.

## O que está disponível

- Dez novas aulas: algoritmos, tabelas HTML, Grid, escopo, formulários DOM, arquivos JSON Python, estado frontend, validação de API, sessão e calculadora. Cada uma tem experimento próprio e laboratório verificável.
- Comunidade e ranking para contas conectadas: XP, leituras registradas, conclusões e reconhecimentos auditados, sem e-mails/fotos no ranking.
- Gestão administrativa de usuários: banir, inativar, reativar e excluir alunos com motivo, prazo e confirmação. Revogação real de sessões e notificação ao titular.
- Avaliação da experiência em cada aula, com estrelas/comentário enviados à administração.
- Entrada visual com arte autoral e etapas de verificação vinculadas ao login real. Conquistas com categorias Inicial/Rara/Épica/Lendária.
- Perfil local sem cadastro; conta por e-mail/senha, sessão revogável, isolamento entre perfis e migração do trabalho local.
- Aulas narráveis, exemplos guiados, 30 experimentos interativos e preparação por etapas antes do laboratório.
- Avaliações definitivas: primeira escolha travada, correção e nota somente após envio completo, com explicação dos erros. Escolhas e versão da correção persistem por perfil.
- HTML/CSS/JavaScript com CodeMirror, prévia real isolada, console, inspeção DOM, testes e versões. Python verdadeiro em worker WebAssembly.
- 8 níveis e 6 emblemas SVG com revelação animada, ficha, descrição e data de aquisição.
- Foto recortável e 18 avatares originais Cartoon/Pixel/Games, além de 8 ícones de nível, com sincronização privada do perfil. Revisões espaçadas e XP por compreensão; projeto enviado distingue fila local e validação recebida pelo servidor.
- Painel administrativo com RBAC servidor, CMS versionado, revisão humana, auditoria e botão explícito de correção GPT. A credencial do modelo só existe no servidor.
- J.A.R.V.I.S holográfico no canto, com indicador de fala real, vibração, glossário por seleção/consulta, piadas e braveza de brincadeira. Português Brasil por padrão, inglês opcional, controles próprios e movimento reduzido. Navegação móvel inferior e superfícies de aplicativo.

**Inventário inicial:** 10 trilhas, 60 módulos catalogados, 30 aulas completas e120 atividades autorais. Os30 módulos sem aulas estão identificados como **em produção editorial**. A meta180aulas/450exercícios ainda requer expansão autoral; o inventário não conta planejamento como conteúdo entregue. Consulte [inventário](conteudos/inventario.json).

## Administração e implantação

Provisionar uma conta admin é uma operação de servidor, nunca cadastro público:

```bash
python -m servidor.administrar criar-admin --email seu-email@dominio.com --nome Ander
```

A senha é solicitada sem eco. Produção serverless usa `BANCO_POOL_NULO=1` e `MIGRAR_AO_INICIAR=0`, após migração controlada. O banco do Flow utiliza schema privado e papel exclusivo; o aplicativo não recebe credenciais do banco. A imagem `servidor/Dockerfile.completo` serve API e build web para hospedagem própria.

A correção GPT exige configurar `OPENAI_API_KEY` e `OPENAI_MODELO` no servidor. Sem chave, a atividade permanece pendente e a revisão humana continua disponível. Nenhuma chamada GPT real é alegada nos testes com transporte controlado.

## Limites declarados

A narração offline depende de voz local instalada. A PWA precisa ser aberta online antes de usar offline; novos downloads, sincronização, GPT e execução remota precisam de conexão. O iframe e a CSP isolam a origem e bloqueiam rede, mas o executor DOM no navegador não oferece o mesmo limite rígido de memória de um contêiner remoto. Código hostil não deve ser tratado como workload confiável.

O APK debug é instalável para testes e não equivale a uma assinatura de produção ou publicação Play Store. Consulte evidências para distinguir compilação, instalação e validação de dispositivo.

## Documentação

- [Plano e contratos](docs/plano-de-entrega.md) · [contrato de integração](contratos/integracao.md)
- [API e segurança](docs/arquitetura-api.md)
- [Laboratório](docs/laboratorios.md) · [Offline e voz](docs/offline-e-audio.md)
- [Android](docs/android.md) · [Identidade original](docs/identidade.md)
- [Expansão curricular 0.6](docs/expansao-curricular-0.6.0.md) · [Comunidade e moderação 0.5](docs/comunidade-e-moderacao-0.5.0.md) · [J.A.R.V.I.S e áudio 0.4](docs/jarvis-e-audio-0.4.0.md) · [Recompensas e perfil 0.3](docs/recompensas-e-perfil-0.3.0.md) · [Revisão de qualidade](docs/revisao-qa.md)

Os arquivos do pacote visual são referências de composição e paleta. Logos de terceiros não integram a marca Flow.
