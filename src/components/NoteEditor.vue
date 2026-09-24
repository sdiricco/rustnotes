<template>
  <section class="note-editor">
    <div v-if="!store.selectedNote" class="empty-state">
      <Icon icon="lucide:notebook-pen" />
      <p>{{ t('editor.emptyState') }}</p>
    </div>

    <template v-else>
      <div class="editor-header">
        <!-- Toolbar di formattazione di Quill: montata qui (contenitore esterno,
             vedi toolbar-container su QuillEditor) per stare sopra ai pulsanti
             azione invece che nella posizione di default. -->
        <div ref="quillToolbarEl" class="floating-toolbar"></div>

        <!-- Cerca, preferiti e cestino sempre visibili; le azioni poco usate
             stanno nel menu "⋮". Non c'e' piu' una soglia che li faccia
             migrare nel menu: stando nell'header principale, che tronca il
             breadcrumb per far posto, lo spazio non gli manca mai. -->
        <!-- Teleportate nell'header principale (#header-note-actions in
             AppHeader): markup e logica restano qui — dialogo Markdown,
             riferimento all'editor per la ricerca nella nota, ortografia — e
             cambia solo dove finiscono nel DOM.
             `defer` e' indispensabile: il bersaglio e' reso nello stesso
             albero, e senza di esso Teleport lo cerca prima che esista,
             fallendo con "emitsOptions null" e impedendo il montaggio di
             QuillEditor (toolbar vuota). Disponibile da Vue 3.5. -->
        <Teleport defer to="#header-note-actions">
        <div class="action-card">
            <!-- Azioni Claude (claudeActions.js): il pulsante c'e' solo se la
                 CLI di Claude Code e' installata e l'utente non l'ha nascosta
                 in Impostazioni. Il menu dice su cosa agisce (selezione o
                 nota) e, se manca l'accesso, rimanda a Impostazioni. -->
            <button class="icon-btn" :title="t('editor.findInNote', { shortcut: shortcut('mod+F') })" @click="quillEditorRef?.toggleFindBar()">
              <Icon icon="lucide:search" />
            </button>
            <button
              class="icon-btn"
              :title="store.selectedNote.pinned ? t('editor.removeFromFavorites') : t('editor.addToFavorites')"
              @click="store.togglePin(store.selectedNote.id)"
            >
              <Icon icon="lucide:star" :class="{ filled: store.selectedNote.pinned }" />
            </button>
            <button
              v-if="!store.selectedNote.trashed"
              class="icon-btn"
              :title="t('editor.moveToTrash')"
              @click="moveToTrash"
            >
              <Icon icon="lucide:trash-2" />
            </button>
            <button v-else class="icon-btn" :title="t('editor.restore')" @click="store.restoreNote(store.selectedNote.id)">
              <Icon icon="lucide:rotate-ccw" />
            </button>

          <div ref="actionOverflowEl" class="action-overflow">
            <button class="icon-btn" :title="t('editor.moreActions')" @click="actionMenuOpen = !actionMenuOpen">
              <Icon icon="lucide:ellipsis" />
            </button>
            <div v-if="actionMenuOpen" class="action-overflow-menu">
              <button @click="importNote(); actionMenuOpen = false">
                <Icon icon="lucide:upload" />
                <span>{{ t('editor.importMarkdown') }}</span>
              </button>
              <button @click="openMarkdownPreview(); actionMenuOpen = false">
                <Icon icon="lucide:file-code" />
                <span>{{ t('editor.markdownMenu') }}</span>
              </button>
              <button @click="settings.toggleSpellcheck()">
                <Icon icon="lucide:spell-check" />
                <span>{{ settings.spellcheck ? t('editor.spellcheckOn') : t('editor.spellcheckOff') }}</span>
              </button>
              <button @click="api.revealDataFile(); actionMenuOpen = false">
                <Icon icon="lucide:folder-open" />
                <span>{{ t('editor.revealInFinder', isMac ? 1 : 2) }}</span>
              </button>
            </div>
          </div>
        </div>
        </Teleport>
      </div>

      <QuillEditor
        ref="quillEditorRef"
        :key="`${store.selectedNote.id}-${reloadCounter}`"
        :note-id="store.selectedNote.id"
        :content="store.selectedNote.content"
        :toolbar-container="quillToolbarEl"
        class="editor-body"
        @change="onContentChange"
        @claude="toggleAssistant"
        @selection="onEditorSelection"
      />

      <!-- Assistente Claude: pulsante fisso in basso a destra, come un widget
           di assistenza; il pannello si apre sopra di lui (ClaudeAssistant).
           C'e' solo se la CLI di Claude Code e' installata e la funzione e'
           accesa in Impostazioni. -->
      <button
        v-if="claudeVisible"
        class="claude-fab"
        :class="{ open: Boolean(assistant) }"
        :title="`${t('editor.claude.menu')} (${shortcut('mod+J')})`"
        @click="toggleAssistant"
      >
        <Icon :icon="assistant ? 'lucide:x' : 'lucide:sparkles'" />
      </button>

      <ClaudeAssistant
        :open="Boolean(assistant)"
        :on-selection="Boolean(assistant?.range)"
        :ready="claude.ready"
        :run="claudeRun"
        @action="(a) => startClaude(buildInstruction(a, assistant), { action: a, label: t(`editor.claude.actions.${a.id}`) })"
        @ask="(q) => startClaude(buildFree(q, assistant), { action: null, label: q })"
        @refine="refineClaude"
        @retry="retryClaude"
        @replace="applyClaude('replace')"
        @insert="applyClaude('insert')"
        @copy="copyClaude"
        @close="closeAssistant"
        @settings="ui.openSettings('claude'); closeAssistant()"
      />

      <Dialog
        v-model:visible="markdownPreviewOpen"
        modal
        :header="t('editor.markdownDialogTitle')"
        :style="{ width: '38rem' }"
        :draggable="false"
        dismissable-mask
      >
        <pre class="markdown-preview">{{ markdownPreviewText }}</pre>
        <template #footer>
          <button class="md-action-btn" @click="copyNote">
            <Icon icon="lucide:copy" />
            <span>{{ t('editor.copy') }}</span>
          </button>
          <button class="md-action-btn primary" @click="exportNote">
            <Icon icon="lucide:download" />
            <span>{{ t('editor.download') }}</span>
          </button>
        </template>
      </Dialog>
    </template>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Dialog from 'primevue/dialog'
