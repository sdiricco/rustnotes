<template>
  <!-- Anteprima del risultato di un'azione Claude: il testo compare in
       streaming, poi si sceglie cosa farne. Niente si tocca nella nota
       finche' non si preme Sostituisci o Inserisci; Scarta (o Esc) durante
       l'attesa annulla la richiesta. Componente muto: lo stato lo tiene
       NoteEditor, che sa dove reinserire il testo. -->
  <Dialog
    :visible="visible"
    modal
    :header="title"
    :style="{ width: '40rem' }"
    :draggable="false"
    dismissable-mask
    @update:visible="(v) => !v && $emit('discard')"
  >
    <div class="claude-scope">
      <Icon icon="lucide:sparkles" />
      <span>{{ scopeLabel }}</span>
    </div>
    <div v-if="error" class="claude-error" role="alert">
      <Icon icon="lucide:circle-alert" />
      <span>{{ error }}</span>
    </div>
    <pre v-else class="claude-text" :class="{ streaming }">{{ text }}<span v-if="streaming" class="caret" /></pre>
    <template #footer>
      <div class="claude-footer">
        <span class="claude-meta">
          <template v-if="streaming">{{ t('editor.claude.working') }}</template>
          <template v-else-if="reply">{{ t('editor.claude.meta', { s: (reply.durationMs / 1000).toFixed(1) }) }}</template>
        </span>
        <div class="claude-buttons">
          <button class="md-action-btn" @click="$emit('discard')">
            <Icon icon="lucide:x" />
            <span>{{ streaming ? t('editor.claude.cancel') : t('editor.claude.discard') }}</span>
          </button>
          <button class="md-action-btn" :disabled="!done" @click="$emit('copy')">
            <Icon icon="lucide:copy" />
            <span>{{ t('editor.copy') }}</span>
          </button>
          <button
            class="md-action-btn"
            :class="{ primary: primary === 'insert' }"
            :disabled="!done"
            @click="$emit('insert')"
          >
            <Icon icon="lucide:corner-down-right" />
            <span>{{ t('editor.claude.insertBelow') }}</span>
          </button>
          <button
            class="md-action-btn"
            :class="{ primary: primary === 'replace' }"
            :disabled="!done"
            @click="$emit('replace')"
          >
            <Icon icon="lucide:replace" />
            <span>{{ t('editor.claude.replace') }}</span>
          </button>
        </div>
      </div>
    </template>
  </Dialog>
</template>

<script setup>
import { computed } from 'vue'
import Dialog from 'primevue/dialog'
import { Icon } from '@iconify/vue'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  visible: { type: Boolean, default: false },
  // Voce di CLAUDE_ACTIONS in corso
  action: { type: Object, default: null },
  // true = si lavora sulla selezione, false = su tutta la nota
  onSelection: { type: Boolean, default: false },
  text: { type: String, default: '' },
  streaming: { type: Boolean, default: false },
  reply: { type: Object, default: null },
  error: { type: String, default: '' }
})
defineEmits(['replace', 'insert', 'copy', 'discard'])

const { t } = useI18n()

const title = computed(() => (props.action ? t(`editor.claude.actions.${props.action.id}`) : 'Claude'))
const scopeLabel = computed(() => t(props.onSelection ? 'editor.claude.onSelection' : 'editor.claude.onNote'))
const primary = computed(() => props.action?.primary || 'replace')
const done = computed(() => !props.streaming && !props.error && props.text.length > 0)
</script>

<style scoped>
.claude-scope {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--p-text-muted-color);
  margin-bottom: 10px;
}
.claude-scope :deep(svg) {
  font-size: 14px;
}

.claude-text {
  margin: 0;
  min-height: 4.5em;
  max-height: 50vh;
  overflow: auto;
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--search-bg);
  font: inherit;
  font-size: 13.5px;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
}
.caret {
  display: inline-block;
  width: 2px;
  height: 1em;
  margin-left: 1px;
  vertical-align: -0.15em;
  background: var(--p-text-color);
  animation: claude-blink 1s steps(2, start) infinite;
}
@keyframes claude-blink {
  to {
    visibility: hidden;
  }
}

.claude-error {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--search-bg);
  color: var(--p-red-500, #dc2626);
  font-size: 13px;
}

.claude-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
}
.claude-meta {
  font-size: 12px;
  color: var(--p-text-muted-color);
  white-space: nowrap;
}
.claude-buttons {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

/* Stessi pulsanti del dialogo Markdown di NoteEditor (li' sono scoped). */
.md-action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--p-content-border-color);
  background: transparent;
  color: var(--p-text-color);
  cursor: pointer;
  font-size: 13px;
  padding: 6px 14px;
  border-radius: 7px;
}
.md-action-btn:hover:not(:disabled) {
  background: var(--sidebar-hover-bg);
}
.md-action-btn:disabled {
  opacity: 0.45;
  cursor: default;
}
.md-action-btn.primary {
  background: var(--p-text-color);
  color: var(--editor-bg);
  border-color: transparent;
  font-weight: 600;
}
.md-action-btn.primary:hover:not(:disabled) {
  opacity: 0.9;
}
.md-action-btn :deep(svg) {
  font-size: 14px;
}
</style>
