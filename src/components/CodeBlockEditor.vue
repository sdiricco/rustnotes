<template>
  <!-- La destinazione e' il pannello NoteEditor, non body: CodeMirror copre
       anche la toolbar di formattazione ma lascia visibili sidebar e header
       globale dell'app. -->
  <Teleport to=".note-editor">
  <section class="code-editor-page" role="region" :aria-label="t('quill.codeEditor.title')">
    <header class="code-editor-header">
      <div class="code-editor-title">
        <Icon icon="lucide:file-code-2" />
        <span>{{ t('quill.codeEditor.title') }}</span>
      </div>
      <label class="code-editor-language">
        <span>{{ t('quill.codeEditor.language') }}</span>
        <select v-model="language" @change="setLanguage">
          <option v-for="item in languages" :key="item.key" :value="item.key">
            {{ item.label }}
          </option>
        </select>
      </label>
      <button
        type="button"
        class="code-editor-close"
        :title="t('quill.findBar.close')"
        @click="emit('cancel')"
      >
        <Icon icon="lucide:x" />
      </button>
    </header>

    <div ref="editorEl" class="code-editor-host"></div>

    <footer class="code-editor-footer">
      <span class="code-editor-hint">{{ t('quill.codeEditor.saveHint') }}</span>
      <button type="button" class="code-editor-cancel" @click="emit('cancel')">
        {{ t('quill.prompt.cancel') }}
      </button>
      <button type="button" class="code-editor-save" @click="save">
        {{ t('quill.codeEditor.save') }}
      </button>
    </footer>
  </section>
  </Teleport>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Icon } from '@iconify/vue'
import { basicSetup } from 'codemirror'
import { Compartment, EditorState, Prec } from '@codemirror/state'
import { EditorView, keymap } from '@codemirror/view'
import { indentWithTab } from '@codemirror/commands'
import { autocompletion, completeAnyWord, completeFromList } from '@codemirror/autocomplete'
import { HighlightStyle, StreamLanguage, syntaxHighlighting } from '@codemirror/language'
import { tags } from '@lezer/highlight'
import { javascript } from '@codemirror/lang-javascript'
import { python } from '@codemirror/lang-python'
import { json } from '@codemirror/lang-json'
import { html } from '@codemirror/lang-html'
import { css } from '@codemirror/lang-css'
import { sql } from '@codemirror/lang-sql'
import { markdown } from '@codemirror/lang-markdown'
import { php } from '@codemirror/lang-php'
import { shell } from '@codemirror/legacy-modes/mode/shell'
import { yaml } from '@codemirror/legacy-modes/mode/yaml'
import { sCSS } from '@codemirror/legacy-modes/mode/css'
import { c, cpp, csharp, java } from '@codemirror/legacy-modes/mode/clike'
import { go } from '@codemirror/legacy-modes/mode/go'
import { rust } from '@codemirror/legacy-modes/mode/rust'
import { ruby } from '@codemirror/legacy-modes/mode/ruby'
import { codeCompletionsFor, codeMemberCompletionsFor } from '../utils/codeCompletions'

const props = defineProps({
  code: { type: String, default: '' },
  initialLanguage: { type: String, default: 'plain' },
  languages: { type: Array, default: () => [] }
})

const emit = defineEmits(['save', 'cancel'])
const { t } = useI18n()
const editorEl = ref(null)
const language = ref(props.initialLanguage || 'plain')
const languageSlot = new Compartment()
const completionSlot = new Compartment()
let view = null

const legacy = (mode) => StreamLanguage.define(mode)
const languageExtension = (name) => {
  switch (name) {
    case 'javascript': return javascript({ jsx: true })
    case 'typescript': return javascript({ jsx: true, typescript: true })
    case 'python': return python()
    case 'json': return json()
    case 'xml': return html()
    case 'css': return css()
    case 'scss': return legacy(sCSS)
    case 'sql': return sql()
    case 'markdown': return markdown()
    case 'php': return php()
    case 'bash': return legacy(shell)
    case 'yaml': return legacy(yaml)
    case 'java': return legacy(java)
    case 'csharp': return legacy(csharp)
    case 'cpp': return legacy(cpp)
    case 'c': return legacy(c)
    case 'go': return legacy(go)
    case 'rust': return legacy(rust)
    case 'ruby': return legacy(ruby)
    default: return []
  }
}