import { useToast } from 'primevue/usetoast'
import { Icon } from '@iconify/vue'
import { useNotesStore } from '../stores/notes'
import { useSettingsStore } from '../stores/settings'
import { useUiStore } from '../stores/ui'
import { useClaudeStore } from '../stores/claude'
import QuillEditor from './QuillEditor.vue'
import ClaudeAssistant from './ClaudeAssistant.vue'
import { htmlToMarkdown, markdownToHtml } from '../utils/markdown'
import { api } from '../utils/api'
import { isMac, shortcut } from '../utils/shortcuts'
import { buildInstruction, buildFree, buildFollowUp, stripOuterFence } from '../utils/claudeActions'

const store = useNotesStore()
const settings = useSettingsStore()
const ui = useUiStore()
const claude = useClaudeStore()
const toast = useToast()
const { t } = useI18n()

const quillToolbarEl = ref(null)
const quillEditorRef = ref(null)
// L'import sostituisce il contenuto della nota già aperta: QuillEditor lo ricarica
// solo quando cambia il suo :key (osserva solo noteId, non il content prop), quindi
// serve forzare un remount incrementando questo contatore.
const reloadCounter = ref(0)

const markdownPreviewOpen = ref(false)
const markdownPreviewText = ref('')

// Menu overflow "⋮" delle azioni meno usate (importa, markdown, ortografia,
// Finder): chiuso automaticamente al click fuori, stesso pattern del menu
// contestuale tabella in QuillEditor.vue.
const actionMenuOpen = ref(false)
const actionOverflowEl = ref(null)

// Etichette del picker "lista" della toolbar Quill: sono `content` CSS
// (::before, vedi <style>), quindi passano da v-bind() come stringhe CSS già
// tra virgolette (JSON.stringify), e si aggiornano al cambio lingua.
const listPickerCss = computed(() => {
  const q = (key) => JSON.stringify(t(`editor.listPicker.${key}`))
  return {
    list: q('list'),
    ordered: q('ordered'),
    bullet: q('bullet'),
    checklist: q('checklist'),
    listItem: JSON.stringify(`– ${t('editor.listPicker.list')}`),
    orderedItem: JSON.stringify(`1. ${t('editor.listPicker.ordered')}`),
    bulletItem: JSON.stringify(`• ${t('editor.listPicker.bullet')}`),
    checklistItem: JSON.stringify(`☑ ${t('editor.listPicker.checklist')}`)
  }
})

function onGlobalMousedown(event) {
  if (actionMenuOpen.value && actionOverflowEl.value && !actionOverflowEl.value.contains(event.target)) {
    actionMenuOpen.value = false
  }
}

