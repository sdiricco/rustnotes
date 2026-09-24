// Stringhe editor (es). Chiavi camelCase, riempite dal componente omonimo.
export default {
  emptyState: 'Seleccione una nota o cree una nueva',
  findInNote: 'Buscar en la nota ({shortcut})',
  addToFavorites: 'Agregar a favoritos',
  removeFromFavorites: 'Quitar de favoritos',
  moveToTrash: 'Mover a la papelera',
  restore: 'Restaurar',
  moreActions: 'Más acciones',
  importMarkdown: 'Importar Markdown',
  markdownMenu: 'Markdown...',
  spellcheckOn: 'Ortografía: activada',
  spellcheckOff: 'Ortografía: desactivada',
  revealInFinder: 'Mostrar en el Finder | Mostrar en el gestor de archivos',
  markdownDialogTitle: 'Markdown',
  copy: 'Copiar',
  download: 'Descargar',
  exportFileName: 'nota',
  toast: {
    exported: 'Nota exportada como Markdown',
    imported: 'Markdown importado en la nota',
    copied: 'Copiado como Markdown'
  },
  // Etichette del picker "lista" della toolbar Quill (contenuto CSS ::before).
  listPicker: {
    list: 'Lista',
    ordered: 'Numerada',
    bullet: 'Con viñetas',
    checklist: 'Verificación'
  },
  // Menu "Claude" nella barra della nota e pannello di anteprima (ClaudePanel).
  claude: {
    menu: 'Claude',
    onSelection: 'Sobre la selección',
    onNote: 'Sobre toda la nota',
    signInHint: 'Inicie sesión en Claude Code en Ajustes para usar el asistente.',
    ask: 'Pregunta a Claude…',
    refine: 'Afinar, p. ej. «más corto»…',
    send: 'Enviar',
    quick: 'Acciones rápidas',
    proposal: 'Propuesta',
    changes: 'Cambios',
    retry: 'Reintentar',
    actions: {
      fix: 'Corregir ortografía y gramática',
      rephrase: 'Reformular',
      summarize: 'Resumir',
      continue: 'Seguir escribiendo'
    },
    working: 'Claude está escribiendo…',
    meta: 'Listo en {s} s',
    cancel: 'Cancelar',
    discard: 'Descartar',
    insertBelow: 'Insertar debajo',
    replace: 'Reemplazar',
    applied: 'Aplicado. Deshaga con el atajo habitual.',
    copiedToast: 'Copiado',
    emptyNote: 'La nota está vacía'
  }
}
