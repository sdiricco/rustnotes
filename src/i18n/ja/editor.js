// Stringhe editor (ja). Chiavi camelCase, riempite dal componente omonimo.
export default {
  emptyState: 'メモを選択するか、新規メモを作成してください',
  findInNote: 'メモ内を検索 ({shortcut})',
  addToFavorites: 'お気に入りに追加',
  removeFromFavorites: 'お気に入りから削除',
  moveToTrash: 'ゴミ箱に入れる',
  restore: '復元',
  moreActions: 'その他のアクション',
  importMarkdown: 'Markdownを読み込む',
  markdownMenu: 'Markdown...',
  spellcheckOn: 'スペルチェック: オン',
  spellcheckOff: 'スペルチェック: オフ',
  revealInFinder: 'Finderに表示 | ファイルマネージャに表示',
  markdownDialogTitle: 'Markdown',
  copy: 'コピー',
  download: 'ダウンロード',
  exportFileName: 'メモ',
  toast: {
    exported: 'メモをMarkdownとして書き出しました',
    imported: 'Markdownをメモに読み込みました',
    copied: 'Markdownとしてコピーしました'
  },
  // Etichette del picker "lista" della toolbar Quill (contenuto CSS ::before).
  listPicker: {
    list: 'リスト',
    ordered: '番号付き',
    bullet: '箇条書き',
    checklist: 'チェックリスト'
  },
  // Menu "Claude" nella barra della nota e pannello di anteprima (ClaudePanel).
  claude: {
    menu: 'Claude',
    onSelection: '選択範囲に対して',
    onNote: 'ノート全体に対して',
    signInHint: '設定でClaude Codeにサインイン…',
    actions: {
      fix: 'スペルと文法を修正',
      rephrase: '言い換える',
      summarize: '要約する',
      continue: '続きを書く'
    },
    working: 'Claudeが書いています…',
    meta: '{s}秒で完了',
    cancel: 'キャンセル',
    discard: '破棄',
    insertBelow: '下に挿入',
    replace: '置き換える',
    applied: '適用しました。通常のショートカットで元に戻せます。',
    copiedToast: 'コピーしました',
    emptyNote: 'ノートは空です'
  }
}
