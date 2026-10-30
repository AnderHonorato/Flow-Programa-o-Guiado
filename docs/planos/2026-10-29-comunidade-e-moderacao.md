# Comunidade, gestão de acesso e experiência — 0.5.0

A entrega mantém o endereço público existente (acessível fora da rede local), e adiciona caminho na barra lateral para comunidade/ranking. Padrão adotado: somente contas autenticadas podem consultar nomes, avatar ilustrado, XP, leituras registradas, aulas concluídas e reconhecimentos auditados. E-mails, fotos e motivos de restrição não são publicados no ranking.

Fatias: (1) endpoints/tabelas/permissões e migração aditiva; (2) ranking e perfis; (3) opinião por estrelas/comentário no fim de cada aula e leitura na administração; (4) gestão de contas com motivo/prazo e sessão revogada; (5) entrada visual e verificação real do login; (6) categorias e animações evolutivas das conquistas.

Uma visita em Aprender é registrada após20segundos visíveis, uma vez por abertura, com fila offline idempotente separada por perfil. É um indicador de uso, sem XP adicional nem prova absoluta de leitura. Opinião não modifica avaliação acadêmica nem XP. Certificados continuam dependendo de aprovação administrativa auditada.

Bloquear marca todas as sessões como revogadas e o servidor verifica estado em cada pedido. A interface verifica a sessão a cada20segundos visíveis e ao retomar foco. Sem rede não existe expulsão remota instantânea: dados locais ficam preservados; operações online já são recusadas. Expiração/reativação não restauram tokens antigos. Excluir aluno remove dados privados, com confirmação do e-mail e motivo. Contas administrativas ficam protegidas para preservar autoria/auditoria.

A verificação de entrada acompanha credenciais, GET/eu e abertura real dos dados. Não simula antivírus ou detecção universal de roubo. Servidor mantém validação, autorização, auditoria e limite persistente de tentativas inválidas.

Delegação autorizada pelo prompt mestre: backend, comunidade/admin/avaliação visual e entrada/conquistas. Raiz integra sessão, leitura offline, navegação, testes completos, banco e publicação. Preservar main, privacidade do Drive, assinatura Android e limites editoriais existentes.