// ---------------------------------------------------------------------------
// Claude. All'apertura del popup (pulsante o ⌘J) si fissa il testo di
// partenza: la selezione, o tutta la nota se non c'e'. Viaggia come Markdown
// (una selezione dentro una sola riga come testo piano). Ogni richiesta
// (azione rapida, istruzione libera, seguito) arriva in streaming nel popup e
// si applica solo su richiesta, tramite gli helper esposti da QuillEditor.
// ---------------------------------------------------------------------------
// Pannello aperto: { range, inline, source }. null = chiuso. Finche' non
// c'e' una richiesta, lo scope segue la selezione dal vivo (onEditorSelection);
// alla prima richiesta si congela.
const assistant = ref(null)
// Richiesta corrente o ultima proposta: { id, action, label, instruction,
// original, text, streaming, reply, error }. null = nessuna ancora.
const claudeRun = ref(null)

const claudeVisible = computed(() => settings.claudeEnabled && claude.found)

onMounted(() => {
  if (settings.claudeEnabled) claude.ensure()
})

// Cambio nota: il pannello si riferiva a un'altra nota.
watch(() => store.selectedNote?.id, () => closeAssistant())

// Testo di partenza per `range` (null = tutta la nota): { range, inline, source }.
function claudeScope(range) {
  const editor = quillEditorRef.value
  const inline = Boolean(range) && !editor.getPlainText(range).includes('\n')
  const source = range
    ? inline
      ? editor.getPlainText(range)
      : editor.getMarkdown(range)
    : htmlToMarkdown(store.selectedNote.content)
  return { range, inline, source }
}

function openAssistant() {
  const editor = quillEditorRef.value
  if (!editor || !claudeVisible.value) return
  const scope = claudeScope(editor.getRange())
  claudeRun.value = null
  editor.markRange(scope.range)
  assistant.value = scope
}

function toggleAssistant() {
  if (assistant.value) closeAssistant()
  else openAssistant()
}

function onEditorSelection(range) {
  if (!assistant.value || claudeRun.value) return
  const scope = claudeScope(range)
  quillEditorRef.value?.markRange(scope.range)
  assistant.value = scope
}

function closeAssistant() {
  if (!assistant.value) return
  const run = claudeRun.value
  if (run?.streaming) claude.cancel(run.id)
  claudeRun.value = null
  quillEditorRef.value?.unmarkRange()
  assistant.value = null
}

const CLAUDE_ERRORS = {
  'not-found': 'settings.claude.errNotFound',
  'not-logged-in': 'settings.claude.errNotLoggedIn',
  timeout: 'settings.claude.errTimeout'
}

// Una richiesta: `instruction` e' gia' completa (buildInstruction /
// buildFree / buildFollowUp), il testo e' sempre la partenza fissata
// all'apertura. Una nuova richiesta scarta la proposta precedente.
async function startClaude(instruction, { action, label }) {
  const ctx = assistant.value
  if (!ctx) return
  if (!ctx.source.trim()) {
    toast.add({ severity: 'warn', summary: t('editor.claude.emptyNote'), life: 2500 })
    return
  }
  if (claudeRun.value?.streaming) claude.cancel(claudeRun.value.id)
  // reactive() e non oggetto piano: lo si muta da qui e il popup deve
  // vederlo (un oggetto piano dentro la ref sarebbe un proxy diverso).
  const run = reactive({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    action,
    label,
    instruction,
    original: ctx.source,
    text: '',
    streaming: true,
    reply: null,
    error: ''
  })
  claudeRun.value = run
  try {
    const reply = await claude.run(run.id, instruction, ctx.source, {
      onDelta: (delta) => {
        if (claudeRun.value === run) run.text += delta
      },
      // Testo completo: i pulsanti si abilitano subito, il riepilogo
      // (durata, costo) arriva circa un secondo dopo.
      onEnd: () => {
        if (claudeRun.value === run) {
          run.text = stripOuterFence(run.text)
          run.streaming = false
        }
      }
    })
    if (claudeRun.value !== run) return
    run.text = stripOuterFence(reply.text)
    run.reply = reply
  } catch (err) {
    if (claudeRun.value !== run || err?.code === 'cancelled') return
    run.error = `${t(CLAUDE_ERRORS[err?.code] || 'settings.claude.errFailed')}${err?.message ? ` — ${err.message}` : ''}`
    if (err?.code === 'not-found' || err?.code === 'not-logged-in') claude.refresh()
  } finally {
    run.streaming = false
  }
}

function refineClaude(refinement) {
  const prev = claudeRun.value
  if (!prev?.text || !assistant.value) return
  startClaude(buildFollowUp(refinement, prev.text, assistant.value), { action: prev.action, label: refinement })
}

