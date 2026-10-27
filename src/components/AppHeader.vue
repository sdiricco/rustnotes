<template>
  <!-- Barra in cima alla colonna di destra (non a tutta larghezza: cartelle e
       lista arrivano fino in cima, vedi App.vue). Con titleBarStyle Overlay +
       hiddenTitle la barra del titolo nativa non esiste, quindi questa e' una
       delle superfici con cui si sposta la finestra: data-tauri-drag-region.
       -webkit-app-region non funziona in WKWebView, e' una feature del
       Chromium modificato di Electron. -->
  <header class="app-header" data-tauri-drag-region="deep">
    <div class="header-left" :class="{ 'clears-traffic-lights': !browseInLayout }">
      <button
        class="icon-btn toggle-btn"
        :class="{ active: sidebarVisible }"
        :title="sidebarVisible ? t('header.hideFolders') : t('header.showFolders')"
        @click="emit('toggle-sidebar')"
      >
        <Icon icon="lucide:panel-left" />
      </button>

      <!-- Breadcrumb: cartella corrente > nota aperta. drag-region="false"
           perche' la cartella e' cliccabile e un click accanto al testo non
           deve trascinare la finestra. -->
      <!-- Breadcrumb PASSIVO: mostra dove ci si trova, non e' un comando.
           La cartella si scegle dal pannello laterale (vista cartelle) e la
           nota dalla sua lista: avere anche qui due menu che facevano le
           stesse cose era una seconda strada da mantenere. -->
      <nav class="crumbs" :aria-label="t('header.breadcrumbLabel')">
        <span class="crumb crumb-folder">
          <span class="crumb-label">{{ store.currentViewName }}</span>
        </span>
        <template v-if="store.selectedNote">
          <Icon icon="lucide:chevron-right" class="crumb-sep" />
          <span class="crumb crumb-note" :title="noteTitle" data-tauri-drag-region="false">
            <!-- Input minimale: eredita il font del breadcrumb, niente bordo
                 ne' sfondo, si vede solo il cursore. -->
            <input
              v-if="editingTitle"
              ref="titleInput"
              v-model="titleDraft"
              class="title-input"
              data-testid="header-title-input"
              spellcheck="false"
              @click.stop
              @keydown.enter.prevent="commitTitle"
              @keydown.esc.prevent="cancelTitle"
              @blur="commitTitle"
            />
            <button
              v-else
              class="title-label"
              type="button"
              data-testid="header-title"
              @click.stop="startTitleEdit"
            >
              {{ noteTitle }}
            </button>
            <button
              v-if="!editingTitle"
              class="title-edit"
              type="button"
              :title="t('header.editNoteTitle')"
              :aria-label="t('header.editNoteTitle')"
              @click.stop="startTitleEdit"
            >
              <Icon icon="lucide:pencil" />
            </button>
          </span>
        </template>
      </nav>
    </div>

    <div class="header-note-actions" data-tauri-drag-region="false">
      <slot name="note-actions" />
    </div>

    <div class="header-settings" data-tauri-drag-region="false">
      <button class="icon-btn" :title="t('header.settings')" @click="ui.openSettings()">
        <Icon icon="lucide:settings" />
      </button>
    </div>
  </header>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { useI18n } from 'vue-i18n'
import { useNotesStore } from '../stores/notes'
import { useUiStore } from '../stores/ui'

defineProps({
  sidebarVisible: { type: Boolean, default: true },
  // Cartelle e lista sono nel flusso a sinistra? In quel caso i semafori
  // della finestra cadono su di loro e l'header non deve scavalcarli.
  browseInLayout: { type: Boolean, default: false }
})
const emit = defineEmits(['toggle-sidebar'])

const store = useNotesStore()
const ui = useUiStore()
const { t } = useI18n()

const noteTitle = computed(() => store.selectedNote?.title?.trim() || t('common.untitledNote'))
const editingTitle = ref(false)
const titleDraft = ref('')
const titleInput = ref(null)

