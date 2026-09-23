// Modulo clipboard di Quill con una regola in più sull'incolla: dall'esterno
// si accetta la formattazione semantica (grassetto, liste, link, titoli,
// codice...) ma non quella visiva legata al tema della sorgente.
//
// Il problema che risolve: browser, VS Code, Slack e simili mettono negli
// appunti un HTML con gli stili calcolati della pagina, tipo
// `<span style="color: rgb(230,230,230); background-color: rgb(30,30,30)">`.
// Il matcher di default di Quill (matchAttributor) li legge come formati
// `color` e `background`, che qui sono attivi per via della toolbar, e il
// risultato è testo chiaro su riquadri scuri dentro un tema chiaro, o il
// contrario. Con temi uguali i colori coincidono con quelli del tema e non
// si notano, il che rende il difetto subdolo.
//
// Due casi devono invece conservare i colori:
//  - la copia interna a RustNotes: le evidenziazioni applicate a mano vanno
//    mantenute spostando testo tra note. L'HTML che Quill scrive negli
//    appunti viene marcato con un attributo sul wrapper, e in incolla il
//    marcatore disattiva lo strip;
//  - il caricamento di una nota (dangerouslyPasteHTML in loadContent), che
//    passa dallo stesso convertitore ma non da onPaste: lo strip è attivo
//    solo dentro onPaste, quindi il contenuto salvato non viene toccato.
import Quill from 'quill'

const Clipboard = Quill.import('modules/clipboard')
const Delta = Quill.import('delta')

export const INTERNAL_MARKER = 'data-rustnotes'
export const THEME_FORMATS = ['color', 'background']

/** L'HTML negli appunti è stato scritto da RustNotes (vedi onCopy)? */
export function isInternalHtml(html) {
  if (!html) return false
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return doc.body.querySelector(`[${INTERNAL_MARKER}]`) != null
}

/** Copia del delta senza i formati dipendenti dal tema (color, background). */
export function stripThemeFormats(delta) {
  return new Delta(
    delta.ops.map((op) => {
      if (!op.attributes) return op
      const attributes = { ...op.attributes }
      THEME_FORMATS.forEach((name) => delete attributes[name])
      const { attributes: _drop, ...rest } = op
      return Object.keys(attributes).length ? { ...rest, attributes } : rest
    })
  )
}

export class RustNotesClipboard extends Clipboard {
  constructor(quill, options) {
    super(quill, options)
    this.stripping = false
    // Aggiunto dopo i matcher di default, quindi vede il delta già arricchito
    // da matchAttributor e può togliere quel che serve.
    this.addMatcher(Node.ELEMENT_NODE, (node, delta) => (this.stripping ? stripThemeFormats(delta) : delta))
  }

  onCopy(range, isCut) {
    const { html, text } = super.onCopy(range, isCut)
    // Il wrapper <div> non altera la conversione in incolla. Se il contenuto
    // è di più righe finisce già con "\n" e matchNewline non ne aggiunge un
    // altro per il div; se è un pezzo di riga (solo inline) il "\n" che il div
    // aggiunge è quello finale senza attributi, che convert() rimuove comunque.
    return { html: `<div ${INTERNAL_MARKER}="">${html}</div>`, text }
  }

  onPaste(range, { text, html }) {
    this.stripping = Boolean(html) && !isInternalHtml(html)
    try {
      super.onPaste(range, { text, html })
    } finally {
      this.stripping = false
    }
  }
}