function retryClaude() {
  const prev = claudeRun.value
  if (!prev) return
  startClaude(prev.instruction, { action: prev.action, label: prev.label })
}

function applyClaude(mode) {
  const run = claudeRun.value
  const editor = quillEditorRef.value
  const ctx = assistant.value
  if (!run || !editor || !ctx || run.streaming || !run.text) return
  // Testo piano solo se la partenza era una riga e la risposta pure:
  // un riassunto a punti di una frase resta Markdown e va a capo.
  const plain = ctx.inline && !run.text.includes('\n')
  const content = plain ? { text: run.text } : { markdown: run.text }
  editor.unmarkRange()
  if (mode === 'replace') editor.replaceRange(ctx.range, content)
  else editor.insertAfter(ctx.range, content)
  claudeRun.value = null
  assistant.value = null
  toast.add({ severity: 'success', summary: t('editor.claude.applied'), life: 1800 })
}

async function copyClaude() {
  if (!claudeRun.value?.text) return
  await navigator.clipboard.writeText(claudeRun.value.text)
  toast.add({ severity: 'success', summary: t('editor.claude.copiedToast'), life: 1800 })
}

// Il trascinamento della finestra ora e' tutto nell'header globale
// (AppHeader): qui restano solo i listener locali.
let offFindInNote = null

onMounted(() => {
  window.addEventListener('mousedown', onGlobalMousedown)
  offFindInNote = api.onMenu('menu:find-in-note', () => quillEditorRef.value?.toggleFindBar())
})

onBeforeUnmount(() => {
  window.removeEventListener('mousedown', onGlobalMousedown)
  offFindInNote?.()
})

function openMarkdownPreview() {
  markdownPreviewText.value = htmlToMarkdown(store.selectedNote.content)
  markdownPreviewOpen.value = true
}

// Nessuna conferma: la nota va nel cestino, da cui si ripristina. Il menu
// della card faceva gia' cosi', quindi lo stesso comando aveva due
// comportamenti diversi a seconda di dove lo si dava.
function moveToTrash() {
  store.trashNote(store.selectedNote.id)
}

function onContentChange(html) {
  store.updateNote(store.selectedNote.id, { content: html })
}

function suggestedFileName() {
  const title = store.selectedNote.title?.trim()
  return title ? title.replace(/[\\/:*?"<>|]+/g, '-').slice(0, 80) : t('editor.exportFileName')
}

async function exportNote() {
  const markdown = htmlToMarkdown(store.selectedNote.content)
  const result = await api.exportMarkdown(markdown, suggestedFileName())
  if (result) toast.add({ severity: 'success', summary: t('editor.toast.exported'), life: 1800 })
}

async function importNote() {
  const result = await api.importMarkdown()
  if (!result) return
  store.updateNote(store.selectedNote.id, { content: markdownToHtml(result.markdown) })
  reloadCounter.value++
  toast.add({ severity: 'success', summary: t('editor.toast.imported'), life: 1800 })
}

async function copyNote() {
  await navigator.clipboard.writeText(htmlToMarkdown(store.selectedNote.content))
  toast.add({ severity: 'success', summary: t('editor.toast.copied'), life: 1800 })
}
</script>

<style scoped>
.note-editor {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--editor-bg);
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--p-text-muted-color);
  gap: 8px;
}
.empty-state :deep(svg) {
  font-size: 30px;
}

/* Barra unica a tutta larghezza (non più due pillole separate): la toolbar
   di formattazione (uso frequente) sta a sinistra, le azioni sulla nota (uso
   saltuario) a destra, con un bordo inferiore che separa dal contenuto,
   come una vera toolbar d'app invece di due card fluttuanti. Ogni gruppo
   nasconde i controlli meno usati in un proprio menu overflow (vedi
   .toolbar-overflow-panel e .action-overflow-menu) invece di andare a capo,
   così l'altezza dell'header resta costante a qualunque larghezza. */
.editor-header {
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  /* Centrata: da quando le azioni sono teleportate nell'header principale,
     qui resta solo la toolbar, e allinearla a sinistra la lasciava
     squilibrata. */
  justify-content: center;
  align-items: center;
  gap: 6px;
  padding: 12px 16px;
  /* Sfondo pieno, uguale a quello dell'editor: l'header e' position: sticky,
     quindi con background trasparente il testo che scorre gli passava dietro
     e si sovrapponeva alla toolbar. */
  background: var(--editor-bg);
}

