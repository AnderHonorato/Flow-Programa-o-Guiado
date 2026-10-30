# Aparência do perfil

`EditorAvatar` recebe `avatar`, `indiceNivel`, `perfilId` e `aoSalvar`. A escolha fica num rascunho até o botão Confirmar. A troca de perfil desmonta o editor, revoga URLs temporárias e impede respostas assíncronas do perfil anterior. Uma sincronização recebida durante a edição preserva a prévia; Cancelar volta à versão atual do perfil.

`AvatarPerfil`: `{ tipo: 'desenho' | 'foto' | 'emblema'; valor: string; atualizadoEm: string }`. O tipo e a função booleana `validarAvatar` são exportados de `avatar.ts`. `DesenhoAvatar({id,tamanho})` renderiza desenhos originais em SVG. O arquivo `avatar.ts` lista os 18 IDs aceitos e seus nomes, distribuídos entre Cartoon, Pixel e Games. Os emblemas usam os índices0–7 e exigem o nível correspondente.

Fotos aceitam JPEG, PNG e WebP, até8MB/16MP. As dimensões e a assinatura do formato são verificadas antes da decodificação. O recorte quadrado oferece zoom e deslocamento horizontal/vertical, com prévia dos pixels reais. Canvas recria os pixels em PNG384×384, reduzindo para256 ou192 se necessário para respeitar o teto de240.000caracteres. O arquivo original e seus metadados não integram o avatar salvo. URLs de foto são exclusivamente `data:image/png;base64,...`; URLs remotas e SVG são recusados.

A gravação e sincronização pertencem ao hook `useFlow`, passado como `aoSalvar`. O editor mostra falha sem apagar o rascunho. Recompensas/XP não mudam quando a aparência muda.

Testes locais: `npx vitest run aplicativos/web/src/perfil`. A inspeção em Chromium incluiu foto JPEG, deslocamento de recorte com conferência de pixel, PNG salvo, recarga persistente, cancelar alterações, rejeição de arquivo disfarçado e auditoria de acessibilidade.
