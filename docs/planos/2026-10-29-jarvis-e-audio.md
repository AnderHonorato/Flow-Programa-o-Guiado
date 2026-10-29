# J.A.R.V.I.S e interação — 0.4.0

Pedido: corrigir o nome, priorizar áudio brasileiro, oferecer inglês, desenhar os controles e associar fala real a vibração e balão. Dar personalidade ao assistente, explicar palavras selecionadas e ampliar o movimento do app.

Implementação escolhida: manter React/Capacitor e as vozes já disponíveis no aparelho, coordenadas por um único AudioProvider. Não adicionar provedor pago nem enviar conteúdo selecionado para uma IA. Português do Brasil é padrão estrito; inglês depende de escolha explícita. Sem voz compatível, mostrar instrução de instalação. A voz inglesa não traduz aulas em português.

1. Consolidar o narrador e seus eventos reais, cancelamentos e idiomas; proteger a ponte Android.
2. Integrar J.A.R.V.I.S à leitura; adicionar reações, humor, seleção editorial e consulta de termos por teclado/toque. Glossário local, com desconhecidos identificados honestamente.
3. Padronizar botões, seletores, caixas de seleção e sliders; adicionar movimentos curtos e opção de menos movimento.
4. Verificar idiomas, eventos atrasados, saída da tela, limites de seleção, foco, avaliações definitivas e leitura em navegador real. Rodar suites, conferir telas móvel/tablet/desktop e acessibilidade.
5. Publicar web/APK de teste com versão e evidências. Preservar dados, assinatura Android, branch principal e limites conhecidos.

Divisão autorizada pelo prompt mestre (seção 2): agente de áudio/ponte nativa; agente de mascote/glossário; integração/controles/verificação/entrega pela raiz. Responsabilidades em arquivos distintos.