.action-card {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.action-overflow {
  position: relative;
  display: flex;
}

.action-overflow-menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 20;
  min-width: 210px;
  background: var(--editor-toolbar-bg);
  border: 1px solid var(--p-content-border-color);
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  padding: 4px;
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.action-overflow-menu button {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  border: none;
  background: transparent;
  color: var(--p-text-color);
  cursor: pointer;
  font-size: 13px;
  padding: 7px 10px;
  border-radius: 6px;
  text-align: left;
  outline: none;
}
.action-overflow-menu button:hover {
  background: var(--sidebar-hover-bg);
}
.action-overflow-menu :deep(svg) {
  font-size: 15px;
  color: var(--icon-color);
  flex-shrink: 0;
}

.note-editor {
  position: relative;
}
.claude-fab {
  position: absolute;
  right: 20px;
  bottom: 20px;
  z-index: 5;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: none;
  background: #7c5cff;
  color: #fff;
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 6px 18px rgba(124, 92, 255, 0.35);
  transition: transform 0.15s ease, background 0.15s ease;
}
.claude-fab:hover {
  transform: scale(1.06);
}
.claude-fab.open {
  background: var(--p-text-color);
  color: var(--editor-bg);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.25);
}
.icon-btn.active {
  background: var(--sidebar-hover-bg);
}
.icon-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.icon-btn {
  border: none;
  background: transparent;
  color: var(--icon-color);
  cursor: pointer;
  padding: 5px;
  border-radius: 6px;
  font-size: 15px;
  display: flex;
  align-items: center;
  outline: none;
}
.icon-btn:hover {
  background: var(--sidebar-hover-bg);
  color: var(--p-text-color);
}
.icon-btn.on {
  background: var(--selection-bg);
  color: var(--p-text-color);
}
/* lucide:star ha fill="none" sul <path> stesso (non sull'<svg> genitore):
   l'eredità CSS non può vincere sopra un attributo diretto del figlio,
   quindi va sovrascritto puntando esplicitamente il path. */
.icon-btn :deep(svg.filled) {
  color: var(--p-text-color);
}
.icon-btn :deep(svg.filled path) {
  fill: var(--p-text-color);
}

.editor-body {
  flex: 1;
  min-height: 0;
}

.markdown-preview {
  max-height: 60vh;
  overflow: auto;
  margin: 0;
  padding: 12px 14px;
  background: var(--search-bg);
  border: 1px solid var(--p-content-border-color);
  border-radius: 8px;
  font-family: 'SF Mono', ui-monospace, Menlo, Monaco, monospace;
  font-size: 12.5px;
  line-height: 1.6;
  color: var(--p-text-color);
  white-space: pre-wrap;
  word-break: break-word;
}

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
.md-action-btn:hover {
  background: var(--sidebar-hover-bg);
}
.md-action-btn.primary {
  background: var(--p-text-color);
  color: var(--editor-bg);
  border-color: transparent;
  font-weight: 600;
}
.md-action-btn.primary:hover {
  opacity: 0.9;
}
.md-action-btn :deep(svg) {
  font-size: 14px;
}

/* ---- Toolbar di formattazione e azioni sulla nota: due gruppi allo stesso
   livello della barra unica (niente più sfondo/bordo/ombra propri, li eredita
   dalla barra), larghi solo quanto il loro contenuto e allineati agli estremi
   dell'header. Il contenuto della toolbar (bottoni/select) è iniettato da
   Quill in modo imperativo: serve :deep() perché non fa parte del template
   compilato di questo componente. ---- */
/* Solo la pillola delle azioni non si restringe: deve restare integra. La
   toolbar invece cede spazio e scorre al suo interno (vedi sotto) — con
   flex-shrink: 0 anche su di lei non si restringeva mai, quindi eccedeva
   dalla riga e lo scroll non entrava in funzione. */
.action-card {
  width: fit-content;
  max-width: 100%;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
}

.floating-toolbar {
  /* flex: 0 1 auto e non 1 1 0: la base e' il contenuto, cosi' la barra sta
     al centro dell'header (justify-content: center) invece di occupare tutta
     la riga. Continua a restringersi e a scorrere quando non ci sta.
     Non si centra il contenuto DENTRO la barra: in un contenitore che scorre
     i figli centrati possono risultare irraggiungibili all'inizio, quindi il
     centraggio sta sull'header e dentro il contenuto resta allineato.
     min-width: 0 e' indispensabile: senza, il minimo automatico del flex item
     resta la larghezza del contenuto e l'elemento non si restringe. */
  flex: 0 1 auto;
  min-width: 0;
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
}

