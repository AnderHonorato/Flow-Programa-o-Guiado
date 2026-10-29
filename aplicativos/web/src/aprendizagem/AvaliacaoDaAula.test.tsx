// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AvaliacaoDaAula from './AvaliacaoDaAula';
import type { Flow } from '../componentes/useFlow';
import { requisitar } from '../componentes/api';
vi.mock('../componentes/api', () => ({ requisitar: vi.fn() }));
let raiz: Root, elemento: HTMLDivElement;
const flow = (id = 'aluno-a', online = true) => ({ perfilId: id, online, sessao: { token: 'token-' + id, usuario: { id, nome: id, papel: 'aluno', email: id + '@example.test' } } }) as unknown as Flow;
async function montar(f = flow()) { await act(async () => raiz.render(<AvaliacaoDaAula aulaId="html-primeira-pagina" titulo="Minha primeira página" flow={f}/>)); }
async function texto(valor: string) { const campo = elemento.querySelector('textarea')!; await act(async () => { Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(campo, valor); campo.dispatchEvent(new Event('input', { bubbles: true })); }); }
const enviar = () => elemento.querySelector<HTMLButtonElement>('button[type=submit]')!;
beforeEach(() => { Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true }); sessionStorage.clear(); vi.clearAllMocks(); elemento = document.createElement('div'); document.body.append(elemento); raiz = createRoot(elemento); vi.mocked(requisitar).mockResolvedValue(null); });
afterEach(async () => { await act(async () => raiz.unmount()); elemento.remove(); sessionStorage.clear(); });
describe('opinião da aula para a administração', () => {
  it('exige estrelas e comentário, envia o conteúdo certo e confirma somente após resposta', async () => {
    await montar(); expect(enviar().disabled).toBe(true);
    await act(async () => elemento.querySelector<HTMLButtonElement>('[aria-label="5 estrelas"]')!.click()); await texto('Os exemplos ajudaram muito.');
    expect(enviar().disabled).toBe(false);
    const resultado = { id: 'opiniao-1', aulaId: 'html-primeira-pagina', nota: 5, comentario: 'Os exemplos ajudaram muito.', criadaEm: new Date().toISOString(), atualizadaEm: new Date().toISOString() };
    let confirmar!: (valor: unknown) => void; vi.mocked(requisitar).mockImplementationOnce(() => new Promise(resolve => { confirmar = resolve; }));
    await act(async () => elemento.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    expect(elemento.textContent).not.toContain('Opinião enviada à administração'); expect(enviar().disabled).toBe(true);
    const [, token, opcoes] = vi.mocked(requisitar).mock.calls.at(-1)!;
    expect(token).toBe('token-aluno-a'); expect(opcoes?.method).toBe('PUT'); expect(JSON.parse(String(opcoes?.body))).toEqual({ nota: 5, comentario: 'Os exemplos ajudaram muito.' });
    await act(async () => confirmar(resultado)); expect(elemento.textContent).toContain('Opinião enviada à administração'); expect(enviar().textContent).toContain('Atualizar opinião');
  });
  it('preserva o rascunho na falha sem anunciar envio', async () => {
    await montar(); await act(async () => elemento.querySelector<HTMLButtonElement>('[aria-label="3 estrelas"]')!.click()); await texto('Quero mais exemplos.');
    vi.mocked(requisitar).mockRejectedValueOnce(new Error('Servidor indisponível'));
    await act(async () => elemento.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    expect(elemento.querySelector('textarea')?.value).toBe('Quero mais exemplos.'); expect(elemento.querySelector('[role=alert]')?.textContent).toContain('Servidor indisponível'); expect(elemento.textContent).not.toContain('Opinião enviada à administração');
  });
  it('não exibe nem envia o rascunho de outra conta ao trocar perfil', async () => {
    await montar(); await texto('Texto privado da conta A'); await act(async () => elemento.querySelector<HTMLButtonElement>('[aria-label="4 estrelas"]')!.click());
    expect(sessionStorage.getItem('flow.opiniao:aluno-a:html-primeira-pagina')).toContain('Texto privado');
    await montar(flow('aluno-b')); expect(elemento.querySelector('textarea')?.value).toBe(''); expect(elemento.textContent).not.toContain('Texto privado'); expect(enviar().disabled).toBe(true);
    await montar(flow('aluno-a')); expect(elemento.querySelector('textarea')?.value).toBe('Texto privado da conta A');
  });
  it('mantém a opinião anterior persistida e bloqueia envio offline ou sem conta', async () => {
    vi.mocked(requisitar).mockResolvedValue({ id: 'a', nota: 2, comentario: 'Mais prática, por favor.' });
    await montar(); expect(elemento.querySelector('textarea')?.value).toBe('Mais prática, por favor.'); expect(elemento.querySelector('[aria-label="2 estrelas"]')?.getAttribute('aria-pressed')).toBe('true');
    await montar(flow('aluno-a', false)); expect(enviar().disabled).toBe(true);
    await montar({ ...flow('visitante'), sessao: null } as Flow); expect(elemento.textContent).toContain('Entre em uma conta'); expect(enviar().disabled).toBe(true);
  });
});
