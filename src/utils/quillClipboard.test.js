import { describe, it, expect, beforeEach } from 'vitest'
import Quill from 'quill'
import { RustNotesClipboard, isInternalHtml, stripThemeFormats, INTERNAL_MARKER } from './quillClipboard'

Quill.register('modules/clipboard', RustNotesClipboard, true)

// HTML come lo mettono negli appunti Chrome/VS Code copiando da una sorgente
// con tema scuro: stili calcolati inline, colore e sfondo compresi.
const EXTERNAL_DARK_HTML =
  `<meta charset='utf-8'>` +
  `<span style="color: rgb(230, 230, 230); background-color: rgb(30, 30, 30); font-weight: 700;">ciao</span>` +
  `<span style="color: rgb(230, 230, 230); background-color: rgb(30, 30, 30);"> <a href="https://example.com">link</a></span>`

// jsdom non implementa la geometria dei Range, che Quill usa dopo l'incolla
// per riportare la selezione in vista (scrollSelectionIntoView).
const zeroRect = () => ({ top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0 })
Range.prototype.getBoundingClientRect = zeroRect
Range.prototype.getClientRects = () => []

let quill

beforeEach(() => {
  document.body.innerHTML = '<div id="editor"></div>'
  quill = new Quill('#editor', {
    modules: { toolbar: [['bold', 'italic'], [{ color: [] }, { background: [] }]] }
  })
})

const paste = (html) => quill.clipboard.onPaste(quill.getSelection(true) || { index: 0, length: 0 }, { html, text: '' })
const attributesOf = (text) => quill.getContents().ops.find((op) => op.insert === text)?.attributes ?? {}

describe('RustNotesClipboard', () => {
  it('incolla da fuori: scarta color e background, tiene la formattazione semantica', () => {
    paste(EXTERNAL_DARK_HTML)
    expect(quill.getText()).toBe('ciao link\n')
    expect(attributesOf('ciao')).toEqual({ bold: true })
    expect(attributesOf('link')).toEqual({ link: 'https://example.com' })
  })

  it('copia interna: l\'HTML è marcato e in incolla conserva le evidenziazioni', () => {
    quill.setContents([{ insert: 'evidenziato', attributes: { background: '#ffff00', color: '#ff0000' } }, { insert: '\n' }])
    const { html, text } = quill.clipboard.onCopy({ index: 0, length: 11 })
    expect(text).toBe('evidenziato')
    expect(isInternalHtml(html)).toBe(true)

    quill.setContents([{ insert: '\n' }])
    paste(html)
    expect(quill.getText()).toBe('evidenziato\n')
    expect(attributesOf('evidenziato')).toEqual({ background: '#ffff00', color: '#ff0000' })
  })

  it('il wrapper marcato non aggiunge righe vuote incollando più paragrafi', () => {
    quill.setContents([{ insert: 'uno\ndue\n' }])
    const { html } = quill.clipboard.onCopy({ index: 0, length: 7 })
    quill.setContents([{ insert: '\n' }])
    paste(html)
    expect(quill.getText()).toBe('uno\ndue\n')
  })

  it('caricamento nota (dangerouslyPasteHTML): i colori salvati restano', () => {
    quill.clipboard.dangerouslyPasteHTML('<p><span style="background-color: rgb(255, 255, 0);">nota</span></p>')
    // Quill normalizza i colori rgb() in esadecimale.
    expect(attributesOf('nota')).toEqual({ background: '#ffff00' })
  })

  it('dopo un incolla esterno lo strip si disattiva di nuovo', () => {
    paste(EXTERNAL_DARK_HTML)
    quill.setContents([{ insert: '\n' }])
    quill.clipboard.dangerouslyPasteHTML('<p><span style="color: rgb(0, 0, 255);">blu</span></p>')
    expect(attributesOf('blu')).toEqual({ color: '#0000ff' })
  })
})

describe('helpers', () => {
  it('isInternalHtml riconosce solo il marcatore', () => {
    expect(isInternalHtml(`<div ${INTERNAL_MARKER}=""><p>x</p></div>`)).toBe(true)
    expect(isInternalHtml('<p>x</p>')).toBe(false)
    expect(isInternalHtml('')).toBe(false)
    expect(isInternalHtml(undefined)).toBe(false)
  })

  it('stripThemeFormats toglie solo color e background', () => {
    const Delta = Quill.import('delta')
    const delta = new Delta()
      .insert('a', { bold: true, color: '#fff', background: '#000' })
      .insert('b', { background: '#000' })
      .insert('c')
    expect(stripThemeFormats(delta).ops).toEqual([{ insert: 'a', attributes: { bold: true } }, { insert: 'b' }, { insert: 'c' }])
  })
})
