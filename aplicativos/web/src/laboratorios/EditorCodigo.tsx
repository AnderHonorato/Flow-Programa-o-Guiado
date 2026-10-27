import { useEffect, useRef } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine, drawSelection } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab, indentSelection, undo, redo } from '@codemirror/commands';
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
  const mudanca = useRef(aoMudar);
  mudanca.current = aoMudar;
  useEffect(() => {
    if (!raiz.current) return;
    const linguagem = arquivo === 'html' ? html() : arquivo === 'css' ? css() : arquivo === 'python' ? python() : javascript();
    const view = new EditorView({ parent: raiz.current, state: EditorState.create({ doc: codigo, extensions: [
      lineNumbers(), history(), drawSelection(), highlightActiveLine(), indentOnInput(), bracketMatching(), closeBrackets(), autocompletion(), linguagem,
      syntaxHighlighting(realceAcessivel), keymap.of([...defaultKeymap, ...historyKeymap, ...closeBracketsKeymap, ...completionKeymap, indentWithTab]),
      EditorView.lineWrapping, EditorView.contentAttributes.of({ 'aria-label': `Editor ${arquivo.toUpperCase()}`, spellcheck: 'false', autocapitalize: 'off', autocorrect: 'off' }),
      EditorView.updateListener.of(update => { if (update.docChanged) mudanca.current(update.state.doc.toString()); }),
      EditorView.theme({ '&': { backgroundColor: 'var(--surface)', color: 'var(--text)', height: '100%' }, '.cm-scroller': { fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace', fontSize: '13px', overflow: 'auto', lineHeight: '1.75' }, '.cm-gutters': { backgroundColor: 'var(--surface-2)', color: 'var(--muted)', borderRight: '1px solid var(--line)' }, '.cm-activeLine': { backgroundColor: 'rgba(139,92,246,.08)' }, '.cm-content': { minHeight: '340px', padding: '14px 0' }, '&.cm-focused': { outline: '2px solid var(--accent)', outlineOffset: '-2px' }, '.cm-cursor': { borderLeftColor: 'var(--text)' } }),
    ] }) });
    editor.current = view;
    return () => { view.destroy(); editor.current = null; };
  // Cada aba mantém o documento persistido; a visão recria o histórico ao mudar de arquivo.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arquivo]);
  useEffect(() => { const view = editor.current; if (view && view.state.doc.toString() !== codigo) view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: codigo } }); }, [codigo]);
  useEffect(() => { const view = editor.current; if (!view || !linha) return; const alvo = view.state.doc.line(Math.min(Math.max(1, linha), view.state.doc.lines)); view.dispatch({ selection: { anchor: alvo.from, head: alvo.to }, effects: EditorView.scrollIntoView(alvo.from, { y: 'center' }) }); view.focus(); }, [linha]);
  return <><div className="lab-editor-acoes"><button type="button" onClick={() => editor.current && undo(editor.current)} aria-label="Desfazer alteração"><Icone nome="revisao" tamanho={13} /> Desfazer</button><button type="button" onClick={() => editor.current && redo(editor.current)} aria-label="Refazer alteração"><Icone nome="revisao" tamanho={13} className="lab-icone-refazer" /> Refazer</button><button type="button" onClick={() => { const view = editor.current; if (view) { view.dispatch({ selection: { anchor: 0, head: view.state.doc.length } }); indentSelection(view); } }}>Autoindentar</button></div><div className="lab-codemirror" ref={raiz} /></>;
}
