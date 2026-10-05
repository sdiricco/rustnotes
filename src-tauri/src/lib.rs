//! Il ponte fra Rust e il frontend Vue (invariato). Ogni comando ha lo stesso
//! nome del canale IPC Electron originale, per rendere il porting di
//! `utils/api.js` una traduzione riga per riga.

mod claude;
mod demo;
mod file_transfer;
mod menu;
mod spellcheck;
mod store;
mod titlebar;
mod update_check;
mod zoom;

use serde_json::Value;
use tauri::{window::Color, AppHandle, Manager, Theme};
use tauri_plugin_opener::OpenerExt;

#[tauri::command]
fn store_load(app: AppHandle) -> Result<Value, String> {
    let data = store::load_data(&app)?;
    let n = data
        .get("notes")
        .and_then(Value::as_array)
        .map(|a| a.len())
        .unwrap_or(0);
    eprintln!("[rustnotes] store_load -> {n} note");
    Ok(data)
}

#[tauri::command]
fn store_save_note(app: AppHandle, note: Value) -> Result<bool, String> {
    let id = note
        .get("id")
        .and_then(Value::as_str)
        .unwrap_or("?")
        .to_string();
    store::save_note(&app, &note)?;
    eprintln!("[rustnotes] store_save_note -> {id}");
    Ok(true)
}

#[tauri::command]
fn store_delete_note(app: AppHandle, id: String) -> Result<bool, String> {
    store::delete_note(&app, &id)?;
    Ok(true)
}

#[tauri::command]
fn store_save_folders(app: AppHandle, folders: Value) -> Result<bool, String> {
    store::save_folders(&app, &folders)?;
    Ok(true)
}

