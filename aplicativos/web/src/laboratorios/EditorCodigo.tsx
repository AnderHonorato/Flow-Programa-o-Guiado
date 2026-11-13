import { useEffect, useRef } from 'react';
import { EditorState, Transaction } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine, drawSelection } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab, indentSelection, undo, redo, isolateHistory } from '@codemirror/commands';
import { syntaxHighlighting, defaultHighlightStyle, HighlightStyle, indentOnInput, bracketMatching } from '@codemirror/language';
import { closeBrackets, closeBracketsKeymap, autocompletion, completionKeymap } from '@codemirror/autocomplete';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import Icone from '../componentes/Icone';
// Preserva as categorias do CodeMirror com cores próprias que acompanham o tema.
const coresRealce: Record<string, string> = { '#404740': '--muted', '#708': '--lab-code-palavra', '#219': '--lab-code-numero', '#164': '--lab-code-tag', '#a11': '--lab-code-texto', '#e40': '--lab-code-texto', '#00f': '--lab-code-numero', '#30a': '--lab-code-palavra', '#085': '--lab-code-tag', '#167': '--lab-code-tag', '#256': '--lab-code-tag', '#00c': '--lab-code-numero', '#940': '--muted', '#f00': '--erro' };
const realceAcessivel = HighlightStyle.define(defaultHighlightStyle.specs.map(regra => ({ ...regra, ...(regra.color ? { color: `var(${coresRealce[regra.color] || '--text'})` } : {}) })));
export type Arquivo = 'html' | 'css' | 'js' | 'python';
interface Props { codigo: string; arquivo: Arquivo; aoMudar: (codigo: string) => void; linha?: number; }
export default function EditorCodigo({ codigo, arquivo, aoMudar, linha }: Props) {
  const raiz = useRef<HTMLDivElement>(null);
  const editor = useRef<EditorView | null>(null);
  const estados = useRef<Partial<Record<Arquivo, EditorState>>>({});
  const arquivoAtivo = useRef(arquivo);
  arquivoAtivo.current = arquivo;
  const mudanca = useRef(aoMudar);
  mudanca.current = aoMudar;
  useEffect(() => {
    if (!raiz.current) return;
    const linguagem = arquivo === 'html' ? html() : arquivo === 'css' ? css() : arquivo === 'python' ? python() : javascript();
    const anterior = estados.current[arquivo];
    const estado = anterior && anterior.doc.toString() === codigo ? anterior : EditorState.create({ doc: codigo, extensions: [
      lineNumbers(), history(), drawSelection(), highlightActiveLine(), indentOnInput(), bracketMatching(), closeBrackets(), autocompletion(), linguagem,
      syntaxHighlighting(realceAcessivel), keymap.of([...defaultKeymap, ...historyKeymap, ...closeBracketsKeymap, ...completionKeymap, indentWithTab]),
      EditorView.lineWrapping, EditorView.contentAttributes.of({ 'aria-label': `Editor ${arquivo.toUpperCase()}`, spellcheck: 'false', autocapitalize: 'off', autocorrect: 'off' }),
      EditorView.updateListener.of(update => { if (update.docChanged && arquivoAtivo.current === arquivo) mudanca.current(update.state.doc.toString()); }),
      EditorView.theme({ '&': { backgroundColor: 'var(--surface)', color: 'var(--text)', height: '100%' }, '.cm-scroller': { fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace', fontSize: '13px', overflow: 'auto', lineHeight: '1.75' }, '.cm-gutters': { backgroundColor: 'var(--surface-2)', color: 'var(--muted)', borderRight: '1px solid var(--line)' }, '.cm-activeLine': { backgroundColor: 'rgba(139,92,246,.08)' }, '.cm-content': { minHeight: '340px', padding: '14px 0' }, '&.cm-focused': { outline: '2px solid var(--accent)', outlineOffset: '-2px' }, '.cm-cursor': { borderLeftColor: 'var(--text)' } }),
    ] });
    const view = new EditorView({ parent: raiz.current, state: estado });
    editor.current = view;
    return () => { estados.current[arquivo] = view.state; view.destroy(); if (editor.current === view) editor.current = null; };
  // Cada arquivo conserva seleção e histórico de desfazer enquanto o editor estiver montado.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arquivo]);
  useEffect(() => { const view = editor.current; if (view && view.state.doc.toString() !== codigo) view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: codigo }, annotations: Transaction.addToHistory.of(false) }); }, [codigo]);
  useEffect(() => { const view = editor.current; if (!view || !linha) return; const alvo = view.state.doc.line(Math.min(Math.max(1, linha), view.state.doc.lines)); view.dispatch({ selection: { anchor: alvo.from, head: alvo.to }, effects: EditorView.scrollIntoView(alvo.from, { y: 'center' }) }); view.focus(); }, [linha]);
  // Insercoes de simbolos para teclado virtual, mantendo selecao e historico do CodeMirror.
  function inserirSimbolo(abertura: string, fechamento = '') {
    const view = editor.current;
    if (!view) return;
    const { from, to } = view.state.selection.main;
    const selecionado = view.state.sliceDoc(from, to);
    const texto = abertura + selecionado + fechamento;
    const posicao = selecionado ? from + texto.length : from + abertura.length;
    view.dispatch({
      changes: { from, to, insert: texto },
      selection: { anchor: selecionado ? from + abertura.length : posicao, head: selecionado ? from + abertura.length + selecionado.length : posicao },
      scrollIntoView: true,
      userEvent: 'input.type', annotations: isolateHistory.of('full')
    });
    view.focus();
  }
  function moverCursor(direcao: -1 | 1) {
    const view = editor.current;
    if (!view) return;
    const atual = view.state.selection.main.head;
    view.dispatch({ selection: { anchor: Math.max(0, Math.min(view.state.doc.length, atual + direcao)) }, scrollIntoView: true });
    view.focus();
  }
  const simbolos = [
    { rotulo: 'Tab', texto: '  ', descricao: 'Inserir dois espaços' },
    { rotulo: '{ }', texto: '{', fechamento: '}', descricao: 'Inserir chaves' },
    { rotulo: '( )', texto: '(', fechamento: ')', descricao: 'Inserir parênteses' },
    { rotulo: '[ ]', texto: '[', fechamento: ']', descricao: 'Inserir colchetes' },
    { rotulo: '< >', texto: '<', fechamento: '>', descricao: 'Inserir sinais de menor e maior' },
    { rotulo: '" "', texto: '"', fechamento: '"', descricao: 'Inserir aspas duplas' },
    { rotulo: '=', texto: '=', descricao: 'Inserir sinal de igual' },
    { rotulo: '/', texto: '/', descricao: 'Inserir barra' },
  ];
  return <><div className="lab-editor-acoes"><button type="button" onPointerDown={evento => evento.preventDefault()} onClick={() => { const view = editor.current; if (view) { undo(view); view.focus(); } }} aria-label="Desfazer alteração"><Icone nome="revisao" tamanho={13} /> Desfazer</button><button type="button" onPointerDown={evento => evento.preventDefault()} onClick={() => { const view = editor.current; if (view) { redo(view); view.focus(); } }} aria-label="Refazer alteração"><Icone nome="revisao" tamanho={13} className="lab-icone-refazer" /> Refazer</button><button type="button" onPointerDown={evento => evento.preventDefault()} onClick={() => { const view = editor.current; if (view) { const selecaoAnterior = view.state.selection; view.dispatch({ selection: { anchor: 0, head: view.state.doc.length } }); indentSelection(view); view.dispatch({ selection: { anchor: Math.min(selecaoAnterior.main.anchor, view.state.doc.length), head: Math.min(selecaoAnterior.main.head, view.state.doc.length) } }); view.focus(); } }}>Autoindentar</button></div><div className="lab-teclas-mobile" role="toolbar" aria-label="Teclas rápidas para editar código">
    <button type="button" aria-label="Mover cursor para esquerda" onPointerDown={evento => evento.preventDefault()} onClick={() => moverCursor(-1)}>←</button>
    {simbolos.map(simbolo => <button key={simbolo.rotulo} type="button" aria-label={simbolo.descricao} onPointerDown={evento => evento.preventDefault()} onClick={() => inserirSimbolo(simbolo.texto, simbolo.fechamento)}>{simbolo.rotulo}</button>)}
    <button type="button" aria-label="Mover cursor para direita" onPointerDown={evento => evento.preventDefault()} onClick={() => moverCursor(1)}>→</button>
  </div><div className="lab-codemirror" ref={raiz} /></>;
}
