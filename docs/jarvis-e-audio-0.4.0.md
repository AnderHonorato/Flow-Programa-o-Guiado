# J.A.R.V.I.S e áudio — 0.4.0

Nome corrigido para **J.A.R.V.I.S** nas telas e rótulos de acessibilidade.

## Leitura coordenada

Um único AudioProvider atende aulas, glossário e assistente. O padrão é português do Brasil (`pt-BR`), com inglês disponível por escolha explícita. Português de Portugal e outros idiomas não aparecem nem são usados como fallback. A voz inglesa lê o mesmo texto; não há tradução automática das aulas.

As vozes disponíveis são as do navegador/aparelho. Sem voz compatível, o app informa como instalar e conserva a leitura pelo texto. Voz brasileira online é preferida a uma voz local em outro idioma. Vozes online podem depender de conexão e do processamento do mecanismo de síntese do dispositivo.

Os estados preparar/falar/pausar/encerrar acompanham eventos reais da fronteira TTS. Ao falar, o núcleo vibra e um balão “Falando...” aparece sobre ele; ao pausar, mostra “Leitura pausada”. Ao parar, falhar ou sair da tela/perfil, não continua indicando uma fala inexistente. Volume zero tem indicação própria. Eventos de uma sessão cancelada não reativam a próxima leitura. Android reinicia o parágrafo ao retomar, como já informava a interface.

## Personalidade e termos

O assistente reage a navegação, tema, etapas, versões, execução, testes e escolhas de avatar. Alternativas de prova recebem somente reconhecimento da escolha: a correção continua exclusiva do envio final.

Ao selecionar um termo dentro do conteúdo editorial, aparece uma explicação do glossário local. A consulta “Explorar termo” oferece o mesmo acesso por toque/teclado. O glossário cobre conceitos do currículo e informa quando não há definição; nesse caso pode mostrar o trecho da aula, sem inventar uma resposta. Seleções de código editável, campos de formulário, questões ou entre regiões são ignoradas. Nada é enviado a uma API de IA por essa função.

“Uma piada”, “Fingir braveza” e “Preciso de apoio” mudam expressão, mensagem e movimento. A braveza é lúdica e não pune erros. Ouvir a explicação exige toque explícito. Dicas automáticas são compactas; controles completos aparecem ao interagir com o núcleo ou explorar um termo. O balão e o indicador sempre acompanham o personagem. As dicas podem ser silenciadas, o personagem minimizado e suas animações pausadas.

## Visual e acessibilidade

Botões, seletores/listas de opções, sliders, caixas de seleção e botões de arquivo usam o desenho do Flow. Os seletores operam por teclado: setas, Home/End, busca por letras, Enter/Espaço, Escape e Tab. Menus não deslocam a página. O foco não é tomado por reações automáticas.

Há movimentos curtos na navegação, cards, respostas, avatares e controles, além de ondas, humor e vibração do assistente. `prefers-reduced-motion` desativa o movimento sem remover o feedback textual. Modais recolhem o assistente e preservam sua modalidade.

## Validação e limites

Os testes automatizados de voz usam fronteiras controladas de WebSpeech/Capacitor. Comprovam seleção de idioma, exclusão de vozes indevidas, eventos e estados, sessão única, cancelamento e interface; não comprovam qualidade sonora, audição física nem disponibilidade offline universal.

A suíte inclui fluxos de prova definitiva, recompensas e perfil da versão anterior. A revisão visual cobre 320, 390, 768 e 1440 px, paisagem 740×360, temas claro/escuro, teclado e menos movimento. Evidências e resultados finais ficam em `docs/evidencias/jarvis-0.4.0/`.

APK de depuração com identificador e chave anteriores. A execução em aparelho/emulador estável, incluindo TTS real instalado, continua pendente. Catálogo editorial, GPT e executor remoto mantêm os limites declarados no README.

Resultados da implementação: **153 testes frontend (28 arquivos), 64 testes API e 26 fluxos E2E** aprovados. Nas dez combinações de tamanho/tema, axe encontrou zero violações nas regras WCAG aplicadas; não houve overflow horizontal nem erro JavaScript. TypeScript e build de produção aprovados. Os testes de áudio continuam com mecanismo controlado, conforme o limite acima.

## Publicação verificada

Aplicação publicada a partir de `e7a6b3aef355aa9c516c5205f52dfe0f16693234` no deployment `dpl_2bFmKBuADAfxz4VCh5kKqLZQRYre`, estado READY, produção. [Abrir site](https://flow-programacao-guiada-anderhonoratos-projects.vercel.app).

A API pública retornou versão 0.4.0 e saúde disponível. A interação foi repetida no site público em Chromium móvel e desktop, com eventos de TTS controlados: zero erros, zero violações axe e voz inglesa somente por escolha explícita. A auditoria geral adicional passou em 20 telas; somada às dez combinações interativas, são 30 telas/estados locais verificados.

[APK de teste 0.4.0](https://github.com/AnderHonorato/Flow-Programa-o-Guiado/releases/tag/v0.4.0-teste): 10.629.775 bytes, SHA256 `0dc73438cdac93cf20d6877cce19bb10f5d3cc8db0361969d2361646606d7c57`. Build/lint Android concluídos: zero erros e oito avisos. Os 51 arquivos web do APK correspondem byte a byte ao build testado. Assinatura debug igual à anterior. O download público foi baixado novamente e o hash conferiu.

[Workflow de publicação do APK](https://github.com/AnderHonorato/Flow-Programa-o-Guiado/actions/runs/40841913877) concluído com sucesso. [CI da aplicação](https://github.com/AnderHonorato/Flow-Programa-o-Guiado/actions/runs/40841509591). A branch principal continua preservada e o PR permanece aberto.