function startTitleEdit() {
  if (!store.selectedNote) return
  titleDraft.value = store.selectedNote.title || ''
  editingTitle.value = true
  nextTick(() => titleInput.value?.focus())
}

function commitTitle() {
  if (!editingTitle.value || !store.selectedNote) return
  store.updateNote(store.selectedNote.id, { title: titleDraft.value.trim() })
  editingTitle.value = false
}

function cancelTitle() {
  editingTitle.value = false
}

watch(
  () => store.selectedNote?.id,
  () => cancelTitle()
)
</script>

<style scoped>
.app-header {
  min-width: 0;
  flex-shrink: 0;
  height: var(--titlebar-h, 38px); /* = barra del titolo nativa, vedi titlebar.rs */
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 12px;
  background: var(--sidebar-bg);
  border-bottom: 1px solid var(--p-content-border-color);
}

/* Fine dei semafori + 6 di margine - 12 di padding dell'header: geometria
   AppKit misurata a runtime (vedi titlebar.rs e App.vue). Serve solo quando
   l'header e' al bordo sinistro della finestra: con cartelle e lista nel
   flusso i semafori cadono su quelle (vedi .browse-drag in App.vue). */
.header-left.clears-traffic-lights {
  padding-left: calc(var(--traffic-end, 66px) - 6px);
}

/* min-width: 0 permette al titolo della nota di troncarsi invece di
   allargare la sezione. */
.header-left {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Gruppo azioni e impostazioni in fondo a destra. */
.header-note-actions,
.header-settings {
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

/* Stacca il tasto dal bordo (o dai semafori, quando l'header e' a
   sinistra). */
.toggle-btn {
  margin-left: 6px;
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
  flex-shrink: 0;
}
/* .active: il tasto delle cartelle non cambia glifo, lo stato lo comunica lo
   sfondo. */
.icon-btn:hover,
.icon-btn.active {
  background: var(--sidebar-hover-bg);
  color: var(--p-text-color);
}

/* position: relative e' l'ancora del pannello delle note. */
.crumbs {
  position: relative;
  display: flex;
  align-items: center;
  gap: 3px;
  min-width: 0;
}

.crumb {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  min-width: 0;
}

/* Il breadcrumb e' passivo: nessuno stile da bottone (hover, cursore,
   sfondo, bordo arrotondato). Erano avanzi di quando i due segmenti erano
   cliccabili e aprivano dei menu. */
.crumb-folder {
  flex-shrink: 0;
  color: var(--p-text-color);
  font-weight: 600;
}
.crumb-folder :deep(svg) {
  font-size: 14px;
  color: var(--icon-color);
  flex-shrink: 0;
}
.crumb-label {
  white-space: nowrap;
}

.crumb-sep {
  flex-shrink: 0;
  font-size: 13px;
  color: var(--p-text-muted-color);
  opacity: 0.7;
}

/* La nota e' l'ultimo segmento e l'unico che si tronca, essendo l'unico di
   lunghezza imprevedibile. */
.crumb-note {
  flex: 1;
  min-width: 0;
  color: var(--p-text-muted-color);
  white-space: nowrap;
}

/* Il titolo occupa solo lo spazio del testo (tronca se serve), cosi' la
   matita resta accanto al nome invece che in fondo alla barra. */
.title-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  border: 0;
  padding: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: text;
}

.title-edit {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  border: 0;
  border-radius: 4px;
  padding: 2px;
  background: transparent;
  color: var(--p-text-muted-color);
  opacity: 0.55;
  cursor: pointer;
}
.title-edit:hover {
  opacity: 1;
  color: var(--p-text-color);
}
.title-edit :deep(svg) {
  font-size: 11px;
}

.title-input {
  flex: 1;
  min-width: 0;
  border: 0;
  padding: 0;
  margin: 0;
  background: transparent;
  color: var(--p-text-color);
  font: inherit;
  outline: none;
  caret-color: var(--p-primary-color);
}
</style>