/* Quill aggiunge le classi ql-toolbar/ql-snow al contenitore esterno passato
   come modules.toolbar.container: quill.snow.css le usa per un bordo/padding
   di default (border 1px + padding 8px) più specifico del nostro selettore a
   singola classe, che quindi va forzato per non far ricomparire quel box. */
.floating-toolbar {
  border: none !important;
  padding: 0 !important;
  background: transparent !important;
  /* Barra piatta con tutti i controlli: a larghezza insufficiente scorre in
     orizzontale invece di eccedere dalla riga. overflow-y: hidden esplicito
     perche' per la spec CSS un asse "visible" accanto a uno che non lo e'
     diventa "auto" — dichiararlo evita una barra verticale spuria su un
     elemento alto 25px.
     Conseguenza: tutto cio' che si apre sotto un controllo verrebbe
     ritagliato. Per questo il tooltip e' un elemento teleportato in
     position:fixed e le opzioni del picker dei titoli vengono riposizionate
     in fixed al click (vedi QuillEditor); il picker colore era gia'
     teleportato. */
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
  min-width: 0;
}
/* Barra di scorrimento nascosta: su 25px di altezza occuperebbe piu' spazio
   del contenuto. Si scorre con trackpad/rotella. */
.floating-toolbar::-webkit-scrollbar {
  display: none;
}


.floating-toolbar :deep(.ql-formats) {
  display: inline-flex;
  align-items: center;
  gap: 1px;
  margin-right: 4px;
  padding-right: 4px;
  border-right: 1px solid var(--p-content-border-color);
}
.floating-toolbar :deep(.ql-formats:last-child) {
  border-right: none;
  margin-right: 0;
  padding-right: 0;
}

.floating-toolbar :deep(button) {
  width: 25px;
  height: 25px;
  border-radius: 5px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px;
  border: none;
  background: transparent;
  cursor: pointer;
  outline: none;
}
.floating-toolbar :deep(button:hover),
.floating-toolbar :deep(button.ql-active) {
  background: var(--selection-bg);
}

.floating-toolbar :deep(.ql-stroke) {
  stroke: var(--icon-color);
}
.floating-toolbar :deep(.ql-fill) {
  fill: var(--icon-color);
}
.floating-toolbar :deep(button:hover .ql-stroke),
.floating-toolbar :deep(button.ql-active .ql-stroke) {
  stroke: var(--p-text-color);
}
.floating-toolbar :deep(button:hover .ql-fill),
.floating-toolbar :deep(button.ql-active .ql-fill) {
  fill: var(--p-text-color);
}

.floating-toolbar :deep(.ql-picker) {
  color: var(--icon-color);
  font-size: 11px;
  height: 25px;
}
.floating-toolbar :deep(.ql-picker-label) {
  border: none;
  border-radius: 5px;
  display: inline-flex;
  align-items: center;
  padding: 0 16px 0 6px;
}
.floating-toolbar :deep(.ql-picker-label:hover),
.floating-toolbar :deep(.ql-picker.ql-expanded .ql-picker-label) {
  background: var(--selection-bg);
  color: var(--p-text-color);
}

/* Etichetta del selettore di stile del blocco: mostra sempre lo stato
   attuale ("Normal" di default, "Heading 1/2/3" quando applicato), non un
   testo segnaposto fisso — si comporta come una vera select. È un chip con
   sfondo proprio, distinto dai bottoni di formattazione inline: è il primo
   controllo, quello che decide il "tipo" di paragrafo, non un toggle come
   bold/italic. Idem per il gruppo liste, che ora è un unico menu a discesa
   invece di tre bottoni separati. */
.floating-toolbar :deep(.ql-picker.ql-header) {
  width: auto;
  min-width: 92px;
}
.floating-toolbar :deep(.ql-picker.ql-header .ql-picker-label) {
  background: var(--search-bg);
}
.floating-toolbar :deep(.ql-picker.ql-header .ql-picker-label)::before,
.floating-toolbar :deep(.ql-picker.ql-header .ql-picker-item)::before {
  content: 'Normal';
}
.floating-toolbar :deep(.ql-picker.ql-header .ql-picker-label[data-value='1'])::before,
.floating-toolbar :deep(.ql-picker.ql-header .ql-picker-item[data-value='1'])::before {
  content: 'Heading 1';
}
.floating-toolbar :deep(.ql-picker.ql-header .ql-picker-label[data-value='2'])::before,
.floating-toolbar :deep(.ql-picker.ql-header .ql-picker-item[data-value='2'])::before {
  content: 'Heading 2';
}
.floating-toolbar :deep(.ql-picker.ql-header .ql-picker-label[data-value='3'])::before,
.floating-toolbar :deep(.ql-picker.ql-header .ql-picker-item[data-value='3'])::before {
  content: 'Heading 3';
}

