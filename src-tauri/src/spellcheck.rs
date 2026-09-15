//! Correzione ortografica su macOS.
//!
//! In WKWebView l'attributo HTML `spellcheck` e' solo un filtro per elemento:
//! il controllo continuo gira soltanto se e' acceso a livello di processo, e
//! WebKit legge quello stato una volta sola dal default utente
//! `WebContinuousSpellCheckingEnabled` dell'app (TextCheckerMac.mm), per il
//! quale non registra alcun valore predefinito. Senza questa scrittura resta
//! false e nessuna parola viene mai sottolineata, qualunque cosa faccia il
//! toggle nelle Impostazioni. Safari funziona perche' registra quel default
//! da se'; Tauri no, e il suo menu non puo' esporre "Ortografia e grammatica".
//!
//! Qui lo si accende sempre, prima che la webview esista (WebKit lo legge
//! alla creazione della pagina). A decidere se sottolineare o no resta
//! l'attributo `spellcheck` messo dal frontend (QuillEditor.vue), che cosi'
//! funziona in tempo reale, senza riavvio. La lingua del dizionario invece
//! non e' controllabile dall'app: WebKit non passa l'attributo `lang` a
//! NSSpellChecker e usa quella di Impostazioni di Sistema > Tastiera.

#[cfg(target_os = "macos")]
pub fn enable() {
    use objc2_foundation::{ns_string, NSUserDefaults};

    let defaults = NSUserDefaults::standardUserDefaults();
    let key = ns_string!("WebContinuousSpellCheckingEnabled");
    if !defaults.boolForKey(key) {
        defaults.setBool_forKey(true, key);
        eprintln!("[rustnotes] spellcheck: WebContinuousSpellCheckingEnabled attivato");
    }
}

#[cfg(not(target_os = "macos"))]
pub fn enable() {}
