// Einstellungs-Strings (de). Schlüssel in camelCase, befüllt von der gleichnamigen Komponente.
export default {
  title: 'Einstellungen',
  close: 'Einstellungen schließen',
  allCategories: 'Alle Kategorien',
  categoriesAria: 'Einstellungskategorien',

  sections: {
    general: 'Allgemein',
    appearance: 'Erscheinungsbild',
    editor: 'Editor',
    shortcuts: 'Kurzbefehle',
    about: 'Info',
    claude: 'Claude'
  },

  general: {
    language: {
      title: 'Sprache',
      aria: 'Sprache',
      system: 'System',
      note: 'Mit „System“ folgt die App der Sprache Ihres Betriebssystems.'
    },
    list: {
      title: 'Notizenliste',
      sortLabel: 'Standardsortierung',
      sortDesc: 'Wie die Notizenliste sortiert wird',
      sortUpdated: 'Änderungsdatum',
      sortCreated: 'Erstellungsdatum',
      sortTitle: 'Titel'
    }
  },

  appearance: {
    theme: {
      title: 'Erscheinungsbild',
      aria: 'Erscheinungsbild',
      system: 'System',
      light: 'Hell',
      dark: 'Dunkel',
      note: 'Mit „System“ folgt die App dem hellen oder dunklen Erscheinungsbild Ihres Betriebssystems.'
    }
  },

  editor: {
    spell: {
      title: 'Rechtschreibung',
      label: 'Rechtschreibung prüfen',
      desc: 'Unbekannte Wörter beim Tippen unterstreichen',
      langLabel: 'Sprache',
      langDesc: 'Wörterbuch für die Rechtschreibprüfung',
      langNoteMac: 'Unter macOS wird das Wörterbuch aus Systemeinstellungen > Tastatur > Rechtschreibung verwendet',
      langIt: 'Italienisch',
      langEn: 'Englisch',
      langEs: 'Spanisch',
      langFr: 'Französisch',
      langDe: 'Deutsch'
    }
  },

  shortcuts: {
    general: {
      title: 'Allgemein',
      newNote: 'Neue Notiz',
      newFolder: 'Neuer Ordner',
      duplicateNote: 'Notiz duplizieren',
      findInNote: 'In Notiz suchen',
      findInAllNotes: 'In allen Notizen suchen',
      toggleSidebar: 'Seitenleiste ein-/ausblenden',
      settings: 'Einstellungen',
      zoomIn: 'Vergrößern',
      zoomOut: 'Verkleinern',
      zoomReset: 'Originalgröße',
      claude: 'Claude-Assistent'
    },
    formatting: {
      title: 'Formatierung (im Editor)',
      bold: 'Fett',
      italic: 'Kursiv',
      underline: 'Unterstrichen',
      strike: 'Durchgestrichen',
      inlineCode: 'Inline-Code',
      headings: 'Überschrift 1 / 2 / 3',
      normalText: 'Textkörper',
      orderedList: 'Nummerierte Liste',
      bulletList: 'Aufzählungsliste',
      checklist: 'Checkliste',
      quote: 'Zitat',
      codeBlock: 'Codeblock',
      insertLink: 'Link einfügen',
      undoRedo: 'Widerrufen / Wiederholen'
    }
  },

  data: {
    title: 'Daten',
    folderLabel: 'Notizenordner',
    folderDesc: 'Wo Ihre Notizen auf der Festplatte gespeichert werden. Wählen Sie einen von iCloud, Dropbox oder Syncthing synchronisierten Ordner, um dieselben Notizen auf mehreren Computern zu verwenden.',
    defaultBadge: 'Standard',
    change: 'Ändern…',
    reset: 'Standardordner verwenden',
    reveal: 'Im Finder anzeigen | Im Dateimanager anzeigen',
    confirmMoveTitle: 'Notizen bewegen?',
    confirmMove: 'Keine Notizen zu bewegen. RustNotes verwendet ab jetzt {dir}. | Ihre Notiz wird nach {dir} bewegt. | Ihre {count} Notizen werden nach {dir} bewegt.',
    confirmAdoptTitle: 'Die dort vorhandenen Notizen verwenden?',
    confirmAdopt: '{dir} enthält bereits eine RustNotes-Notiz. Die App wechselt zu dieser; die aktuell angezeigten Notizen bleiben, wo sie sind, und werden nicht mehr angezeigt. | {dir} enthält bereits {count} RustNotes-Notizen. Die App wechselt zu diesen; die aktuell angezeigten Notizen bleiben, wo sie sind, und werden nicht mehr angezeigt.',
    confirm: 'Fortfahren',
    cancel: 'Abbrechen',
    movedToast: 'Notizen bewegt',
    adoptedToast: 'Notizenordner geändert',
    toastDetail: 'Jetzt in Verwendung: {dir}',
    failedToast: 'Der Notizenordner konnte nicht geändert werden'
  },
  about: {
    exportAll: 'Alle Notizen exportieren',
    exportAllDesc: 'Jede Notiz als Markdown-Datei, ein Unterordner pro Ordner. Der Papierkorb wird nicht einbezogen.',
    exportAllButton: 'Exportieren…',
    title: 'Programm',
    version: 'Version',
    updates: 'Updates',
    updatesDesc: 'Mit der neuesten veröffentlichten Version vergleichen',
    checking: 'Wird geprüft…',
    checkUpdates: 'Nach Updates suchen',
    available: 'Version {version} verfügbar — ausführen:',
    upToDate: 'Sie haben die neueste Version'
  },

  claude: {
    title: 'Claude Code',
    enableLabel: 'Im Editor anzeigen',
    enableDesc: 'Fügt der Notizleiste eine Claude-Schaltfläche mit Korrigieren, Umformulieren, Zusammenfassen und Weiterschreiben hinzu.',
    modelLabel: 'Modell',
    modelDesc: 'Sonnet ist schnell und reicht zum Bearbeiten; Opus ist langsamer und stärker bei langen oder komplexen Texten.',
    models: {
      sonnet: 'Sonnet (empfohlen)',
      opus: 'Opus',
      haiku: 'Haiku (am schnellsten)'
    },
    statusLabel: 'Kommandozeilen-Tool',
    statusDesc: 'RustNotes nutzt die bereits auf diesem Mac installierte Claude Code CLI. In der App wird kein API-Schlüssel gespeichert.',
    recheck: 'Erneut prüfen',
    checking: 'Prüfung…',
    found: 'Version {version}',
    notFound: 'Nicht gefunden',
    notFoundHint: 'Installieren Sie Claude Code, öffnen Sie dann das Terminal und führen Sie einmal `claude` aus, um sich anzumelden.',
    notLoggedIn: 'Nicht angemeldet',
    notLoggedInHint: 'Klicken Sie auf Anmelden: das Terminal öffnet sich mit der Claude Code Anmeldung.',
    login: 'Anmelden',
    loginDone: 'Sie können dieses Fenster schließen und zu RustNotes zurückkehren.',
    ready: 'Bereit',
    testTitle: 'Ausprobieren',
    testLabel: 'Anweisung',
    testPlaceholder: 'z. B. Rechtschreibung und Grammatik korrigieren',
    textLabel: 'Text',
    textPlaceholder: 'Fügen Sie hier einen Text ein',
    send: 'Senden',
    sending: 'Warten auf Claude…',
    replyLabel: 'Antwort',
    meta: '{ms} ms · ${cost}',
    errNotFound: 'Claude Code nicht gefunden',
    errNotLoggedIn: 'Melden Sie sich zuerst im Terminal bei Claude Code an',
    errTimeout: 'Claude hat nicht rechtzeitig geantwortet',
    errFailed: 'Anfrage an Claude fehlgeschlagen'
  }
}
