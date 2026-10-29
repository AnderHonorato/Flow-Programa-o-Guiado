// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import EditorAvatar from './EditorAvatar';
import type { AvatarPerfil } from './avatar';
let elemento: HTMLDivElement;
let raiz: ReturnType<typeof createRoot>;
const avatar: AvatarPerfil = { tipo: 'desenho', valor: 'cartoon-gato', atualizadoEm: '2026-10-29T12:00:00Z' };
const botao = (texto: string) => [...elemento.querySelectorAll('button')].find(b => b.textContent?.trim() === texto)!;
beforeEach(() => { Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true }); elemento = document.createElement('div'); document.body.append(elemento); raiz = createRoot(elemento); });
afterEach(async () => { await act(async () => raiz.unmount()); elemento.remove(); });
it('mostra prévia, deixa alternar estilos e só persiste após confirmação', async () => {
  const salvar = vi.fn(); await act(async () => raiz.render(<EditorAvatar avatar={avatar} indiceNivel={1} perfilId="a" aoSalvar={salvar}/>));
  expect(elemento.querySelector('.perfil-avatar-previa strong')?.textContent).toBe('Gato Nuvem');
  await act(async () => botao('Pixel').click()); expect(elemento.querySelectorAll('.perfil-avatar-item')).toHaveLength(6);
  await act(async () => elemento.querySelector<HTMLButtonElement>('[aria-label="Escolher avatar Mago Pixel"]')!.click());
  expect(salvar).not.toHaveBeenCalled(); expect(elemento.querySelector('.perfil-avatar-previa strong')?.textContent).toBe('Mago Pixel');
  await act(async () => botao('Confirmar avatar').click()); expect(salvar).toHaveBeenCalledOnce(); expect(salvar.mock.calls[0][0]).toMatchObject({ tipo: 'desenho', valor: 'pixel-mago' });
});
it('cancelar mantém a escolha anterior e emblemas bloqueados não podem ser selecionados', async () => {
  const salvar = vi.fn(); await act(async () => raiz.render(<EditorAvatar avatar={avatar} indiceNivel={0} perfilId="a" aoSalvar={salvar}/>));
  await act(async () => elemento.querySelector<HTMLButtonElement>('[aria-label="Escolher avatar Raposa Aurora"]')!.click());
  await act(async () => botao('Cancelar alterações').click()); expect(elemento.querySelector('.perfil-avatar-previa strong')?.textContent).toBe('Gato Nuvem');
  await act(async () => botao('Conquistados').click()); expect(elemento.querySelector<HTMLButtonElement>('[aria-label^="Explorador:"]')!.disabled).toBe(true);
  await act(async () => elemento.querySelector<HTMLButtonElement>('[aria-label^="Explorador:"]')!.click()); expect(salvar).not.toHaveBeenCalled();
});
it('erro ao salvar preserva o rascunho e permite nova tentativa', async () => {
  const salvar = vi.fn().mockRejectedValueOnce(new Error('Sem espaço para salvar.')).mockResolvedValue(undefined);
  await act(async () => raiz.render(<EditorAvatar avatar={avatar} indiceNivel={0} perfilId="a" aoSalvar={salvar}/>));
  await act(async () => elemento.querySelector<HTMLButtonElement>('[aria-label="Escolher avatar Raposa Aurora"]')!.click());
  await act(async () => botao('Confirmar avatar').click()); expect(elemento.querySelector('[role=alert]')?.textContent).toContain('Sem espaço');
  expect(elemento.querySelector('.perfil-avatar-previa strong')?.textContent).toBe('Raposa Aurora');
  await act(async () => botao('Confirmar avatar').click()); expect(salvar).toHaveBeenCalledTimes(2); expect(elemento.querySelector('[role=alert]')).toBeNull();
});
it('não transfere rascunhos nem mensagens de gravação atrasada entre perfis', async () => {
  let concluir!: () => void; const salvar = vi.fn(() => new Promise<void>(r => concluir = r));
  await act(async () => raiz.render(<EditorAvatar avatar={avatar} indiceNivel={0} perfilId="a" aoSalvar={salvar}/>));
  await act(async () => botao('Confirmar avatar').click());
  await act(async () => raiz.render(<EditorAvatar avatar={{ ...avatar, valor: 'games-ranger' }} indiceNivel={0} perfilId="b" aoSalvar={vi.fn()}/>));
  await act(async () => concluir());
  expect(elemento.querySelector('.perfil-avatar-previa strong')?.textContent).toBe('Ranger Verde');
  expect(elemento.textContent).not.toContain('Perfil atualizado.'); expect(botao('Confirmar avatar').disabled).toBe(false);
});

it('preserva a prévia não confirmada quando uma sincronização atualiza o avatar', async () => {
  const salvar = vi.fn(); await act(async () => raiz.render(<EditorAvatar avatar={avatar} indiceNivel={0} perfilId="a" aoSalvar={salvar}/>));
  await act(async () => elemento.querySelector<HTMLButtonElement>('[aria-label="Escolher avatar Raposa Aurora"]')!.click());
  await act(async () => raiz.render(<EditorAvatar avatar={{ ...avatar, valor: 'games-ranger' }} indiceNivel={0} perfilId="a" aoSalvar={salvar}/>));
  expect(elemento.querySelector('.perfil-avatar-previa strong')?.textContent).toBe('Raposa Aurora'); expect(elemento.querySelector('[role=status]')?.textContent).toContain('prévia foi preservada');
  await act(async () => botao('Cancelar alterações').click()); expect(elemento.querySelector('.perfil-avatar-previa strong')?.textContent).toBe('Ranger Verde');
});
