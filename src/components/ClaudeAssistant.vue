<template>
  <!-- Pannello dell'assistente, come un widget di assistenza: si apre in
       basso a destra sopra il pulsante fisso (claude-fab in NoteEditor), con
       il campo per scrivere in fondo. Sopra: azioni rapide, oppure la
       proposta in streaming con vista Proposta/Differenze e i pulsanti per
       applicarla. Non modale: la nota resta visibile con la porzione di
       partenza evidenziata (markRange in QuillEditor). Niente si tocca
       finche' non si preme Sostituisci o Inserisci. Componente muto: lo stato
       lo tiene NoteEditor, che sa dove reinserire il testo. -->
  <Teleport to="body">
    <Transition name="cp">
      <div
        v-if="open"
        ref="rootEl"
        class="claude-pop"
        role="dialog"
        :aria-label="t('editor.claude.menu')"
        @keydown="onKeydown"
      >
        <div class="cp-head">
          <Icon icon="lucide:sparkles" class="cp-spark" />
          <span class="cp-name">Claude</span>
          <span class="cp-scope">{{ t(onSelection ? 'editor.claude.onSelection' : 'editor.claude.onNote') }}</span>
          <button class="cp-x" :title="t('editor.claude.discard')" @click="$emit('close')">
            <Icon icon="lucide:x" />
          </button>
        </div>

        <div class="cp-body">
          <template v-if="!ready">
            <button class="cp-signin" @click="$emit('settings')">
              <Icon icon="lucide:log-in" />
              <span>{{ t('editor.claude.signInHint') }}</span>
            </button>
          </template>

          <template v-else-if="!run">
            <div class="cp-hint">{{ t('editor.claude.quick') }}</div>
            <div class="cp-chips">
              <button v-for="a in actions" :key="a.id" class="cp-chip" @click="$emit('action', a)">
                <Icon :icon="a.icon" />
                <span>{{ t(`editor.claude.actions.${a.id}`) }}</span>
              </button>
            </div>
          </template>

          <template v-else>
            <div class="cp-ask" :title="run.label">
              <Icon icon="lucide:message-square" />
              <span>{{ run.label }}</span>
            </div>
            <div v-if="canDiff" class="cp-tabs" role="tablist">
              <button role="tab" :aria-selected="view === 'proposal'" :class="{ active: view === 'proposal' }" @click="view = 'proposal'">
                {{ t('editor.claude.proposal') }}
              </button>
              <button role="tab" :aria-selected="view === 'diff'" :class="{ active: view === 'diff' }" @click="view = 'diff'">
                {{ t('editor.claude.changes') }}
              </button>
            </div>

            <div v-if="run.error" class="cp-error" role="alert">
              <Icon icon="lucide:circle-alert" />
              <span>{{ run.error }}</span>
            </div>
            <div v-else-if="canDiff && view === 'diff'" class="cp-text cp-diff">
              <template v-for="(part, i) in diffParts" :key="i">
                <del v-if="part.removed">{{ part.value }}</del>
                <ins v-else-if="part.added">{{ part.value }}</ins>
                <span v-else>{{ part.value }}</span>
              </template>
            </div>
            <div v-else class="cp-text">{{ run.text }}<span v-if="run.streaming" class="cp-caret" /></div>

            <div class="cp-foot">
              <span class="cp-meta">
                <template v-if="run.streaming">{{ t('editor.claude.working') }}</template>
                <template v-else-if="run.reply">{{ t('editor.claude.meta', { s: (run.reply.durationMs / 1000).toFixed(1) }) }}</template>
              </span>
              <div class="cp-btns">
                <button class="cp-btn" :title="t('editor.claude.retry')" :disabled="working" @click="$emit('retry')">
                  <Icon icon="lucide:rotate-cw" />
                </button>
                <button class="cp-btn" :title="t('editor.copy')" :disabled="!done" @click="$emit('copy')">
                  <Icon icon="lucide:copy" />
                </button>
                <button class="cp-btn" :class="{ primary: primary === 'insert' }" :disabled="!done" @click="$emit('insert')">
                  <Icon icon="lucide:corner-down-right" />
                  <span>{{ t('editor.claude.insertBelow') }}</span>
                </button>
                <button class="cp-btn" :class="{ primary: primary === 'replace' }" :disabled="!done" @click="$emit('replace')">
                  <Icon icon="lucide:replace" />
                  <span>{{ t('editor.claude.replace') }}</span>
                </button>
              </div>
            </div>
          </template>
        </div>

        <div v-if="ready" class="cp-input">
          <textarea
            ref="inputEl"
            v-model="input"
            rows="1"
            :placeholder="run ? t('editor.claude.refine') : t('editor.claude.ask')"
            :disabled="working"
            @input="autosize"
          ></textarea>
          <button class="cp-send" :disabled="!input.trim() || working" :title="t('editor.claude.send')" @click="submit">
            <Icon icon="lucide:arrow-up" />
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { useI18n } from 'vue-i18n'
import { diffWords } from 'diff'
import { CLAUDE_ACTIONS } from '../utils/claudeActions'

