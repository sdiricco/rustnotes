// Chaînes editor (fr). Clés camelCase, remplies par le composant du même nom.
export default {
  emptyState: 'Sélectionnez une note ou créez-en une nouvelle',
  findInNote: 'Rechercher dans la note ({shortcut})',
  addToFavorites: 'Ajouter aux favoris',
  removeFromFavorites: 'Retirer des favoris',
  moveToTrash: 'Placer dans la corbeille',
  restore: 'Restaurer',
  moreActions: 'Autres actions',
  importMarkdown: 'Importer du Markdown',
  markdownMenu: 'Markdown...',
  spellcheckOn: 'Orthographe : activée',
  spellcheckOff: 'Orthographe : désactivée',
  revealInFinder: 'Afficher dans le Finder | Afficher dans le gestionnaire de fichiers',
  markdownDialogTitle: 'Markdown',
  copy: 'Copier',
  download: 'Télécharger',
  exportFileName: 'note',
  toast: {
    exported: 'Note exportée en Markdown',
    imported: 'Markdown importé dans la note',
    copied: 'Copié en Markdown'
  },
  // Libellés du sélecteur « liste » de la barre d’outils Quill (contenu CSS ::before).
  listPicker: {
    list: 'Liste',
    ordered: 'Numérotée',
    bullet: 'À puces',
    checklist: 'Liste de contrôle'
  },
  // Menu "Claude" nella barra della nota e pannello di anteprima (ClaudePanel).
  claude: {
    menu: 'Claude',
    onSelection: 'Sur la sélection',
    onNote: 'Sur toute la note',
    signInHint: 'Connectez-vous à Claude Code dans les Réglages…',
    actions: {
      fix: 'Corriger l\'orthographe et la grammaire',
      rephrase: 'Reformuler',
      summarize: 'Résumer',
      continue: 'Continuer à écrire'
    },
    working: 'Claude écrit…',
    meta: 'Terminé en {s} s',
    cancel: 'Annuler',
    discard: 'Ignorer',
    insertBelow: 'Insérer en dessous',
    replace: 'Remplacer',
    applied: 'Appliqué. Annulez avec le raccourci habituel.',
    copiedToast: 'Copié',
    emptyNote: 'La note est vide'
  }
}
