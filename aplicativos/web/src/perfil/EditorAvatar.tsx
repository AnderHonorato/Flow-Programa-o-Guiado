import { useEffect, useRef, useState } from 'react';
import { Emblema } from '../evolucao/Emblema';
import { niveis } from '../evolucao/regras';
import { DesenhoAvatar } from './DesenhoAvatar';
import { desenhosAvatar, estilosAvatar, nomeAvatar, type AvatarPerfil, type EstiloAvatar } from './avatar';
import { carregarFoto, desenharRecorte, exportarFoto, recorteInicial, type FotoCarregada, type RecorteFoto } from './foto';
import './perfil-avatar.css';
export { DesenhoAvatar } from './DesenhoAvatar';
export type { AvatarPerfil } from './avatar';

type Props = { avatar?: AvatarPerfil; indiceNivel: number; aoSalvar: (avatar: AvatarPerfil) => void | Promise<void>; perfilId: string };
const padrao = (): AvatarPerfil => ({ tipo: 'desenho', valor: desenhosAvatar[0].id, atualizadoEm: new Date().toISOString() });

/** Um rascunho isolado por perfil: nada é enviado antes de confirmar a prévia. */
export default function EditorAvatar(props: Props) { return <EditorDoPerfil key={props.perfilId} {...props}/>; }
function EditorDoPerfil({ avatar, indiceNivel, aoSalvar, perfilId }: Props) {
  const [estilo, setEstilo] = useState<EstiloAvatar>('Cartoon');
  const [rascunho, setRascunho] = useState<AvatarPerfil>(() => avatar ?? padrao());
  const [foto, setFoto] = useState<FotoCarregada>();
  const [recorte, setRecorte] = useState<RecorteFoto>(recorteInicial);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');
  const canvas = useRef<HTMLCanvasElement>(null);
  const campoArquivo = useRef<HTMLInputElement>(null);
  const arquivo = useRef<FotoCarregada | undefined>(undefined);
  const ativo = useRef(true);
  const operacao = useRef(0);
  const gravando = useRef(false);
  const alterado = useRef(false);
  const ultimoAvatar = useRef(avatar);
  useEffect(() => {
    ativo.current = true;
    return () => { ativo.current = false; operacao.current++; if (arquivo.current) URL.revokeObjectURL(arquivo.current.url); };
  }, []);
  useEffect(() => {
    if (avatar?.valor !== ultimoAvatar.current?.valor || avatar?.tipo !== ultimoAvatar.current?.tipo || avatar?.atualizadoEm !== ultimoAvatar.current?.atualizadoEm) {
      ultimoAvatar.current = avatar;
      if (!gravando.current && !alterado.current) { cancelarFoto(); setRascunho(avatar ?? padrao()); }
      else if (!gravando.current) setMensagem('Seu perfil foi atualizado em outro dispositivo. Sua prévia foi preservada; confirme para usá-la.');
    }
  }, [avatar]);
  useEffect(() => {
    if (!foto || !canvas.current) return;
    try { desenharRecorte(canvas.current, foto, recorte); }
    catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível preparar a foto.'); }
  }, [foto, recorte]);

  function cancelarFoto() {
    operacao.current++;
    if (arquivo.current) URL.revokeObjectURL(arquivo.current.url);
    arquivo.current = undefined; setFoto(undefined); setCarregando(false); setRecorte(recorteInicial);
    if (campoArquivo.current) campoArquivo.current.value = '';
  }
  function escolher(tipo: 'desenho' | 'emblema', valor: string) {
    cancelarFoto(); alterado.current = true; setRascunho({ tipo, valor, atualizadoEm: new Date().toISOString() }); setErro(''); setMensagem('Prévia atualizada. Confirme para usar no perfil.');
  }
  async function abrirFoto(imagem?: File) {
    if (!imagem || gravando.current) return;
    cancelarFoto(); alterado.current = true; const numero = ++operacao.current; setCarregando(true); setErro(''); setMensagem('');
    try {
      const carregada = await carregarFoto(imagem);
      if (!ativo.current || operacao.current !== numero) { URL.revokeObjectURL(carregada.url); return; }
      arquivo.current = carregada; setFoto(carregada); setRecorte(recorteInicial);
      setMensagem('Ajuste o enquadramento e confirme a foto.');
    } catch (e) { if (ativo.current && operacao.current === numero) setErro(e instanceof Error ? e.message : 'Não foi possível abrir esta foto.'); }
    finally { if (ativo.current && operacao.current === numero) setCarregando(false); }
  }
  async function salvar() {
    if (gravando.current || carregando) return;
    gravando.current = true; setSalvando(true); setErro(''); setMensagem('');
    try {
      const pronto: AvatarPerfil = foto ? { tipo: 'foto', valor: exportarFoto(foto, recorte), atualizadoEm: new Date().toISOString() } : { ...rascunho, atualizadoEm: new Date().toISOString() };
      await aoSalvar(pronto);
      if (!ativo.current) return;
      cancelarFoto(); alterado.current = false; setRascunho(pronto); ultimoAvatar.current = pronto;
      setMensagem('Perfil atualizado. Sua escolha está salva neste dispositivo.');
    } catch (e) { if (ativo.current) setErro(e instanceof Error ? e.message : 'Não foi possível salvar. Sua prévia foi preservada; tente novamente.'); }
    finally { gravando.current = false; if (ativo.current) setSalvando(false); }
  }
  const ocupado = salvando || carregando;
  const nome = foto ? 'Prévia da sua foto' : rascunho.tipo === 'emblema' ? niveis[Number(rascunho.valor)]?.nome ?? 'Emblema' : nomeAvatar(rascunho);
  return <section className="perfil-editor-avatar" aria-labelledby={`avatar-titulo-${perfilId}`}>
    <header className="perfil-avatar-cabecalho"><div><span className="sobretitulo">SUA IDENTIDADE NO FLOW</span><h2 id={`avatar-titulo-${perfilId}`}>Um perfil com a sua cara.</h2><p>Use uma foto ou escolha um dos personagens originais. Você pode mudar quando quiser.</p></div><span className="perfil-avatar-selo">18 desenhos originais</span></header>
    <div className="perfil-avatar-estudio">
      <div className="perfil-avatar-previa"><span className="perfil-avatar-legenda">PRÉVIA DO PERFIL</span><div className="perfil-avatar-retrato">
        {foto ? <canvas ref={canvas} width={384} height={384} aria-label="Prévia do recorte da foto"/> : rascunho.tipo === 'foto' ? <img src={rascunho.valor} alt="Prévia da sua foto de perfil"/> : rascunho.tipo === 'emblema' ? <Emblema grau={Number(rascunho.valor)} tamanho={144}/> : <DesenhoAvatar id={rascunho.valor} tamanho={144}/>}
        <span className="perfil-avatar-brilho" aria-hidden="true"/>
      </div><strong>{nome}</strong><small>Escolher uma aparência não altera seus pontos.</small></div>
      <div className="perfil-foto-acoes"><h3>Uma foto que é sua</h3><p>Escolha no dispositivo e confira o recorte antes de salvar.</p><label className="botao secundario perfil-foto-escolher">{carregando ? 'Abrindo imagem…' : 'Escolher foto'}<input ref={campoArquivo} type="file" accept="image/jpeg,image/png,image/webp" aria-label="Escolher foto de perfil" disabled={ocupado} onChange={e => void abrirFoto(e.currentTarget.files?.[0])}/></label>
        <small>JPEG, PNG ou WebP · até 8 MB e 16 megapixels.</small>
        {(foto || rascunho.tipo === 'foto') && <button type="button" className="link-botao" disabled={salvando} onClick={() => escolher('desenho', desenhosAvatar[0].id)}>Trocar foto por um avatar</button>}
        <p className="perfil-foto-privacidade">A foto é reduzida neste dispositivo. Só a imagem recortada é salva no perfil; o arquivo original e seus metadados não são enviados.</p>
      </div>
    </div>
    {foto && <fieldset className="perfil-foto-recorte" disabled={salvando}><legend>Ajuste o enquadramento</legend><p>A prévia acima mostra exatamente a área que será usada.</p><div className="perfil-foto-sliders"><label>Zoom <output>{recorte.zoom.toFixed(1)}×</output><input aria-label="Zoom da foto" type="range" min="1" max="3" step="0.05" value={recorte.zoom} onChange={e => setRecorte(v => ({ ...v, zoom: Number(e.target.value) }))}/></label><label>Posição horizontal <output>{recorte.x}%</output><input aria-label="Posição horizontal da foto" type="range" min="-100" max="100" step="1" value={recorte.x} onChange={e => setRecorte(v => ({ ...v, x: Number(e.target.value) }))}/></label><label>Posição vertical <output>{recorte.y}%</output><input aria-label="Posição vertical da foto" type="range" min="-100" max="100" step="1" value={recorte.y} onChange={e => setRecorte(v => ({ ...v, y: Number(e.target.value) }))}/></label></div><button type="button" className="link-botao" onClick={() => setRecorte(recorteInicial)}>Centralizar recorte</button></fieldset>}
    <div className="perfil-avatar-estilos" role="group" aria-label="Estilos de avatar">{estilosAvatar.map(item => <button key={item} type="button" aria-pressed={estilo === item} disabled={salvando} data-jarvis-reacao="surpreso" data-jarvis-mensagem={`Estilo ${item === "Emblemas" ? "de conquistas" : item} em cena! Escolha um desenho e confirme para salvar.`} onClick={() => setEstilo(item)}>{item === 'Emblemas' ? 'Conquistados' : item}</button>)}</div>
    <div className="perfil-avatar-galeria" aria-label={`Avatares ${estilo === 'Emblemas' ? 'conquistados' : estilo}`} role="group">
      {estilo === 'Emblemas' ? niveis.map((nivel, indice) => <button type="button" key={nivel.nome} className={`perfil-avatar-item ${!foto && rascunho.tipo === 'emblema' && rascunho.valor === String(indice) ? 'selecionado' : ''}`} disabled={ocupado || indice > indiceNivel} aria-pressed={!foto && rascunho.tipo === 'emblema' && rascunho.valor === String(indice)} aria-label={`${nivel.nome}: ${indice > indiceNivel ? `bloqueado, requer ${nivel.minimo} XP` : 'usar emblema'}`} onClick={() => escolher('emblema', String(indice))}><Emblema grau={indice} tamanho={74} bloqueado={indice > indiceNivel}/><strong>{nivel.nome}</strong><small>{indice > indiceNivel ? `${nivel.minimo} XP` : 'Desbloqueado'}</small></button>) : desenhosAvatar.filter(d => d.estilo === estilo).map(d => <button key={d.id} type="button" className={`perfil-avatar-item ${!foto && rascunho.tipo === 'desenho' && rascunho.valor === d.id ? 'selecionado' : ''}`} aria-pressed={!foto && rascunho.tipo === 'desenho' && rascunho.valor === d.id} aria-label={`Escolher avatar ${d.nome}`} disabled={ocupado} data-jarvis-reacao="alegre" data-jarvis-mensagem={`${d.nome} na prévia! Confirme o avatar quando estiver do seu jeito.`} onClick={() => escolher('desenho', d.id)}><DesenhoAvatar id={d.id} tamanho={82}/><strong>{d.nome}</strong><small>{d.estilo} · livre</small></button>)}
    </div>
    <div className="perfil-avatar-confirmacao"><button type="button" className="botao primario" disabled={ocupado} onClick={() => void salvar()}>{salvando ? 'Salvando perfil…' : foto ? 'Confirmar foto de perfil' : 'Confirmar avatar'}</button><button type="button" className="botao secundario" disabled={salvando} onClick={() => { cancelarFoto(); alterado.current = false; setRascunho(avatar ?? padrao()); setErro(''); setMensagem('Alterações canceladas. Sua aparência anterior foi mantida.'); }}>Cancelar alterações</button></div>
    {erro ? <p className="perfil-avatar-erro" role="alert">{erro}</p> : <p className="perfil-avatar-status" role="status">{mensagem || 'Confira a prévia e confirme sua escolha para salvar.'}</p>}
  </section>;
}
