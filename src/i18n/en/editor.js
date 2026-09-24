// Stringhe editor (en). Chiavi camelCase, riempite dal componente omonimo.
export default {
  emptyState: 'Select a note or create a new one',
  findInNote: 'Find in Note ({shortcut})',
  addToFavorites: 'Add to Favorites',
  removeFromFavorites: 'Remove from Favorites',
  moveToTrash: 'Move to Trash',
  restore: 'Restore',
  moreActions: 'More Actions',
  importMarkdown: 'Import Markdown',
  markdownMenu: 'Markdown...',
  spellcheckOn: 'Spelling: on',
  spellcheckOff: 'Spelling: off',
  revealInFinder: 'Show in Finder | Show in file manager',
  markdownDialogTitle: 'Markdown',
  copy: 'Copy',
  download: 'Download',
  exportFileName: 'note',
  toast: {
    exported: 'Note exported as Markdown',
    imported: 'Markdown imported into the note',
    copied: 'Copied as Markdown'
  },
  // Etichette del picker "lista" della toolbar Quill (contenuto CSS ::before).
  listPicker: {
    list: 'List',
    ordered: 'Numbered',
    bullet: 'Bulleted',
    checklist: 'Checklist'
  },
  // Menu "Claude" nella barra della nota e pannello di anteprima (ClaudePanel).
  claude: {
    menu: 'Claude',
    onSelection: 'On the selection',
    onNote: 'On the whole note',
    signInHint: 'Sign in to Claude Code in Settings to use the assistant.',
    ask: 'Ask Claude…',
    refine: 'Refine, e.g. “shorter”…',
    send: 'Send',
    quick: 'Quick actions',
    proposal: 'Proposal',
    changes: 'Changes',
    retry: 'Try again',
    actions: {
      fix: 'Fix spelling and grammar',
      rephrase: 'Rephrase',
      summarize: 'Summarize',
      continue: 'Continue writing'
    },
    working: 'Claude is writing…',
    meta: 'Done in {s} s',
    cancel: 'Cancel',
    discard: 'Discard',
    insertBelow: 'Insert below',
    replace: 'Replace',
    applied: 'Applied. Undo with the usual shortcut.',
    copiedToast: 'Copied',
    emptyNote: 'The note is empty'
  }
}
