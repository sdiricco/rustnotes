import { defineStore } from 'pinia'
import { check } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'
import { api } from '../utils/api'

// Aggiornamento in-app tramite tauri-plugin-updater: `check()` legge il
// `latest.json` firmato pubblicato con la release, `downloadAndInstall()`
// scarica il pacchetto, ne verifica la firma minisign e lo installa; poi si
// riavvia. Dove l'updater non puo' operare (Linux installato da .deb/.rpm,
// esecuzione fuori da Tauri) si ricade sul vecchio controllo "solo notifica"
// via API GitHub (`update_check_run`), e la UI mostra l'istruzione manuale.
const FIRST_CHECK_MS = 4_000
const PERIODIC_CHECK_MS = 4 * 60 * 60 * 1000

// L'oggetto `Update` del plugin resta FUORI dallo state di Pinia: la classe
// usa campi privati (#...) e, avvolta nel Proxy reattivo, qualunque metodo
// fallisce con "Cannot read private member from an object whose class did
// not declare it".
let pendingUpdate = null

export const useUpdateCheckStore = defineStore('updateCheck', {
  state: () => ({
    available: false,
    checking: false,
    currentVersion: null,
    latestVersion: null,
    url: null,
    // true quando l'aggiornamento si puo' installare da qui; false quando
    // si puo' solo avvisare (ripiego).
    installable: false,
    downloading: false,
    // 0..100, null finche' la dimensione totale non e' nota (GitHub non la
    // dichiara sempre): in quel caso la UI mostra i MB ricevuti.
    progress: null,
    receivedMb: 0,
    error: null
  }),

  actions: {
    async init() {
      try {
        this.currentVersion = await api.getAppVersion()
      } catch {
        return // fuori da Tauri (test, anteprima): niente controlli
      }
      // Il controllo automatico e' limitato alla build pacchettizzata, come
      // in origine: in dev disturberebbe ogni avvio.
      if (import.meta.env.PROD) {
        setTimeout(() => this.check(), FIRST_CHECK_MS)
        setInterval(() => this.check(), PERIODIC_CHECK_MS)
      }
    },

    async check() {
      if (this.checking || this.downloading) return
      this.checking = true
      this.error = null
      try {
        const update = await check()
        pendingUpdate = update
        this.installable = true
        this.available = Boolean(update)
        this.latestVersion = update?.version ?? this.latestVersion
        this.url = null
      } catch (e) {
        // L'updater non e' utilizzabile qui: si ricade sulla sola notifica.
        console.warn('[updateCheck] updater non disponibile, ripiego su notifica:', e)
        pendingUpdate = null
        this.installable = false
        try {
          const status = await api.checkForUpdates()
          this.available = status.available
          this.currentVersion = status.currentVersion ?? this.currentVersion
          this.latestVersion = status.latestVersion ?? this.latestVersion
          this.url = status.url ?? this.url
        } catch {
          // offline: si riprova al prossimo giro
        }
      } finally {
        this.checking = false
      }
    },

    // Scarica, installa e riavvia. In caso di errore l'app resta com'e' e
    // `error` porta il messaggio alla UI; si puo' riprovare.
    async install() {
      if (!pendingUpdate || this.downloading) return
      this.downloading = true
      this.progress = null
      this.receivedMb = 0
      this.error = null
      let total = 0
      let received = 0
      try {
        await pendingUpdate.downloadAndInstall((event) => {
          if (event.event === 'Started') {
            total = event.data.contentLength ?? 0
            if (total) this.progress = 0
          } else if (event.event === 'Progress') {
            received += event.data.chunkLength
            this.receivedMb = Math.round((received / 1024 / 1024) * 10) / 10
            if (total) this.progress = Math.min(100, Math.round((received / total) * 100))
          } else if (event.event === 'Finished') {
            this.progress = 100
          }
        })
        await relaunch()
      } catch (e) {
        this.error = String(e?.message ?? e)
        this.downloading = false
        this.progress = null
      }
    }
  }
})