const props = defineProps({
  open: { type: Boolean, default: false },
  onSelection: { type: Boolean, default: false },
  // CLI installata e loggata
  ready: { type: Boolean, default: true },
  // Richiesta corrente (reattiva, di NoteEditor): { action, label, original,
  // text, streaming, reply, error } oppure null prima della prima richiesta.
  run: { type: Object, default: null }
})
const emit = defineEmits(['action', 'ask', 'refine', 'retry', 'replace', 'insert', 'copy', 'close', 'settings'])

const { t } = useI18n()
const actions = CLAUDE_ACTIONS

const rootEl = ref(null)
const inputEl = ref(null)
const input = ref('')
const view = ref('proposal')

const working = computed(() => Boolean(props.run?.streaming))
const done = computed(() => Boolean(props.run) && !props.run.streaming && !props.run.error && props.run.text.length > 0)
const primary = computed(() => props.run?.action?.primary || 'replace')
// Il confronto ha senso solo quando la proposta rimpiazza il testo di
// partenza: per riassunto e continuazione si mostra solo la proposta.
const canDiff = computed(() => done.value && primary.value === 'replace' && Boolean(props.run.original))
const diffParts = computed(() => (canDiff.value ? diffWords(props.run.original, props.run.text) : []))

function autosize() {
  const el = inputEl.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight, 120)}px`
}

function submit() {
  const text = input.value.trim()
  if (!text || working.value) return
  emit(props.run ? 'refine' : 'ask', text)
  input.value = ''
  nextTick(autosize)
}

function onKeydown(e) {
  if (e.key === 'Escape') {
    e.preventDefault()
    emit('close')
  } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
    if (done.value) {
      e.preventDefault()
      emit(primary.value)
    }
  } else if (e.key === 'Enter' && !e.shiftKey && e.target === inputEl.value) {
    e.preventDefault()
    submit()
  }
}

watch(
  () => props.open,
  async (open) => {
    if (!open) return
    input.value = ''
    view.value = 'proposal'
    await nextTick()
    inputEl.value?.focus()
  }
)
// Nuova richiesta: si riparte dalla proposta, e il campo torna pronto.
watch(
  () => props.run,
  async () => {
    view.value = 'proposal'
    await nextTick()
    if (!working.value) inputEl.value?.focus()
  }
)
</script>

<style scoped>
.claude-pop {
  position: fixed;
  right: 20px;
  bottom: 78px;
  z-index: 60;
  width: min(420px, calc(100vw - 32px));
  max-height: calc(100vh - 120px);
  display: flex;
  flex-direction: column;
  background: var(--editor-toolbar-bg);
  border: 1px solid var(--p-content-border-color);
  border-radius: 14px;
  box-shadow: 0 14px 40px rgba(0, 0, 0, 0.24);
  color: var(--p-text-color);
  font-size: 13px;
  overflow: hidden;
}
.cp-enter-active,
.cp-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.cp-enter-from,
.cp-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(0.98);
}

.cp-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--p-content-border-color);
  flex-shrink: 0;
}
.cp-spark {
  color: #7c5cff;
  font-size: 16px;
  flex-shrink: 0;
}
.cp-name {
  font-weight: 600;
  font-size: 13.5px;
}
.cp-scope {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--p-text-muted-color);
  background: var(--search-bg);
  border-radius: 999px;
  padding: 2px 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.cp-x {
  margin-left: auto;
  border: none;
  background: transparent;
  color: var(--icon-color);
  cursor: pointer;
  padding: 3px;
  border-radius: 5px;
  display: flex;
  font-size: 15px;
  flex-shrink: 0;
}
.cp-x:hover {
  background: var(--sidebar-hover-bg);
}

.cp-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  overflow: auto;
  flex: 1;
  min-height: 120px;
}
.cp-hint {
  font-size: 12px;
  color: var(--p-text-muted-color);
}
.cp-ask {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12.5px;
  color: var(--p-text-muted-color);
  overflow: hidden;
}
.cp-ask span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cp-ask :deep(svg) {
  flex-shrink: 0;
  font-size: 13px;
}

.cp-input {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  margin: 0 12px 12px;
  border: 1px solid var(--p-content-border-color);
  border-radius: 10px;
  padding: 6px 6px 6px 10px;
  background: var(--editor-bg);
  flex-shrink: 0;
}
.cp-input:focus-within {
  border-color: #7c5cff;
}
.cp-input textarea {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 13.5px;
  line-height: 1.4;
  resize: none;
  padding: 3px 0;
  max-height: 120px;
}
.cp-send {
  border: none;
  border-radius: 7px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #7c5cff;
  color: #fff;
  cursor: pointer;
  flex-shrink: 0;
}
.cp-send:disabled {
  opacity: 0.35;
  cursor: default;
}

.cp-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.cp-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--p-content-border-color);
  background: transparent;
  color: var(--p-text-color);
  border-radius: 999px;
  padding: 5px 11px;
  font-size: 12.5px;
  cursor: pointer;
}
.cp-chip:hover {
  background: var(--sidebar-hover-bg);
}
.cp-chip :deep(svg) {
  font-size: 13px;
  color: var(--icon-color);
}

.cp-tabs {
  display: flex;
  gap: 2px;
  border-bottom: 1px solid var(--p-content-border-color);
}
.cp-tabs button {
  border: none;
  background: transparent;
  color: var(--p-text-muted-color);
  font-size: 12.5px;
  padding: 5px 10px;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
}
.cp-tabs button.active {
  color: var(--p-text-color);
  border-bottom-color: #7c5cff;
}

.cp-text {
  min-height: 3.2em;
  max-height: 40vh;
  overflow: auto;
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--search-bg);
  font-size: 13.5px;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
  flex: 1;
}
.cp-diff del {
  background: rgba(220, 38, 38, 0.16);
  color: inherit;
  text-decoration: line-through;
  text-decoration-color: rgba(220, 38, 38, 0.7);
  border-radius: 2px;
}
.cp-diff ins {
  background: rgba(22, 163, 74, 0.18);
  text-decoration: none;
  border-radius: 2px;
}
.cp-caret {
  display: inline-block;
  width: 2px;
  height: 1em;
  margin-left: 1px;
  vertical-align: -0.15em;
  background: var(--p-text-color);
  animation: cp-blink 1s steps(2, start) infinite;
}
@keyframes cp-blink {
  to {
    visibility: hidden;
  }
}

.cp-error {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--search-bg);
  color: #dc2626;
}

.cp-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.cp-meta {
  font-size: 12px;
  color: var(--p-text-muted-color);
  white-space: nowrap;
}
.cp-btns {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.cp-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--p-content-border-color);
  background: transparent;
  color: var(--p-text-color);
  cursor: pointer;
  font-size: 12.5px;
  padding: 5px 10px;
  border-radius: 7px;
}
.cp-btn:hover:not(:disabled) {
  background: var(--sidebar-hover-bg);
}
.cp-btn:disabled {
  opacity: 0.4;
  cursor: default;
}
.cp-btn.primary {
  background: var(--p-text-color);
  color: var(--editor-bg);
  border-color: transparent;
  font-weight: 600;
}
.cp-btn.primary:hover:not(:disabled) {
  opacity: 0.9;
}
.cp-btn :deep(svg) {
  font-size: 14px;
}

.cp-signin {
  display: flex;
  align-items: center;
  gap: 8px;
  border: none;
  background: transparent;
  color: var(--p-text-color);
  cursor: pointer;
  text-align: left;
  padding: 6px 4px;
  font-size: 13px;
}
.cp-signin:hover {
  text-decoration: underline;
}
</style>
