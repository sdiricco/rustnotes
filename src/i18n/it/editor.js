// Stringhe editor (it). Chiavi camelCase, riempite dal componente omonimo.
export default {
  emptyState: 'Seleziona una nota o creane una nuova',
  findInNote: 'Cerca nella nota ({shortcut})',
  addToFavorites: 'Aggiungi ai preferiti',
  removeFromFavorites: 'Rimuovi dai preferiti',
  moveToTrash: 'Sposta nel cestino',
  restore: 'Ripristina',
  moreActions: 'Altre azioni',
  importMarkdown: 'Importa Markdown',
  markdownMenu: 'Markdown...',
  spellcheckOn: 'Ortografia: attiva',
  spellcheckOff: 'Ortografia: disattiva',
  revealInFinder: 'Mostra nel Finder | Mostra nel gestore file',
  markdownDialogTitle: 'Markdown',
  copy: 'Copia',
  download: 'Scarica',
  exportFileName: 'nota',
  toast: {
    exported: 'Nota esportata come Markdown',
    imported: 'Markdown importato nella nota',
    copied: 'Copiato come Markdown'
  },
  // Etichette del picker "lista" della toolbar Quill (contenuto CSS ::before).
  listPicker: {
    list: 'Lista',
    ordered: 'Numerata',
    bullet: 'Puntata',
    checklist: 'Checklist'
  },
  // Menu "Claude" nella barra della nota e pannello di anteprima (ClaudePanel).
  claude: {
    menu: 'Claude',
    onSelection: 'Sulla selezione',
    onNote: 'Su tutta la nota',
    signInHint: 'Accedi a Claude Code in Impostazioni…',
    actions: {
      fix: 'Correggi ortografia e grammatica',
      rephrase: 'Riformula',
      summarize: 'Riassumi',
      continue: 'Continua a scrivere'
    },
    working: 'Claude sta scrivendo…',
    meta: 'Fatto in {s} s',
    cancel: 'Annulla',
    discard: 'Scarta',
    insertBelow: 'Inserisci sotto',
    replace: 'Sostituisci',
    applied: 'Applicato. Annulla con la scorciatoia abituale.',
    copiedToast: 'Copiato',
    emptyNote: 'La nota è vuota'
  }
}
