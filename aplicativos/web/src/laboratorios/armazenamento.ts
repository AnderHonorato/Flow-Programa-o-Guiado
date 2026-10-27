import type { ArquivosCodigo } from '../../../../contratos/tipos';
export interface Snapshot { id: string; data: string; arquivos: ArquivosCodigo }
interface Projeto { versao: 1; arquivos: ArquivosCodigo; snapshots: Snapshot[] }
const chave = (perfil: string, aula: string) => `flow:laboratorio:v1:${encodeURIComponent(perfil)}:${encodeURIComponent(aula)}`;
export function carregarProjeto(perfil: string, aula: string, iniciais: ArquivosCodigo): Projeto {
  try {
    const valor = JSON.parse(localStorage.getItem(chave(perfil, aula)) || 'null');
    if (valor?.versao === 1 && arquivosValidos(valor.arquivos)) {
      return { versao: 1, arquivos: valor.arquivos, snapshots: snapshotsValidos(valor.snapshots) };
    }
  } catch { /* Storage indisponível ou projeto corrompido: editor continua em memória. */ }
  return { versao: 1, arquivos: { ...iniciais }, snapshots: [] };
}
export function salvarProjeto(perfil: string, aula: string, arquivos: ArquivosCodigo, snapshots: Snapshot[]): boolean {
  if (!arquivosValidos(arquivos)) return false;
  try { localStorage.setItem(chave(perfil, aula), JSON.stringify({ versao: 1, arquivos, snapshots: snapshots.slice(0, 20) })); return true; }
  catch { return false; }
}

export interface ProjetoExportado { aulaId: string; arquivos: ArquivosCodigo; snapshots: Snapshot[] }
function arquivosValidos(valor: unknown): valor is ArquivosCodigo {
  if (!valor || typeof valor !== 'object') return false;
  const item = valor as Record<string, unknown>;
  return ['html', 'css', 'js'].every(campo => typeof item[campo] === 'string' && (item[campo] as string).length <= 200000) && (item.python === undefined || typeof item.python === 'string' && item.python.length <= 200000);
}
function snapshotsValidos(valor: unknown): Snapshot[] {
  if (!Array.isArray(valor)) return [];
  return valor.filter((item): item is Snapshot => !!item && typeof item.id === 'string' && typeof item.data === 'string' && arquivosValidos(item.arquivos)).slice(0, 20);
}
export function exportarProjetos(perfilId: string): ProjetoExportado[] {
  const prefixo = `flow:laboratorio:v1:${encodeURIComponent(perfilId)}:`;
  const projetos: ProjetoExportado[] = [];
  for (let indice = 0; indice < localStorage.length; indice++) {
    const itemChave = localStorage.key(indice);
    if (!itemChave?.startsWith(prefixo)) continue;
    try {
      const item = JSON.parse(localStorage.getItem(itemChave) || 'null');
      if (item?.versao === 1 && arquivosValidos(item.arquivos)) projetos.push({ aulaId: decodeURIComponent(itemChave.slice(prefixo.length)), arquivos: item.arquivos, snapshots: snapshotsValidos(item.snapshots) });
    } catch { /* Uma entrada inválida não deve impedir o backup das demais. */ }
  }
  return projetos;
}
/** Importa sem apagar edições atuais: conflitos ficam em uma versão recuperada. */
export function importarProjetos(perfilId: string, entrada: unknown): number {
  validarProjetos(entrada);
  let quantidade = 0;
  for (const valor of entrada as ProjetoExportado[]) {
    const existe = localStorage.getItem(chave(perfilId, valor.aulaId));
    const atual = carregarProjeto(perfilId, valor.aulaId, valor.arquivos);
    const diferentes = existe && JSON.stringify(atual.arquivos) !== JSON.stringify(valor.arquivos);
    const jaRecuperado = atual.snapshots.some(item => JSON.stringify(item.arquivos) === JSON.stringify(valor.arquivos));
    const recuperado: Snapshot[] = diferentes && !jaRecuperado ? [{ id: `recuperado-${crypto.randomUUID()}`, data: new Date().toISOString(), arquivos: { ...valor.arquivos } }] : [];
    const versoes = [...recuperado, ...atual.snapshots, ...snapshotsValidos(valor.snapshots)];
    const unicas = versoes.filter((item, indice) => versoes.findIndex(candidato => candidato.id === item.id) === indice).slice(0, 20);
    if (!salvarProjeto(perfilId, valor.aulaId, diferentes ? atual.arquivos : valor.arquivos, unicas)) throw new Error('Armazenamento cheio ou indisponível durante importação dos projetos.');
    quantidade++;
  }
  return quantidade;
}
export function vincularProjetos(perfilOrigem: string, perfilDestino: string): void {
  if (perfilOrigem === perfilDestino) return;
  importarProjetos(perfilDestino, exportarProjetos(perfilOrigem));
}

export function validarProjetos(entrada: unknown): asserts entrada is ProjetoExportado[] {
  if (!Array.isArray(entrada) || entrada.length > 500) throw new Error('Backup de projetos inválido (máximo: 500 aulas).');
  for (const valor of entrada) {
    if (!valor || typeof valor.aulaId !== 'string' || !valor.aulaId || valor.aulaId.length > 200 || !arquivosValidos(valor.arquivos)) throw new Error('O backup contém um projeto de código inválido.');
    if (!Array.isArray(valor.snapshots) || valor.snapshots.length > 20 || snapshotsValidos(valor.snapshots).length !== valor.snapshots.length) throw new Error('O backup contém versões de código inválidas.');
  }
}
