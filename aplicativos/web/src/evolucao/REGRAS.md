# Evolução no Flow

O XP é derivado de resultados: 100 por competência registrada em uma aula única e 10 por resposta correta registrada após o envio da avaliação. Reabrir a aula, repetir uma conclusão e sincronizar não somam novos pontos.

| Nível | Nome | XP mínimo |
| --- | --- | ---: |
| 1 | Faísca | 0 |
| 2 | Explorador | 100 |
| 3 | Construtor | 280 |
| 4 | Inventor | 600 |
| 5 | Arquiteto | 1000 |
| 6 | Especialista | 1400 |
| 7 | Visionário | 1750 |
| 8 | Luminar | 2000 |

O último nível pode ser alcançado com as vinte competências publicadas, mesmo que o aluno tenha cometido erros nas avaliações. Os níveis não prometem diploma ou domínio profissional.

Seis emblemas celebram: primeiro acerto, primeira competência e competências em três, cinco, dez e vinte aulas diferentes. Os SVGs são originais. Os graus superiores acrescentam molduras, asas geométricas, anéis, gemas e estrelas.

Cada nível libera um ícone equipável. A escolha fica no recurso IndexedDB `evolucao:icone` por perfil e acompanha a exportação/importação dos dados. Ela não é enviada automaticamente ao servidor como atributo de conta. Ícones importados sem o nível necessário voltam ao inicial. Emblemas e níveis são derivados do progresso, não precisam de um segundo saldo persistido.

Componentes de integração:

```tsx
<ResumoEvolucao estado={flow.estado} perfilId={flow.perfilId} compacto />
<AvatarEvolucao estado={flow.estado} perfilId={flow.perfilId} tamanho={48} />
<CelebracaoEvolucao estado={flow.estado} perfilId={flow.perfilId} pronto={!flow.carregando} />
```

`GaleriaEvolucao` já está no perfil. `CelebracaoEvolucao` pode ser montado uma vez no shell e mostra uma celebração dispensável ao conquistar emblema ou subir de nível. Não dispara na hidratação nem na troca de perfil. As animações respeitam `prefers-reduced-motion`.