#[tauri::command]
fn store_reveal_in_finder(app: AppHandle) -> Result<(), String> {
    let dir = store::data_dir(&app)?;
    app.opener()
        .open_path(dir.display().to_string(), None::<&str>)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn store_data_dir_info(app: AppHandle) -> Result<store::DataDirInfo, String> {
    store::data_dir_info(&app)
}

#[tauri::command]
fn store_inspect_dir(path: String) -> store::DirInspection {
    store::inspect_dir(&path)
}

/// `path` None = torna alla cartella predefinita. Il frontend ricarica lo
/// store subito dopo, perche' l'archivio in uso e' cambiato.
#[tauri::command]
fn store_set_data_dir(
    app: AppHandle,
    path: Option<String>,
) -> Result<store::SetDataDirResult, String> {
    let res = store::set_data_dir(&app, path)?;
    eprintln!(
        "[rustnotes] store_set_data_dir -> {} ({})",
        res.dir, res.mode
    );
    Ok(res)
}

// Ripiego "solo notifica" per le installazioni che l'updater non sa
// aggiornare (Linux .deb/.rpm): confronta la versione con l'ultima release
// e lascia all'utente il package manager.
#[tauri::command]
async fn update_check_run(app: AppHandle) -> update_check::UpdateStatus {
    let version = app.package_info().version.to_string();
    update_check::check(version).await
}

#[tauri::command]
fn update_check_app_version(app: AppHandle) -> String {
    app.package_info().version.to_string()
}

// Sincronizza l'aspetto nativo della finestra (titolo, bottoni di sistema)
// con il tema scelto nell'app: con titleBarStyle "Visible" il colore del
// testo del titolo lo decide macOS in base al Theme della NSWindow, non al
// contenuto della webview — senza questa chiamata restava sul chiaro di
// default anche a contenuto scuro, rendendo il titolo nero su sfondo scuro.
#[tauri::command]
fn set_window_theme(app: AppHandle, dark: bool) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        window
            .set_theme(Some(if dark { Theme::Dark } else { Theme::Light }))
            .map_err(|e| e.to_string())?;
        window
            .set_background_color(Some(window_background(dark)))
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

// Colore della finestra dietro alla webview, che ha il body trasparente. Da
// wry 0.57 la webview non dipinge piu' un fondo proprio quando
// `backgroundColor` e' impostato (prima succedeva solo con la feature
// "transparent"), quindi questo colore si vede attraverso gli elementi
// traslucidi (sidebar, header): deve seguire il tema, altrimenti in scuro
// restano su un fondo chiaro. Stessi valori di --editor-bg in main.css.
fn window_background(dark: bool) -> Color {
    if dark {
        Color(26, 26, 26, 255)
    } else {
        Color(246, 246, 246, 255)
    }
}

/// Geometria della barra del titolo per il CSS (vedi titlebar.rs). Il comando
/// gira sul main thread (Tauri vi esegue i comandi sincroni su macOS), come
/// richiesto da AppKit. Fuori da macOS: barra di 38px e nessun semaforo.
#[tauri::command]
fn titlebar_geometry(app: AppHandle) -> titlebar::Geometry {
    app.get_webview_window("main")
        .and_then(|w| titlebar::geometry(&w))
        .unwrap_or(titlebar::Geometry {
            height: 38.0,
            buttons_end: 0.0,
        })
}

// Ricostruisce il menu nativo nella lingua scelta. Chiamato dal frontend
// all'avvio (con la preferenza salvata) e a ogni cambio lingua.
#[tauri::command]
fn set_menu_language(app: AppHandle, lang: String) -> Result<(), String> {
    let m = menu::build_menu(&app, &lang).map_err(|e| e.to_string())?;
    app.set_menu(m).map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Prima di creare la webview: WebKit legge lo stato una volta sola.
    spellcheck::enable();

    let builder = tauri::Builder::default();
    #[cfg(feature = "e2e")]
    let builder = builder
        .plugin(tauri_plugin_wdio::init())
        .plugin(tauri_plugin_wdio_webdriver::init());

    builder
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        // Aggiornamento in-app: `latest.json` firmato (minisign) su GitHub
        // Releases, download e installazione dal frontend (stores/updateCheck).
        // `process` serve solo per il riavvio a installazione finita.
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .manage(claude::Running::default())
        .manage(claude::Warm::default())
        .setup(|app| {
            let handle = app.handle().clone();
            // Sfondo iniziale coerente con l'aspetto corrente: il frontend lo
            // riallinea subito dopo con set_window_theme, ma senza questo il
            // primo frame in dark mode sarebbe chiaro.
            if let Some(window) = app.get_webview_window("main") {
                let dark = matches!(window.theme(), Ok(Theme::Dark));
                let _ = window.set_background_color(Some(window_background(dark)));
            }
            match store::migrate_legacy(&handle) {
                Ok(Some(n)) => eprintln!(
                    "[rustnotes] migrate_legacy -> {n} note copiate dalla cartella precedente"
                ),
                Ok(None) => {}
                Err(e) => eprintln!("[rustnotes] migrate_legacy ERRORE: {e}"),
            }
            let m = menu::build_menu(&handle, menu::system_lang())?;
            app.set_menu(m)?;

            if let Some(window) = app.get_webview_window("main") {
                // GTK: la menubar e' trasparente e mostra lo sfondo nativo.
                // Il #f6f6f6 della config rende il testo del tema scuro illeggibile.
                // Ripristina lo sfondo di sistema solo sulla finestra, lasciando
                // alla webview il colore iniziale configurato.
                #[cfg(target_os = "linux")]
                window.as_ref().window().set_background_color(None)?;
                titlebar::install(&window);
            }
            demo::install(&handle);

            // Zoom salvato: riapplicato subito, prima che la pagina si veda.
            let saved = store::zoom_get(&handle);
            if (saved - 1.0).abs() > f64::EPSILON {
                let _ = zoom::apply(&handle, saved);
            }

            // Il controllo periodico degli aggiornamenti e' nel frontend
            // (stores/updateCheck.js), che usa il plugin updater e ricade su
            // `update_check_run` dove l'updater non puo' operare (.deb/.rpm).

            Ok(())
        })
        .on_menu_event(|app, event| {
            menu::handle_menu_event(app, event.id().as_ref());
        })
        .invoke_handler(tauri::generate_handler![
            store_load,
            store_save_note,
            store_delete_note,
            store_save_folders,
            store_reveal_in_finder,
            store_data_dir_info,
            store_inspect_dir,
            store_set_data_dir,
            file_transfer::pick_folder,
            update_check_run,
            update_check_app_version,
            set_window_theme,
            set_menu_language,
            titlebar_geometry,
            zoom::zoom_get,
            zoom::zoom_in,
            zoom::zoom_out,
            zoom::zoom_reset,
            file_transfer::export_md,
            file_transfer::export_all_md,
            file_transfer::import_md,
            file_transfer::pick_image,
            file_transfer::read_local_image,
            claude::claude_status,
            claude::claude_login,
            claude::claude_run,
            claude::claude_stream,
            claude::claude_prewarm,
            claude::claude_cancel,
        ])
        .build(tauri::generate_context!())
        .expect("errore durante l'avvio dell'applicazione Tauri")
        .run(|app, event| {
            // Processi `claude` (pre avviato o in corso) chiusi con l'app.
            if let tauri::RunEvent::Exit = event {
                claude::shutdown(
                    &app.state::<claude::Warm>(),
                    &app.state::<claude::Running>(),
                );
            }
        });
}
