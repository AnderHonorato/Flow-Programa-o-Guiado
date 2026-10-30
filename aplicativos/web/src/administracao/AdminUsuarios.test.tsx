// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AdminUsuarios from './AdminUsuarios';
import AdminAvaliacoes from './AdminAvaliacoes';
import type { Flow } from '../componentes/useFlow';
import { requisitar } from '../componentes/api';
import type { UsuarioAdmin } from '../comunidade/tipos';
vi.mock('../componentes/api', () => ({ requisitar: vi.fn() }));
let raiz: Root, elemento: HTMLDivElement;
const usuario = { id: 'lia', nome: 'Lia', email: 'lia@example.test', papel: 'aluno', estado: 'ativo', motivo: null, ate: null, criadoEm: '2026-10-29T10:00:00Z', xp: 0, nivel: 1, nomeNivel: 'Aprendiz', concluidas: 0, aulasConcluidas: [], leituras: 0, maisLidas: [], certificados: [], posicao: 1 } as UsuarioAdmin;
const flow = (admin = true) => ({ perfilId: 'admin', online: true, sessao: { token: 'token-admin', usuario: { id: 'admin', nome: 'Admin', papel: admin ? 'admin' : 'aluno' } }, setAviso: vi.fn() }) as unknown as Flow;
async function montar() { await act(async () => raiz.render(<AdminUsuarios flow={flow()}/>)); await act(async () => elemento.querySelector<HTMLButtonElement>('[aria-label="Gerenciar usuário Lia"]')!.click()); }
async function mudar(campo: HTMLInputElement | HTMLTextAreaElement, valor: string) { await act(async () => { Object.getOwnPropertyDescriptor(campo instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, 'value')!.set!.call(campo, valor); campo.dispatchEvent(new Event('input', { bubbles: true })); }); }
const botao = (texto: string) => [...elemento.querySelectorAll<HTMLButtonElement>('button')].find(b => b.textContent?.includes(texto))!;
beforeEach(() => { Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true }); vi.clearAllMocks(); elemento = document.createElement('div'); document.body.append(elemento); raiz = createRoot(elemento); vi.mocked(requisitar).mockImplementation(async caminho => caminho.startsWith('/admin/usuarios?') ? { usuarios: [usuario], total: 1, pagina: 1, tamanho: 20 } : usuario); });
afterEach(async () => { await act(async () => raiz.unmount()); elemento.remove(); });
describe('administração de usuários e opiniões', () => {
  it('não consulta dados administrativos para alunos', async () => {
    await act(async () => raiz.render(<><AdminUsuarios flow={flow(false)}/><AdminAvaliacoes flow={flow(false)}/></>));
    expect(elemento.textContent).toContain('restrita'); expect(requisitar).not.toHaveBeenCalled();
  });
  it('exige motivo e confirma exclusão pelo e-mail exato', async () => {
    await montar(); await act(async () => botao('Quero apagar esta conta').click());
    expect(botao('Apagar usuário definitivamente').disabled).toBe(true);
    await mudar(elemento.querySelector('textarea')!, 'Solicitação do titular.');
    await mudar(elemento.querySelector<HTMLInputElement>('input[type=email]')!, 'errado@example.test');
    expect(botao('Apagar usuário definitivamente').disabled).toBe(true);
    await mudar(elemento.querySelector<HTMLInputElement>('input[type=email]')!, usuario.email);
    expect(botao('Apagar usuário definitivamente').disabled).toBe(false);
    await act(async () => elemento.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    const chamada = vi.mocked(requisitar).mock.calls.find(c => c[2]?.method === 'DELETE')!;
    expect(chamada[1]).toBe('token-admin'); expect(JSON.parse(String(chamada[2]?.body))).toEqual({ motivo: 'Solicitação do titular.', confirmacao: usuario.email });
  });
  it('envia banimento com motivo e prazo e mantém o servidor como autoridade', async () => {
    await montar();
    await act(async () => elemento.querySelector<HTMLButtonElement>('[role=combobox]')!.click());
    await act(async () => [...document.querySelectorAll<HTMLElement>('[role=option]')].find(e => e.textContent?.includes('Banida'))!.click());
    await mudar(elemento.querySelector('textarea')!, 'Violação das regras da comunidade.');
    await act(async () => elemento.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    const chamada = vi.mocked(requisitar).mock.calls.find(c => c[2]?.method === 'PATCH')!;
    const corpo = JSON.parse(String(chamada[2]?.body));
    expect(corpo.estado).toBe('banido'); expect(corpo.motivo).toBe('Violação das regras da comunidade.');
    expect(Date.parse(corpo.ate)).toBeGreaterThan(Date.now() + 23 * 3600000);
    expect(chamada[0]).toBe('/admin/usuarios/lia/estado');
  });
  it('mostra pontuação e comentário enviados à administração como texto', async () => {
    vi.mocked(requisitar).mockResolvedValue({ avaliacoes: [{ id: 'op', aulaId: 'html', nota: 4, comentario: '<script>alert(1)</script>', criadaEm: '2026-10-29T10:00:00Z', atualizadaEm: '2026-10-29T10:00:00Z', usuarioId: 'lia', usuarioNome: 'Lia', tituloAula: 'HTML' }], total: 1, pagina: 1, tamanho: 20, media: 4 });
    await act(async () => raiz.render(<AdminAvaliacoes flow={flow()}/>)); expect(elemento.textContent).toContain('<script>alert(1)</script>'); expect(elemento.querySelector('script')).toBeNull(); expect(elemento.querySelector('[aria-label="4 de 5 estrelas"]')).toBeTruthy();
  });
});