.floating-toolbar :deep(.ql-picker.ql-list) {
  width: 78px;
}
.floating-toolbar :deep(.ql-picker.ql-list .ql-picker-label)::before {
  content: v-bind('listPickerCss.list');
}
.floating-toolbar :deep(.ql-picker.ql-list .ql-picker-label[data-value='ordered'])::before {
  content: v-bind('listPickerCss.ordered');
}
.floating-toolbar :deep(.ql-picker.ql-list .ql-picker-label[data-value='bullet'])::before {
  content: v-bind('listPickerCss.bullet');
}
.floating-toolbar :deep(.ql-picker.ql-list .ql-picker-label[data-value='unchecked'])::before {
  content: v-bind('listPickerCss.checklist');
}

/* Nelle voci del menu (aperto) un glifo davanti al testo aiuta a distinguere
   subito il tipo di lista, invece del solo nome. */
.floating-toolbar :deep(.ql-picker.ql-list .ql-picker-item)::before {
  content: v-bind('listPickerCss.listItem');
}
.floating-toolbar :deep(.ql-picker.ql-list .ql-picker-item[data-value='ordered'])::before {
  content: v-bind('listPickerCss.orderedItem');
}
.floating-toolbar :deep(.ql-picker.ql-list .ql-picker-item[data-value='bullet'])::before {
  content: v-bind('listPickerCss.bulletItem');
}
.floating-toolbar :deep(.ql-picker.ql-list .ql-picker-item[data-value='unchecked'])::before {
  content: v-bind('listPickerCss.checklistItem');
}

/* Color/background: la label mostra l'icona del pennarello, non un testo con
   freccia a discesa, quindi serve un padding ridotto e simmetrico: col padding
   pensato per gli altri select (8px/20px) l'icona SVG finiva senza spazio
   disponibile e collassava a larghezza 0. */
.floating-toolbar :deep(.ql-color-picker .ql-picker-label),
.floating-toolbar :deep(.ql-icon-picker .ql-picker-label) {
  padding: 2px 4px;
}
/* Colore testo ed evidenziazione sono due .ql-formats separati (ognuno il
   proprio dropdown), quindi la regola generica ".ql-formats { border-right
   ... }" disegna un divisorio anche fra loro due — visivamente sbagliato,
   sono la stessa "famiglia" di controllo. Tolto solo sul primo dei due. */
.floating-toolbar :deep(.color-dropdown) {
  border-right: none;
  margin-right: 0;
  padding-right: 0;
}

/* Rettangolo dietro la "A" dell'icona evidenziazione (vedi HIGHLIGHT_ICON):
   solo contorno finché nessun colore è applicato, pieno quando lo è —
   riempimento gestito inline da syncColorIndicators, non da qui. Il picker
   vero (Vue3ColorPicker) è un overlay Teleport, stile in QuillEditor.vue. */
.floating-toolbar :deep(.highlight-dropdown .color-indicator) {
  fill: none;
  stroke: var(--icon-color);
  stroke-width: 1.2px;
}

.floating-toolbar :deep(.ql-picker-label:hover .ql-stroke),
.floating-toolbar :deep(.ql-picker.ql-expanded .ql-picker-label .ql-stroke) {
  stroke: var(--p-text-color);
}
/* Quill dichiara `min-width: 100%` sulle opzioni del picker: era relativo al
   picker stesso, ma da quando le riposizioniamo in position:fixed (per non
   farle ritagliare dalla toolbar che scorre) quel 100% si risolve sul
   VIEWPORT, e il menu dei titoli occupava tutta la larghezza. Qui si
   dimensiona sul contenuto. */
.floating-toolbar :deep(.ql-picker.ql-expanded .ql-picker-options) {
  min-width: max-content !important;
  width: max-content;
}
.floating-toolbar :deep(.ql-picker-options) {
  background: var(--editor-bg);
  border: 1px solid var(--p-content-border-color) !important;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
  padding: 4px;
  margin-top: 4px;
}
.floating-toolbar :deep(.ql-picker-item) {
  border-radius: 5px;
  padding: 3px 10px;
  color: var(--p-text-color);
}
.floating-toolbar :deep(.ql-picker-item:hover) {
  background: var(--selection-bg);
  color: var(--p-text-color);
}
.floating-toolbar :deep(.ql-picker-item.ql-selected) {
  color: var(--p-text-color);
  font-weight: 600;
}

