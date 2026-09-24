// Stringhe settings (zh). Chiavi camelCase, riempite dal componente omonimo.
export default {
  title: '设置',
  close: '关闭设置',
  allCategories: '所有类别',
  categoriesAria: '设置类别',

  sections: {
    general: '通用',
    appearance: '外观',
    editor: '编辑器',
    shortcuts: '快捷键',
    about: '关于',
    claude: 'Claude'
  },

  general: {
    language: {
      title: '语言',
      aria: '语言',
      system: '跟随系统',
      note: '选择"跟随系统"时，App 将使用操作系统的语言。'
    },
    list: {
      title: '备忘录列表',
      sortLabel: '默认排序方式',
      sortDesc: '备忘录列表的排列顺序',
      sortUpdated: '修改日期',
      sortCreated: '创建日期',
      sortTitle: '标题'
    }
  },

  appearance: {
    theme: {
      title: '主题',
      aria: '主题',
      system: '跟随系统',
      light: '浅色',
      dark: '深色',
      note: '选择"跟随系统"时，App 将跟随操作系统的浅色或深色外观。'
    }
  },

  editor: {
    spell: {
      title: '拼写',
      label: '检查拼写',
      desc: '输入时为无法识别的单词加下划线',
      langLabel: '语言',
      langDesc: '用于拼写检查的词典',
      langNoteMac: '在 macOS 上，词典由“系统设置 > 键盘 > 拼写”决定',
      langIt: '意大利语',
      langEn: '英语',
      langEs: '西班牙语',
      langFr: '法语',
      langDe: '德语'
    }
  },

  shortcuts: {
    general: {
      title: '通用',
      newNote: '新建备忘录',
      newFolder: '新建文件夹',
      duplicateNote: '复制备忘录',
      findInNote: '在备忘录中查找',
      findInAllNotes: '在所有备忘录中查找',
      toggleSidebar: '显示/隐藏边栏',
      settings: '设置',
      zoomIn: '放大',
      zoomOut: '缩小',
      zoomReset: '实际大小',
      claude: 'Claude 助手'
    },
    formatting: {
      title: '格式（编辑器内）',
      bold: '粗体',
      italic: '斜体',
      underline: '下划线',
      strike: '删除线',
      inlineCode: '行内代码',
      headings: '标题 1 / 2 / 3',
      normalText: '正文',
      orderedList: '编号列表',
      bulletList: '项目符号列表',
      checklist: '核对清单',
      quote: '引用块',
      codeBlock: '代码块',
      insertLink: '插入链接',
      undoRedo: '撤销 / 重做'
    }
  },

  data: {
    title: '数据',
    folderLabel: '备忘录文件夹',
    folderDesc: '备忘录在磁盘上的存储位置。将其指向由 iCloud、Dropbox 或 Syncthing 同步的文件夹，即可在多台电脑上使用同一份备忘录。',
    defaultBadge: '默认',
    change: '更改…',
    reset: '使用默认文件夹',
    reveal: '在 Finder 中显示 | 在文件管理器中显示',
    confirmMoveTitle: '要移动备忘录吗？',
    confirmMove: '没有需要移动的备忘录。RustNotes 将开始使用 {dir}。 | 您的备忘录将被移到 {dir}。 | 您的 {count} 个备忘录将被移到 {dir}。',
    confirmAdoptTitle: '要使用该位置已有的备忘录吗？',
    confirmAdopt: '{dir} 中已有 1 个 RustNotes 备忘录。App 将切换为使用它；您当前看到的备忘录会留在原处，但不再显示。 | {dir} 中已有 {count} 个 RustNotes 备忘录。App 将切换为使用它们；您当前看到的备忘录会留在原处，但不再显示。',
    confirm: '继续',
    cancel: '取消',
    movedToast: '备忘录已移动',
    adoptedToast: '备忘录文件夹已更改',
    toastDetail: '现在使用 {dir}',
    failedToast: '无法更改备忘录文件夹'
  },
  about: {
    exportAll: '导出所有备忘录',
    exportAllDesc: '将每个备忘录导出为 Markdown 文件，每个文件夹对应一个子文件夹。不包含废纸篓。',
    exportAllButton: '导出…',
    title: '应用程序',
    version: '版本',
    updates: '更新',
    updatesDesc: '与最新发布的版本进行比较',
    checking: '正在检查…',
    checkUpdates: '检查更新',
    available: '{version} 版可用 — 请运行',
    upToDate: '您已安装最新版本'
  },

  claude: {
    title: 'Claude Code',
    enableLabel: '在编辑器中显示',
    enableDesc: '在笔记工具栏添加 Claude 按钮，提供修正、改写、总结和续写。',
    modelLabel: '模型',
    modelDesc: 'Sonnet 速度快，足以胜任修改和改写；Opus 较慢，但在长文或复杂文本上更强。',
    models: {
      sonnet: 'Sonnet（推荐）',
      opus: 'Opus',
      haiku: 'Haiku（最快）'
    },
    statusLabel: '命令行工具',
    statusDesc: 'RustNotes 使用这台 Mac 上已安装的 Claude Code 命令行工具。应用中不保存任何 API 密钥。',
    recheck: '重新检查',
    checking: '检查中…',
    found: '版本 {version}',
    notFound: '未找到',
    notFoundHint: '请安装 Claude Code，然后打开终端运行一次 `claude` 以登录。',
    notLoggedIn: '未登录',
    notLoggedInHint: '点击“登录”：终端将打开并进入 Claude Code 登录流程。',
    login: '登录',
    loginDone: '您可以关闭此窗口并返回 RustNotes。',
    ready: '就绪',
    testTitle: '试一试',
    testLabel: '指令',
    testPlaceholder: '例如：修正拼写和语法',
    textLabel: '文本',
    textPlaceholder: '在此粘贴文本',
    send: '发送',
    sending: '等待 Claude 回复…',
    replyLabel: '回复',
    meta: '{ms} ms · ${cost}',
    errNotFound: '未找到 Claude Code',
    errNotLoggedIn: '请先在终端登录 Claude Code',
    errTimeout: 'Claude 未及时回复',
    errFailed: '向 Claude 发送请求失败'
  }
}
