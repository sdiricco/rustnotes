// Stringhe editor (zh). Chiavi camelCase, riempite dal componente omonimo.
export default {
  emptyState: '选择一个备忘录，或新建一个',
  findInNote: '在备忘录中查找 ({shortcut})',
  addToFavorites: '添加到个人收藏',
  removeFromFavorites: '从个人收藏中移除',
  moveToTrash: '移到废纸篓',
  restore: '恢复',
  moreActions: '更多操作',
  importMarkdown: '导入 Markdown',
  markdownMenu: 'Markdown…',
  spellcheckOn: '拼写检查：开',
  spellcheckOff: '拼写检查：关',
  revealInFinder: '在 Finder 中显示 | 在文件管理器中显示',
  markdownDialogTitle: 'Markdown',
  copy: '拷贝',
  download: '下载',
  exportFileName: '备忘录',
  toast: {
    exported: '备忘录已导出为 Markdown',
    imported: 'Markdown 已导入到备忘录',
    copied: '已拷贝为 Markdown'
  },
  // Etichette del picker "lista" della toolbar Quill (contenuto CSS ::before).
  listPicker: {
    list: '列表',
    ordered: '编号',
    bullet: '项目符号',
    checklist: '核对清单'
  },
  // Menu "Claude" nella barra della nota e pannello di anteprima (ClaudePanel).
  claude: {
    menu: 'Claude',
    onSelection: '针对所选内容',
    onNote: '针对整篇笔记',
    signInHint: '在设置中登录 Claude Code…',
    actions: {
      fix: '修正拼写和语法',
      rephrase: '改写',
      summarize: '总结',
      continue: '续写'
    },
    working: 'Claude 正在撰写…',
    meta: '用时 {s} 秒',
    cancel: '取消',
    discard: '放弃',
    insertBelow: '插入到下方',
    replace: '替换',
    applied: '已应用。可用常规快捷键撤销。',
    copiedToast: '已复制',
    emptyNote: '笔记为空'
  }
}
