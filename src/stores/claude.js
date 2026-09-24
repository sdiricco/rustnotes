// Stato della CLI di Claude Code (claude.rs) condiviso fra editor e
// Impostazioni, le richieste in streaming e il processo pre avviato. Lo
// stato non si legge all'avvio ma alla prima occasione utile (ensure),
// perche' costa due processi; una volta letto resta finche' qualcuno non
// chiede refresh.
import { defineStore } from 'pinia'
import { api } from '../utils/api'
import { useSettingsStore } from './settings'

export const useClaudeStore = defineStore('claude', {
  state: () => ({
    status: null, // { found, path, version, loggedIn } | null = mai letto
    checking: false,
    // requestId -> { onDelta, onEnd }: un solo listener globale per evento
    // Tauri, smistato qui per richiesta.
    handlers: {},
    listening: false
  }),

  getters: {
    found: (s) => Boolean(s.status?.found),
    ready: (s) => Boolean(s.status?.found && s.status?.loggedIn)
  },

  actions: {
    async refresh() {
      if (this.checking) return this.status
      this.checking = true
      try {
        this.status = await api.claudeStatus()
      } catch {
        // fuori da Tauri (test, anteprima): come "non trovata"
        this.status = { found: false, loggedIn: false }
      } finally {
        this.checking = false
      }
      this.prewarm()
      return this.status
    },

    ensure() {
      if (!this.status && !this.checking) this.refresh()
    },

    login() {
      return api.claudeLogin()
    },

    // Tiene pronto un processo della CLI per la prossima richiesta: solo se
    // c'e' tutto (installata, loggata, funzione accesa). Fire-and-forget.
    prewarm() {
      const settings = useSettingsStore()
      if (!this.ready || !settings.claudeEnabled) return
      api.claudePrewarm(settings.claudeModel).catch(() => {})
    },

    listen() {
      if (this.listening) return
      this.listening = true
      api.onClaudeDelta(({ requestId, text }) => this.handlers[requestId]?.onDelta?.(text))
      api.onClaudeEnd(({ requestId }) => this.handlers[requestId]?.onEnd?.())
    },

    // Manda istruzione + testo col modello scelto; onDelta riceve i
    // frammenti, onEnd scatta a testo completo. Ritorna { text, costUsd,
    // durationMs } o rigetta con { code, message }. Annullabile con
    // cancel(requestId). Alla fine riavvia il processo pre avviato.
    run(requestId, instruction, text, { onDelta, onEnd } = {}) {
      this.listen()
      this.handlers[requestId] = { onDelta, onEnd }
      const model = useSettingsStore().claudeModel
      return api.claudeStream(requestId, instruction, text, model).finally(() => {
        delete this.handlers[requestId]
        this.prewarm()
      })
    },

    cancel(requestId) {
      delete this.handlers[requestId]
      return api.claudeCancel(requestId).catch(() => {})
    }
  }
})
