import { describe, expect, it } from 'vitest';
import { desenhosAvatar, dimensoesPng, validarAvatar } from './avatar';
import { calcularRecorte, verificarArquivoFoto } from './foto';
const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6KwAAAABJRU5ErkJggg==';
const data = '2026-10-29T12:00:00.000Z';

describe('aparência de perfil', () => {
  it('oferece18 desenhos originais com6por estilo eIDs únicos', () => {
    expect(new Set(desenhosAvatar.map(d => d.id)).size).toBe(18);
    for (const estilo of ['Cartoon', 'Pixel', 'Games']) expect(desenhosAvatar.filter(d => d.estilo === estilo)).toHaveLength(6);
    for (const desenho of desenhosAvatar) expect(validarAvatar({ tipo: 'desenho', valor: desenho.id, atualizadoEm: data })).toBe(true);
  });
  it('aceita apenas PNG raster limitado e datas com fuso', () => {
    expect(dimensoesPng(png)).toEqual({ largura: 1, altura: 1 });
    expect(validarAvatar({ tipo: 'foto', valor: png, atualizadoEm: data })).toBe(true);
    for (const valor of ['data:image/svg+xml,<svg/>', 'https://rastreio.test/foto.png', png.replace('png', 'jpeg'), 'data:image/png;base64,AAAA', 'data:image/png;base64,' + 'A'.repeat(240000)]) expect(validarAvatar({ tipo: 'foto', valor, atualizadoEm: data })).toBe(false);
    expect(validarAvatar({ tipo: 'desenho', valor: desenhosAvatar[0].id, atualizadoEm: '2026-10-29T12:00:00' })).toBe(false);
    expect(validarAvatar({ tipo: 'desenho', valor: 'personagem-não-autorizado', atualizadoEm: data })).toBe(false);
  });
  it('não permite equipar emblema ainda bloqueado nem tipo inválido', () => {
    expect(validarAvatar({ tipo: 'emblema', valor: '1', atualizadoEm: data }, 1)).toBe(true);
    for (const valor of ['2', '-1', '1.5', '01', '8']) expect(validarAvatar({ tipo: 'emblema', valor, atualizadoEm: data }, 1)).toBe(false);
    expect(validarAvatar({ tipo: 'externo', valor: png, atualizadoEm: data })).toBe(false);
  });
});

describe('prévia de recorte e entrada de fotos', () => {
  it('mantém o corte dentro da foto ao aproximar e mover até os extremos', () => {
    expect(calcularRecorte(600, 300, { zoom: 1, x: -100, y: 0 })).toEqual({ lado: 300, x: 0, y: 0 });
    expect(calcularRecorte(600, 300, { zoom: 1, x: 100, y: 0 })).toEqual({ lado: 300, x: 300, y: 0 });
    const aproximado = calcularRecorte(600, 300, { zoom: 2, x: 100, y: -100 });
    expect(aproximado).toEqual({ lado: 150, x: 450, y: 0 });
    expect(calcularRecorte(300, 600, { zoom: 50, x: -500, y: 900 })).toEqual({ lado: 100, x: 0, y: 500 });
  });
  it('rejeita arquivo disfarçado, formato ativo, tamanho excessivo e dimensão abusiva antes de decodificar', () => {
    const bytes = Uint8Array.from(atob(png.slice(22)), c => c.charCodeAt(0));
    expect(verificarArquivoFoto({ type: 'image/png', size: bytes.length }, bytes)).toEqual({ largura: 1, altura: 1 });
    expect(() => verificarArquivoFoto({ type: 'image/png', size: 20 }, new TextEncoder().encode('<svg></svg>'))).toThrow('válida');
    expect(() => verificarArquivoFoto({ type: 'image/gif', size: 20 }, bytes)).toThrow('JPEG');
    expect(() => verificarArquivoFoto({ type: 'image/png', size: 9 * 1024 * 1024 }, bytes)).toThrow('8 MB');
    const enorme = bytes.slice(); enorme.set([0, 1, 0, 0], 16); enorme.set([0, 1, 0, 0], 20);
    expect(() => verificarArquivoFoto({ type: 'image/png', size: enorme.length }, enorme)).toThrow('16 megapixels');
  });
});