const completionExtension = (name) => {
  const languageSource = completeFromList(codeCompletionsFor(name))
  const members = codeMemberCompletionsFor(name)
  const contextualLanguageSource = (context) => {
    // Dopo il punto mostriamo subito i membri, anche prima che venga digitata
    // la prima lettera (`[].` → map/filter/…). Negli altri casi rimane la
    // lista generale del linguaggio.
    const member = members.length ? context.matchBefore(/\.\w*$/) : null
    if (member) {
      return { from: member.from + 1, options: members, validFor: /^\w*$/ }
    }
    return languageSource(context)
  }
  return autocompletion({
    // Parole/API del linguaggio più identificatori già presenti nel blocco:
    // utile anche per i parser legacy, che non hanno completions proprie.
    override: [contextualLanguageSource, completeAnyWord],
    activateOnTyping: true,
    maxRenderedOptions: 100,
    icons: true
  })
}

const editorTheme = EditorView.theme({
  '&': {
    height: '100%',
    color: 'var(--cm-text)',
    backgroundColor: 'var(--editor-bg)',
    fontSize: '13px'
  },
  '.cm-content': {
    fontFamily: "'SF Mono', ui-monospace, Menlo, Monaco, Consolas, monospace",
    caretColor: 'var(--p-text-color)',
    padding: '12px 0'
  },
  '.cm-scroller': { overflow: 'auto' },
  '.cm-gutters': {
    backgroundColor: 'var(--editor-toolbar-bg)',
    color: 'var(--p-text-muted-color)',
    borderRight: '1px solid var(--p-content-border-color)'
  },
  '.cm-activeLine, .cm-activeLineGutter': { backgroundColor: 'var(--selection-bg)' },
  '&.cm-focused .cm-selectionBackground, ::selection': { backgroundColor: 'var(--cm-selection) !important' },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--p-text-color)' },
  '.cm-panels': { backgroundColor: 'var(--editor-toolbar-bg)', color: 'var(--p-text-color)' },
  '.cm-textfield': {
    backgroundColor: 'var(--search-bg)',
    color: 'var(--p-text-color)',
    borderColor: 'var(--p-content-border-color)'
  },
  '.cm-tooltip': {
    backgroundColor: 'var(--editor-toolbar-bg)',
    color: 'var(--p-text-color)',
    border: '1px solid var(--p-content-border-color)',
    borderRadius: '7px',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.24)',
    overflow: 'hidden'
  },
  '.cm-tooltip-autocomplete > ul': {
    fontFamily: "'SF Mono', ui-monospace, Menlo, Monaco, Consolas, monospace",
    maxHeight: '260px'
  },
  '.cm-tooltip-autocomplete > ul > li': {
    color: 'var(--p-text-color)',
    padding: '3px 8px'
  },
  '.cm-tooltip-autocomplete > ul > li[aria-selected]': {
    backgroundColor: 'var(--selection-bg)',
    color: 'var(--p-text-color)'
  },
  '.cm-completionDetail': { color: 'var(--p-text-muted-color)', fontStyle: 'normal' },
  '.cm-completionIcon': { opacity: '0.72' }
})

