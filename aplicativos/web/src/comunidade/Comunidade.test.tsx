// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Comunidade from './Comunidade';
import type { Flow } from '../componentes/useFlow';
import { requisitar } from '../componentes/api';
import type { PerfilComunidade } from './tipos';
vi.mock('../componentes/api', () => ({ requisitar: vi.fn() }));
let raiz: Root, elemento: HTMLDivElement;
const flow = (id = 'a') => ({ perfilId: id, online: true, sessao: { token: 'token-' + id, usuario: { id, nome: id, papel: 'aluno' } } }) as unknown as Flow;
const perfil = { id: 'lia', nome: 'Lia', xp: 120, nivel: 2, nomeNivel: 'Explorador', concluidas: 1, aulasConcluidas: [{ id: 'html', titulo: 'Primeira página' }], leituras: 3, maisLidas: [{ aulaId: 'html', titulo: 'HTML por dentro', leituras: 3, segundos: 80 }], certificados: [{ codigo: 'FLOW-CERT-QA', titulo: 'Página aprovada', aulaId: 'html', emitidoEm: '2026-10-29T09:00:00Z' }], posicao: 1 } as PerfilComunidade;
beforeEach(() => { Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true }); vi.clearAllMocks(); elemento = document.createElement('div'); document.body.append(elemento); raiz = createRoot(elemento); });
afterEach(async () => { await act(async () => raiz.unmount()); elemento.remove(); });
describe('ranking e perfis de aprendizagem', () => {
  it('exige sessão e não consulta dados do ranking para visitante', async () => {
    await act(async () => raiz.render(<Comunidade flow={{ ...flow(), sessao: null } as Flow}/>));
    expect(elemento.textContent).toContain('Entre para conhecer'); expect(requisitar).not.toHaveBeenCalled();
  });
  it('mostra conquistas, leituras e certificados sem divulgar email ou foto', async () => {
    vi.mocked(requisitar).mockImplementation(async caminho => caminho.startsWith('/comunidade?') ? { usuarios: [{ ...perfil, email: 'privado@example.test', avatar: { tipo: 'foto', valor: 'data:image/png;base64,privado' } }], total: 1, pagina: 1, tamanho: 20 } : perfil);
    await act(async () => raiz.render(<Comunidade flow={flow()}/>));
    expect(elemento.textContent).toContain('120 XP'); expect(elemento.textContent).not.toContain('privado@example.test'); expect(elemento.querySelector('img')).toBeNull();
    await act(async () => elemento.querySelector<HTMLButtonElement>('[aria-label="Ver perfil de Lia"]')!.click());
    expect(elemento.textContent).toContain('HTML por dentro'); expect(elemento.textContent).toContain('Primeira página'); expect(elemento.textContent).toContain('FLOW-CERT-QA');
    expect(document.activeElement?.textContent).toBe('Lia');
  });
  it('ignora resposta atrasada da conta anterior', async () => {
    let responder!: (valor: unknown) => void; vi.mocked(requisitar).mockImplementationOnce(() => new Promise(resolve => { responder = resolve; })).mockResolvedValue({ usuarios: [], total: 0, pagina: 1, tamanho: 20 });
    await act(async () => raiz.render(<Comunidade flow={flow('a')}/>));
    const signal = vi.mocked(requisitar).mock.calls[0][2]?.signal!;
    await act(async () => raiz.render(<Comunidade flow={flow('b')}/>));
    expect(signal.aborted).toBe(true);
    await act(async () => responder({ usuarios: [perfil], total: 1, pagina: 1, tamanho: 20 }));
    expect(elemento.textContent).not.toContain('Lia'); expect(elemento.textContent).toContain('Nenhum participante encontrado');
  });
});
