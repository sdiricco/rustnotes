// Azioni fisse del menu "Claude" nell'editor. Le istruzioni sono in inglese
// per il modello (che risponde nella lingua del testo, vedi SYSTEM_PROMPT in
// claude.rs); le etichette visibili stanno in i18n sotto editor.claude.
//
// `primary` e' il pulsante principale del pannello di anteprima: 'replace'
// sostituisce il testo di partenza, 'insert' aggiunge sotto di esso.

export const CLAUDE_ACTIONS = [
  {
    id: 'fix',
    icon: 'lucide:spell-check',
    primary: 'replace',
    instruction:
      'Fix spelling, grammar and punctuation in the text below. Keep the meaning, tone, wording and structure; change only what is wrong.'
  },
  {
    id: 'rephrase',
    icon: 'lucide:refresh-cw',
    primary: 'replace',
    instruction:
      'Rewrite the text below so it reads clearer and more fluent. Keep the meaning, tone, length and structure.'
  },
  {
    id: 'summarize',
    icon: 'lucide:list',
    primary: 'insert',
    instruction:
      'Summarize the text below concisely. Use a short bullet list if it covers several points, otherwise a single short paragraph.'
  },
  {
    id: 'continue',
    icon: 'lucide:pen-line',
    primary: 'insert',
    instruction:
      'Continue writing where the text below stops, in the same style, tone and language. Reply only with the continuation (one or two paragraphs), without repeating the text.'
  }
]

// Come e' fatto il testo di partenza, cosi' il modello risponde nello stesso
// formato e il risultato si reinserisce senza sorprese.
const HINT_PLAIN = 'The text is a plain fragment on a single line: reply with plain text on a single line, no Markdown.'
const HINT_MARKDOWN = 'The text is Markdown: reply in Markdown.'

export function buildInstruction(action, { inline }) {
  return `${action.instruction}\n${inline ? HINT_PLAIN : HINT_MARKDOWN}`
}

// Istruzione libera scritta dall'utente nel popup.
export function buildFree(userInstruction, { inline }) {
  return `Apply this instruction to the text below: ${userInstruction.trim()}\n${inline ? HINT_PLAIN : HINT_MARKDOWN}`
}

// Seguito su una proposta gia' fatta ("piu' corto", "tono formale"): niente
// sessione persistente, si rimanda tutto in una chiamata sola. Il testo
// originale resta il `text` della richiesta (dopo il separatore), la versione
// precedente va nell'istruzione.
export function buildFollowUp(refinement, previous, { inline }) {
  return [
    'You previously rewrote the text below (the ORIGINAL) into the PREVIOUS VERSION shown here.',
    'Now apply this instruction to the previous version, keeping everything else as it was:',
    refinement.trim(),
    'Reply only with the new version.',
    inline ? HINT_PLAIN : HINT_MARKDOWN,
    '',
    '--- PREVIOUS VERSION ---',
    previous,
    '',
    '--- ORIGINAL ---'
  ].join('\n')
}

// Il modello a volte incornicia comunque la risposta in un blocco di codice:
// si toglie solo la cornice esterna, il contenuto resta com'e'.
export function stripOuterFence(text) {
  const m = /^\s*```[\w-]*\n([\s\S]*?)\n```\s*$/.exec(text)
  return m ? m[1] : text.trim()
}