const codeHighlightStyle = HighlightStyle.define([
  { tag: [tags.keyword, tags.modifier, tags.operatorKeyword], color: 'var(--cm-keyword)' },
  { tag: [tags.string, tags.special(tags.string), tags.regexp], color: 'var(--cm-string)' },
  { tag: [tags.number, tags.bool, tags.null], color: 'var(--cm-number)' },
  { tag: [tags.comment, tags.lineComment, tags.blockComment], color: 'var(--cm-comment)', fontStyle: 'italic' },
  { tag: [tags.function(tags.variableName), tags.function(tags.propertyName)], color: 'var(--cm-function)' },
  { tag: [tags.typeName, tags.className, tags.namespace], color: 'var(--cm-type)' },
  { tag: [tags.propertyName, tags.attributeName], color: 'var(--cm-property)' },
  { tag: [tags.punctuation, tags.operator], color: 'var(--cm-punct)' },
  { tag: [tags.heading, tags.strong], color: 'var(--cm-heading)', fontWeight: '600' },
  { tag: [tags.link, tags.url], color: 'var(--cm-link)', textDecoration: 'underline' },
  { tag: tags.monospace, color: 'var(--cm-code)' },
  { tag: tags.meta, color: 'var(--cm-meta)' }
])

function setLanguage() {
  view?.dispatch({
    effects: [
      languageSlot.reconfigure(languageExtension(language.value)),
      completionSlot.reconfigure(completionExtension(language.value))
    ]
  })
}

function save() {
  emit('save', { code: view?.state.doc.toString() ?? '', language: language.value })
}

onMounted(() => {
  view = new EditorView({
    parent: editorEl.value,
    state: EditorState.create({
      doc: props.code,
      extensions: [
        basicSetup,
        Prec.highest(keymap.of([
          { key: 'Mod-Enter', run: () => { save(); return true } },
          { key: 'Escape', run: () => { emit('cancel'); return true } }
        ])),
        keymap.of([
          indentWithTab
        ]),
        languageSlot.of(languageExtension(language.value)),
        completionSlot.of(completionExtension(language.value)),
        syntaxHighlighting(codeHighlightStyle),
        editorTheme
      ]
    })
  })
  view.focus()
})

onBeforeUnmount(() => {
  view?.destroy()
  view = null
})
</script>

<style scoped>
.code-editor-page {
  position: absolute;
  inset: 0;
  z-index: 18;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--editor-bg);
}
.code-editor-header,
.code-editor-footer {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: var(--editor-toolbar-bg);
}
.code-editor-header { border-bottom: 1px solid var(--p-content-border-color); }
.code-editor-footer { border-top: 1px solid var(--p-content-border-color); }
.code-editor-title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--p-text-color);
  font-size: 13px;
  font-weight: 600;
}
.code-editor-title :deep(svg) { font-size: 17px; color: var(--icon-color); }
.code-editor-language {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 7px;
  color: var(--p-text-muted-color);
  font-size: 12px;
}
.code-editor-language select {
  min-width: 130px;
  border: 1px solid var(--p-content-border-color);
  border-radius: 6px;
  background: var(--card-bg);
  color: var(--p-text-color);
  padding: 5px 8px;
  outline: none;
}
.code-editor-close {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--icon-color);
  cursor: pointer;
}
.code-editor-close:hover {
  background: var(--selection-bg);
  color: var(--p-text-color);
}
.code-editor-close :deep(svg) { font-size: 16px; }
.code-editor-host { flex: 1; min-height: 0; overflow: hidden; }
.code-editor-host :deep(.cm-editor) { outline: none; }
.code-editor-hint { margin-right: auto; color: var(--p-text-muted-color); font-size: 11px; }
.code-editor-footer button {
  border: 1px solid var(--p-content-border-color);
  border-radius: 7px;
  padding: 6px 13px;
  font-size: 12px;
  cursor: pointer;
}
.code-editor-cancel { background: transparent; color: var(--p-text-color); }
.code-editor-cancel:hover { background: var(--selection-bg); }
.code-editor-save { background: var(--p-text-color); color: var(--editor-bg); }
.code-editor-save:hover { opacity: 0.88; }
@media (max-width: 600px) {
  .code-editor-language > span,
  .code-editor-hint { display: none; }
}
</style>
