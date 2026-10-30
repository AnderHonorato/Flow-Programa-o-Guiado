# Identidade Flow e J.A.R.V.IS.

Flow representa progresso construído em pequenos passos. Seu símbolo original combina três degraus ascendentes e um arco aberto: aprender, praticar e continuar. A marca utiliza um desenho geométrico próprio, sem monogramas ou logotipos retirados das referências. O ícone foi desenhado em SVG e exportado em PNG de 192 e 512 pixels, com transparência real fora dos cantos arredondados.

## Referências examinadas

Foram lidos os arquivos textuais do pacote, incluindo o prompt mestre, os manifestos, os manuais, as licenças, os tokens, o UI kit, a demonstração web, os scripts de fontes, o site de exemplo e os dois arquivos do Portal Ferramentas do Ander. O HTML do portal foi examinado por trechos; seus cinco arquivos de fonte e duas capas WebP embutidos foram decodificados e inventariados por tamanho e SHA-256. Strings binárias não foram tratadas como instruções de produto.

Os dois boards de `07-apresentacao/` foram abertos e examinados visualmente. Eles apresentam a marca Anthropic, arquitetura serena, cores quentes, tipografia editorial e exemplos de UI. O manual explicita que seus logos foram extraídos de uma referência raster. Nenhum desses logos, nomes, fotografias ou fontes comerciais foi incorporado à identidade Flow.

O inventário completo está em `recursos/jarvis-pixel-art/inventario-referencias.json`: 44 arquivos físicos do pacote e sete recursos binários embutidos no HTML, com tamanho e hash SHA-256. Os ZIPs originais também estão inventariados. Esse registro permite conferir exatamente qual material fornecido foi utilizado como referência.

Do board foram aproveitados princípios: respiro, títulos fortes, linhas finas, superfícies de papel e terracota com uso moderado. Do site de exemplo: adaptação responsiva e mudança de tema. Do portal: linguagem direta, orientação contextual e controles explícitos para animações. Os contadores demonstrativos e os logos desses exemplos não foram copiados.

## Cor, tipografia e iconografia

Base clara `#F5F2ED`, papel `#FFFAF5`, tinta `#2F2522`, terracota `#D97757` e vinho `#8F2D4A`. O vinho permite rótulos pequenos e ações com contraste melhor sobre papel. A terracota é reservada para ilustrações, detalhes e destaques; texto pequeno precisa de contraste verificado. Os componentes do mascote herdam os tokens semânticos do produto, com valores de fallback. Inter Variable e fonte de código são empacotadas localmente pela aplicação; o mascote não depende de fontes, rede ou bibliotecas de animação.

`Icone.tsx` fornece uma biblioteca própria com grade 24×24, traço 1,7, pontas arredondadas e `currentColor`. Os ícones são decorativos para leitores de tela; botões e links devem ter rótulos textuais ou `aria-label`. Nomes disponíveis: inicio, trilhas, aula, codigo, revisao, projetos, perfil, admin, seta, play, pausa, sol, lua, check, download, rede, sair, fechar, som, menu, livro, raio, alvo, terminal, escudo, mais, busca.

## Personagem original

J.A.R.V.IS. é um pequeno companheiro em pixel art 2D. Corpo terracota com cantos escalonados, rosto de papel creme, antena em forma de broto, pés e lenço vinho. A grade de 64×64 mantém bordas intencionais e leitura em tamanhos pequenos. Não representa um personagem cinematográfico ou assistente de outra marca.

São onze estados: curioso, alegre, explicando, pensando, concentrado, orgulhoso, surpreso, preocupado, comemorando, descansando e apoiando. A expressão muda por olhos, sobrancelhas, boca, pose e acessórios. A folha `spritesheet.png` possui 256×704 pixels: quatro colunas de quadros (repouso, piscar, respirar, reagir) e onze linhas na ordem indicada em `spritesheet.json`. Cada estado também possui SVG independente. A prancha `prancha-estados.png` facilita inspeção e aprovação visual.

O componente React desenha SVG real, com animações CSS de piscar, respirar, chegada, apontar, pular, inclinar e apoiar. Estado de comemoração mostra confetes de pixel por tempo limitado. Mensagens são curtas, contextuais e não atribuem valor pessoal ao desempenho. O componente não tem temporizador de mensagens aleatórias e não executa fala ou som automaticamente.

API compartilhada:

```tsx
import Jarvis, { type EstadoJarvis } from './mascote/Jarvis';
import Icone from './componentes/Icone';

<Jarvis estado="apoiando" mensagem="Observe o fechamento da tag h1." compacto />
<Icone nome="codigo" tamanho={20} className="icone" />
```

Ambos também têm exports nomeados. Props do mascote: `estado?: EstadoJarvis`, `mensagem?: string`, `compacto?: boolean`. O CSS é importado pelo componente.

Minimizar, silenciar dicas e pausar animações são ações reais, persistidas nas chaves `flow.jarvis.minimizado`, `flow.jarvis.silenciado` e `flow.jarvis.pausado`. Ao minimizar, um botão acessível permite reabrir. Silenciar remove o balão e o anúncio `aria-live`; não é um controle de áudio, pois o mascote não emite áudio. Preferência de movimento reduzido desativa todas as animações. Os controles são acessíveis por teclado e têm foco visível. Falha de armazenamento não impede a interface de funcionar.

## Exportação e verificação

`python recursos/jarvis-pixel-art/gerar-recursos.py` reproduz os SVGs, a folha PNG, a prancha e os PNGs do ícone; requer CairoSVG e Pillow. A exportação parte de geometria original e não altera imagens das referências.

Verificações executadas em 25/10/2026:

- TypeScript estrito dos dois componentes: passou, com `tsc --noEmit --strict --skipLibCheck --jsx react-jsx --lib ES2022,DOM --esModuleInterop --moduleResolution bundler --module ESNext`.
- PNGs exportados e abertos para inspeção visual: mascote legível, onze estados visíveis, símbolo original de degraus/arco.
- XML dos SVGs, dimensões PNG, canal alpha real e quatro quadros diferentes em cada estado: verificados por script.

A integração de controles e animações no navegador precisa ser considerada junto aos testes ponta a ponta da aplicação. A inspeção dos arquivos de arte não comprova, por si só, compatibilidade com todos os dispositivos Android.
