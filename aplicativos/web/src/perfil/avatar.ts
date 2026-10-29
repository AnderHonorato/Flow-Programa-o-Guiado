export interface AvatarPerfil {
  tipo: 'desenho' | 'foto' | 'emblema';
  valor: string;
  atualizadoEm: string;
}

export const desenhosAvatar = [
  { id: 'cartoon-raposa', nome: 'Raposa Aurora', estilo: 'Cartoon', cor: '#ffb76d', fundo: '#512f68' },
  { id: 'cartoon-gato', nome: 'Gato Nuvem', estilo: 'Cartoon', cor: '#e7d7ff', fundo: '#28546b' },
  { id: 'cartoon-coruja', nome: 'Coruja Lume', estilo: 'Cartoon', cor: '#d8b2ff', fundo: '#41386f' },
  { id: 'cartoon-astronauta', nome: 'Astronauta Íris', estilo: 'Cartoon', cor: '#f0edf9', fundo: '#3d428b' },
  { id: 'cartoon-robo', nome: 'Robô Bolota', estilo: 'Cartoon', cor: '#8be7d6', fundo: '#23505f' },
  { id: 'cartoon-dragao', nome: 'Dragão Pipoca', estilo: 'Cartoon', cor: '#b4e8a4', fundo: '#42557f' },
  { id: 'pixel-viajante', nome: 'Viajante Pixel', estilo: 'Pixel', cor: '#ffc9a2', fundo: '#303c77' },
  { id: 'pixel-guardiao', nome: 'Guardião Pixel', estilo: 'Pixel', cor: '#93e4ea', fundo: '#284e68' },
  { id: 'pixel-mago', nome: 'Mago Pixel', estilo: 'Pixel', cor: '#d2b4ff', fundo: '#47356c' },
  { id: 'pixel-exploradora', nome: 'Exploradora Pixel', estilo: 'Pixel', cor: '#f4c7ad', fundo: '#345a62' },
  { id: 'pixel-raposa', nome: 'Raposa Pixel', estilo: 'Pixel', cor: '#ffb965', fundo: '#65435c' },
  { id: 'pixel-cristal', nome: 'Cristal Pixel', estilo: 'Pixel', cor: '#a6f0e0', fundo: '#3a3e76' },
  { id: 'games-piloto', nome: 'Piloto Nebulosa', estilo: 'Games', cor: '#bdb4ff', fundo: '#292f65' },
  { id: 'games-guardiao', nome: 'Guardião Solar', estilo: 'Games', cor: '#ffd58c', fundo: '#5d395d' },
  { id: 'games-bardo', nome: 'Bardo Cósmico', estilo: 'Games', cor: '#c5e7b5', fundo: '#315762' },
  { id: 'games-ninja', nome: 'Ninja da Névoa', estilo: 'Games', cor: '#b5d2ff', fundo: '#344368' },
  { id: 'games-ranger', nome: 'Ranger Verde', estilo: 'Games', cor: '#abedd2', fundo: '#22565b' },
  { id: 'games-inventora', nome: 'Inventora Arcade', estilo: 'Games', cor: '#f8b8d2', fundo: '#653b78' },
] as const;

export const limiteFotoCaracteres = 240_000;
export const limiteArquivoFoto = 8 * 1024 * 1024;
export const estilosAvatar = ['Cartoon', 'Pixel', 'Games', 'Emblemas'] as const;
export type EstiloAvatar = typeof estilosAvatar[number];

export function dimensoesPng(valor: string): { largura: number; altura: number } | undefined {
  if (valor.length > limiteFotoCaracteres || !/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(valor)) return;
  try {
    const inicio = atob(valor.slice(22, 22 + 44));
    if (inicio.length < 24 || [...'\x89PNG\r\n\x1a\n'].some((caractere, i) => inicio.charCodeAt(i) !== caractere.charCodeAt(0)) || inicio.slice(12, 16) !== 'IHDR') return;
    const numero = (posicao: number) => ((inicio.charCodeAt(posicao) * 0x1000000) + (inicio.charCodeAt(posicao + 1) << 16) + (inicio.charCodeAt(posicao + 2) << 8) + inicio.charCodeAt(posicao + 3));
    return { largura: numero(16), altura: numero(20) };
  } catch { return; }
}

/** Apenas fotos raster limitadas, desenhos conhecidos e emblemas conquistados. */
export function validarAvatar(valor: unknown, indiceNivel = 7): valor is AvatarPerfil {
  if (!valor || typeof valor !== 'object') return false;
  const avatar = valor as Record<string, unknown>;
  if (Object.keys(avatar).some(chave => !['tipo', 'valor', 'atualizadoEm'].includes(chave))) return false;
  if (typeof avatar.valor !== 'string' || typeof avatar.atualizadoEm !== 'string' || !Number.isFinite(Date.parse(avatar.atualizadoEm)) || !/T.*(?:Z|[+-]\d\d:\d\d)$/.test(avatar.atualizadoEm)) return false;
  if (avatar.tipo === 'desenho') return desenhosAvatar.some(d => d.id === avatar.valor);
  if (avatar.tipo === 'emblema') return /^[0-7]$/.test(avatar.valor) && Number(avatar.valor) <= indiceNivel;
  if (avatar.tipo === 'foto') {
    const tamanho = dimensoesPng(avatar.valor);
    return !!tamanho && tamanho.largura > 0 && tamanho.largura <= 384 && tamanho.largura === tamanho.altura;
  }
  return false;
}

export function nomeAvatar(avatar?: Pick<AvatarPerfil, 'tipo' | 'valor'>) {
  if (avatar?.tipo === 'foto') return 'Sua foto de perfil';
  if (avatar?.tipo === 'desenho') return desenhosAvatar.find(d => d.id === avatar.valor)?.nome ?? 'Avatar';
  return 'Emblema da sua jornada';
}