/* Quill Snow usa #06c hardcoded su stati attivi/espansi: forziamo il neutro */
.floating-toolbar :deep(button.ql-active),
.floating-toolbar :deep(.ql-picker-label.ql-active),
.floating-toolbar :deep(.ql-picker.ql-expanded .ql-picker-label),
.floating-toolbar :deep(.ql-picker-item.ql-selected),
.floating-toolbar :deep(.ql-picker-item:hover) {
  color: var(--p-text-color) !important;
}
.floating-toolbar :deep(button.ql-active .ql-stroke),
.floating-toolbar :deep(.ql-picker-label.ql-active .ql-stroke),
.floating-toolbar :deep(.ql-picker.ql-expanded .ql-picker-label .ql-stroke),
.floating-toolbar :deep(.ql-picker-item:hover .ql-stroke) {
  stroke: var(--p-text-color) !important;
}
.floating-toolbar :deep(button.ql-active .ql-fill) {
  fill: var(--p-text-color) !important;
}

/* Mini-menu della toolbar (overflow "⋯" e, in compatta, lo stile testo sotto
   "Aa"): il bottone toggle eredita già dimensioni/hover/colore icona dalla
   regola generica ".floating-toolbar :deep(button)" sopra, quindi qui serve
   solo il posizionamento del pannello a comparsa — condiviso da entrambi,
   distinti solo dalla classe più specifica dove serve. */
.floating-toolbar :deep(.toolbar-dropdown) {
  position: relative;
  display: inline-flex;
  align-items: center;
}
.floating-toolbar :deep(.toolbar-dropdown.is-open .toolbar-dropdown-toggle) {
  background: var(--selection-bg);
}
.floating-toolbar :deep(.toolbar-dropdown-panel) {
  display: none;
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 20;
  align-items: center;
  flex-wrap: nowrap;
  background: var(--editor-toolbar-bg);
  border: 1px solid var(--p-content-border-color);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
  padding: 3px 8px;
}
.floating-toolbar :deep(.toolbar-dropdown.is-open .toolbar-dropdown-panel) {
  display: flex;
}

/* "Aa" + le stesse doppie frecce dei picker (titolo, lista) qui accanto:
   comunica di essere un menu a comparsa, non un semplice bottone. La regola
   generica del bottone (25x25, quadrata) è troppo stretta per testo+freccia,
   va allargata come già si fa per il picker del titolo. */
.floating-toolbar :deep(.style-dropdown-toggle) {
  width: auto;
  gap: 3px;
  padding: 0 4px;
  font-size: 12px;
  font-weight: 700;
  font-style: italic;
  color: var(--icon-color);
}
/* Quill dà agli svg dentro un bottone "height:100%" (li scala all'altezza
   del bottone, 25px): fuori da un vero ".ql-picker" non c'è la regola che
   normalmente fissa la freccia a 18px, quindi qui la nostra usciva più
   grande delle due accanto. 18px, la stessa identica misura che Quill usa
   per le frecce degli altri due picker (".ql-snow .ql-picker svg { width:
   18px }"), non un valore scelto a occhio. */
.floating-toolbar :deep(.style-dropdown-toggle svg) {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}
.floating-toolbar :deep(.style-dropdown-toggle .ql-stroke) {
  stroke: var(--icon-color);
}
.floating-toolbar :deep(.style-dropdown.is-open .style-dropdown-toggle),
.floating-toolbar :deep(.style-dropdown-toggle:hover),
.floating-toolbar :deep(.style-dropdown-toggle.is-active) {
  color: var(--p-text-color);
}
.floating-toolbar :deep(.style-dropdown.is-open .style-dropdown-toggle .ql-stroke),
.floating-toolbar :deep(.style-dropdown-toggle:hover .ql-stroke),
.floating-toolbar :deep(.style-dropdown-toggle.is-active .ql-stroke) {
  stroke: var(--p-text-color);
}
/* Raggruppando i 5 stili sotto "Aa" si perde il segnale immediato che quill
   dà di suo ai bottoni ql-* (classe ql-active quando il formato è applicato
   alla selezione): senza, chiudendo il pannello non c'è più modo di vedere a
   colpo d'occhio se il cursore è per esempio dentro del testo in grassetto.
   is-active viene sincronizzata a mano (vedi syncStyleToggleActive in
   QuillEditor.vue) perché quill gestisce ql-active solo sui bottoni con una
   classe ql-*, non sul nostro toggle custom. */
.floating-toolbar :deep(.style-dropdown-toggle.is-active) {
  background: var(--selection-bg);
}
</style>
