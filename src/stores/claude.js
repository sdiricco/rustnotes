// Stato della CLI di Claude Code (claude.rs) condiviso fra editor e
// Impostazioni, e le richieste in streaming. Lo stato non si legge
// all'avvio ma alla prima occasione utile (ensure), perche' costa due
// processi; una volta letto resta finche' qualcuno non chiede refresh.
import { defineStore } from 'pinia'
import { api } from '../utils/api'

export const useClaudeStore = defineStore('claude', {
  state: () => ({
    status: null, // { found, path, version, loggedIn } | null = mai letto
    checking: false,
    // requestId -> callback(delta): un solo listener globale sull'evento
    // Tauri, smistato qui per richiesta.
    deltaHandlers: {},
    offDelta: null
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
      return this.status
    },

    ensure() {
      if (!this.status && !this.checking) this.refresh()
    },

    login() {
      return api.claudeLogin()
    },

    // Manda istruzione + testo; onDelta riceve i frammenti man mano. Ritorna
    // { text, costUsd, durationMs } o rigetta con { code, message }.
    // Il chiamante puo' annullare con cancel(requestId).
    run(requestId, instruction, text, onDelta) {
      if (!this.offDelta) {
        this.offDelta = api.onClaudeDelta(({ requestId: id, text: delta }) => {
          this.deltaHandlers[id]?.(delta)
        })
      }
      this.deltaHandlers[requestId] = onDelta
      return api.claudeStream(requestId, instruction, text).finally(() => {
        delete this.deltaHandlers[requestId]
      })
    },

    cancel(requestId) {
      delete this.deltaHandlers[requestId]
      return api.claudeCancel(requestId).catch(() => {})
    }
  }
})
