import { limiteArquivoFoto, limiteFotoCaracteres } from './avatar';

export interface FotoCarregada { imagem: HTMLImageElement; url: string; largura: number; altura: number }
export interface RecorteFoto { zoom: number; x: number; y: number }
export const recorteInicial: RecorteFoto = { zoom: 1, x: 0, y: 0 };

function dimensoesArquivo(bytes: Uint8Array, tipo: string): { largura: number; altura: number } | undefined {
  const texto = (inicio: number, fim: number) => String.fromCharCode(...bytes.slice(inicio, fim));
  const be16 = (p: number) => bytes[p] * 256 + bytes[p + 1];
  const be32 = (p: number) => bytes[p] * 0x1000000 + bytes[p + 1] * 65536 + bytes[p + 2] * 256 + bytes[p + 3];
  const le24 = (p: number) => bytes[p] + bytes[p + 1] * 256 + bytes[p + 2] * 65536;
  if (tipo === 'image/png' && bytes.length >= 24 && texto(0, 8) === '\x89PNG\r\n\x1a\n' && texto(12, 16) === 'IHDR') return { largura: be32(16), altura: be32(20) };
  if (tipo === 'image/jpeg' && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    let p = 2;
    while (p + 8 < bytes.length) {
      if (bytes[p++] !== 0xff) return;
      while (bytes[p] === 0xff) p++;
      const marcador = bytes[p++];
      if (marcador === 0xd9 || marcador === 0xda) return;
      if (marcador === 0x01 || marcador >= 0xd0 && marcador <= 0xd8) continue;
      const comprimento = be16(p);
      if (comprimento < 2 || p + comprimento > bytes.length) return;
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marcador)) return { largura: be16(p + 5), altura: be16(p + 3) };
      p += comprimento;
    }
  }
  if (tipo === 'image/webp' && bytes.length >= 30 && texto(0, 4) === 'RIFF' && texto(8, 12) === 'WEBP') {
    const formato = texto(12, 16);
    if (formato === 'VP8X') return { largura: le24(24) + 1, altura: le24(27) + 1 };
    if (formato === 'VP8L' && bytes[20] === 0x2f) return { largura: 1 + bytes[21] + ((bytes[22] & 0x3f) << 8), altura: 1 + (bytes[22] >> 6) + (bytes[23] << 2) + ((bytes[24] & 0x0f) << 10) };
    if (formato === 'VP8 ' && bytes[23] === 0x9d && bytes[24] === 1 && bytes[25] === 0x2a) return { largura: (bytes[26] + bytes[27] * 256) & 0x3fff, altura: (bytes[28] + bytes[29] * 256) & 0x3fff };
  }
}

export function verificarArquivoFoto(arquivo: Pick<File, 'type' | 'size'>, bytes: Uint8Array) {
  if (arquivo.size === 0 || arquivo.size > limiteArquivoFoto) throw new Error('Escolha uma imagem de até 8 MB.');
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(arquivo.type)) throw new Error('Use uma foto JPEG, PNG ou WebP. SVG e GIF não são aceitos.');
  const dimensoes = dimensoesArquivo(bytes, arquivo.type);
  if (!dimensoes || !dimensoes.largura || !dimensoes.altura) throw new Error('O arquivo não é uma imagem válida. Escolha outra foto.');
  if (dimensoes.largura * dimensoes.altura > 16_000_000 || Math.max(dimensoes.largura, dimensoes.altura) > 8192) throw new Error('A foto é muito grande. Escolha uma versão de até 16 megapixels.');
  return dimensoes;
}

export async function carregarFoto(arquivo: File): Promise<FotoCarregada> {
  if (arquivo.size > limiteArquivoFoto) throw new Error('Escolha uma imagem de até 8 MB.');
  const bytes = new Uint8Array(await arquivo.arrayBuffer());
  verificarArquivoFoto(arquivo, bytes);
  const url = URL.createObjectURL(arquivo);
  try {
    const imagem = new Image();
    imagem.decoding = 'async';
    await new Promise<void>((resolve, reject) => { imagem.onload = () => resolve(); imagem.onerror = () => reject(new Error('Não foi possível abrir a imagem. Tente outra foto.')); imagem.src = url; });
    if (!imagem.naturalWidth || !imagem.naturalHeight || imagem.naturalWidth * imagem.naturalHeight > 16_000_000 || Math.max(imagem.naturalWidth, imagem.naturalHeight) > 8192) throw new Error('A imagem excede o limite de 16 megapixels.');
    return { imagem, url, largura: imagem.naturalWidth, altura: imagem.naturalHeight };
  } catch (erro) { URL.revokeObjectURL(url); throw erro; }
}

export function calcularRecorte(largura: number, altura: number, recorte: RecorteFoto) {
  const zoom = Math.min(3, Math.max(1, recorte.zoom));
  const lado = Math.min(largura, altura) / zoom;
  const x = Math.min(100, Math.max(-100, recorte.x));
  const y = Math.min(100, Math.max(-100, recorte.y));
  return { lado, x: (largura - lado) * (x + 100) / 200, y: (altura - lado) * (y + 100) / 200 };
}

export function desenharRecorte(canvas: HTMLCanvasElement, foto: FotoCarregada, recorte: RecorteFoto, tamanho = 384) {
  canvas.width = tamanho; canvas.height = tamanho;
  const contexto = canvas.getContext('2d');
  if (!contexto) throw new Error('Seu dispositivo não conseguiu preparar a foto. Escolha um dos avatares desenhados.');
  const corte = calcularRecorte(foto.largura, foto.altura, recorte);
  contexto.clearRect(0, 0, tamanho, tamanho);
  contexto.fillStyle = '#e8edf7'; contexto.fillRect(0, 0, tamanho, tamanho);
  contexto.drawImage(foto.imagem, corte.x, corte.y, corte.lado, corte.lado, 0, 0, tamanho, tamanho);
}

/** Recria os pixels num canvas novo: dados EXIF, localização e arquivo original não seguem para o perfil. */
export function exportarFoto(foto: FotoCarregada, recorte: RecorteFoto): string {
  const canvas = document.createElement('canvas');
  for (const tamanho of [384, 256, 192]) {
    desenharRecorte(canvas, foto, recorte, tamanho);
    const resultado = canvas.toDataURL('image/png');
    if (resultado.startsWith('data:image/png;base64,') && resultado.length <= limiteFotoCaracteres) return resultado;
  }
  throw new Error('Não foi possível reduzir esta foto. Escolha outra imagem.');
}
