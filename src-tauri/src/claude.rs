//! Integrazione con Claude tramite la CLI di Claude Code (`claude -p`).
//!
//! Scelta di fondo: nessuna chiave API nell'app, nessun server in mezzo.
//! L'app lancia il binario `claude` gia' installato e loggato dall'utente,
//! come farebbe da Terminale, e ne legge la risposta JSON. Chi non ha la CLI
//! vede la funzione disabilitata con l'indicazione di come installarla.
//!
//! La CLI e' un agente con accesso a file e shell: qui serve solo testo. Ogni
//! chiamata gira quindi con gli strumenti disattivati, senza MCP, senza
//! salvare la sessione, con un system prompt nostro e con cwd su una cartella
//! temporanea vuota, cosi' non legge il CLAUDE.md di qualche progetto ne'
//! tocca il disco dell'utente.

use serde::Serialize;
use serde_json::Value;
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::process::Stdio;
use std::sync::Mutex;
use std::time::Duration;
use tauri::{AppHandle, Emitter, State};
use tauri_plugin_opener::OpenerExt;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::process::{Child, ChildStdin, ChildStdout, Command};

/// Tempo massimo per una risposta. Un testo lungo da riformulare puo'
/// richiedere piu' di un minuto; oltre tre e' quasi certamente un blocco.
const RUN_TIMEOUT: Duration = Duration::from_secs(180);
/// Le chiamate di ispezione (`--version`, `auth status`) sono locali:
/// se non rispondono in pochi secondi qualcosa e' rotto.
const PROBE_TIMEOUT: Duration = Duration::from_secs(10);

const SYSTEM_PROMPT: &str = "You are a writing assistant embedded in a notes app. \
The user sends an instruction followed by a text. Reply ONLY with the requested text: \
no preamble, no explanation, no closing remarks, no code fences around the whole reply. \
When the input text is Markdown, reply in Markdown and preserve its structure \
(headings, lists, links, images, tables) unless the instruction says otherwise. \
Write in the same language as the input text unless the instruction asks otherwise.";

/// Processi `claude -p` in corso, per richiesta: serve al comando di
/// annullamento. Registrato come stato Tauri in lib.rs.
#[derive(Default)]
pub struct Running(pub Mutex<HashMap<String, Child>>);

/// Un processo gia' avviato e in attesa del messaggio su stdin: paga in
/// anticipo l'avvio di Node e l'inizializzazione della CLI (circa 2,4 s),
/// cosi' la richiesta successiva parte subito. Uno solo, per il modello
/// scelto; usato una volta e poi riavviato dal frontend (claude_prewarm).
#[derive(Default)]
pub struct Warm(pub Mutex<Option<Spawned>>);

pub struct Spawned {
    pub model: String,
    pub child: Child,
    pub stdin: Option<ChildStdin>,
    pub stdout: Option<ChildStdout>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct EndEvent<'a> {
    request_id: &'a str,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct DeltaEvent<'a> {
    request_id: &'a str,
    text: &'a str,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ClaudeStatus {
    /// Binario trovato.
    pub found: bool,
    pub path: Option<String>,
    /// Es. "2.1.222".
    pub version: Option<String>,
    /// `claude auth status` dice che c'e' una sessione valida.
    pub logged_in: bool,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ClaudeReply {
    pub text: String,
    pub cost_usd: f64,
    pub duration_ms: u64,
}

/// Errore strutturato: il frontend traduce `code`, `message` e' il dettaglio
/// grezzo per il toast o il log.
#[derive(Debug, Serialize, Clone)]
pub struct ClaudeError {
    pub code: &'static str,
    pub message: String,
}

impl ClaudeError {
    fn new(code: &'static str, message: impl Into<String>) -> Self {
        Self {
            code,
            message: message.into(),
        }
    }
}

// ---------------------------------------------------------------------------
// Dove sta il binario
// ---------------------------------------------------------------------------

/// Cartelle in cui gli installer di Claude Code mettono il binario. Servono
/// perche' un'app avviata dal Finder eredita un PATH minimo (/usr/bin:/bin:
/// /usr/sbin:/sbin), non quello della shell dell'utente.
fn known_dirs() -> Vec<PathBuf> {
    let mut dirs = Vec::new();
    if let Ok(home) = std::env::var("HOME") {
        let home = PathBuf::from(home);
        for rel in [
            ".local/bin",    // installer nativo (curl | sh)
            ".claude/local", // vecchio installer locale
            ".npm-global/bin",
            ".bun/bin",
            ".volta/bin",
        ] {
            dirs.push(home.join(rel));
        }
    }
    for abs in ["/opt/homebrew/bin", "/usr/local/bin", "/usr/bin"] {
        dirs.push(PathBuf::from(abs));
    }
    dirs
}

fn path_dirs() -> Vec<PathBuf> {
    std::env::var_os("PATH")
        .map(|p| std::env::split_paths(&p).collect())
        .unwrap_or_default()
}

fn is_executable(p: &Path) -> bool {
    use std::os::unix::fs::PermissionsExt;
    std::fs::metadata(p)
        .map(|m| m.is_file() && m.permissions().mode() & 0o111 != 0)
        .unwrap_or(false)
}

/// Ultima risorsa: chiede alla shell di login dell'utente, che carica il suo
/// PATH completo (.zprofile/.zshrc, nvm, ecc.). Lento (100-500 ms) e
/// rumoroso (una shell interattiva puo' stampare altro), quindi si prende
/// solo l'ultima riga che sembra un percorso.
async fn ask_login_shell() -> Option<PathBuf> {
    let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".into());
    let out = tokio::time::timeout(
        PROBE_TIMEOUT,
        Command::new(shell)
            .args(["-lic", "command -v claude"])
            .stdin(Stdio::null())
            .stderr(Stdio::null())
            .kill_on_drop(true)
            .output(),
    )
    .await
    .ok()?
    .ok()?;
    let stdout = String::from_utf8_lossy(&out.stdout);
    stdout
        .lines()
        .map(str::trim)
        .rfind(|l| l.starts_with('/'))
        .map(PathBuf::from)
        .filter(|p| is_executable(p))
}

pub async fn find_binary() -> Option<PathBuf> {
    for dir in path_dirs().into_iter().chain(known_dirs()) {
        let p = dir.join("claude");
        if is_executable(&p) {
            return Some(p);
        }
    }
    ask_login_shell().await
}

/// PATH per il processo figlio: quello ereditato piu' le cartelle note e
/// quella del binario. Serve perche' la versione npm di `claude` e' uno
/// script con shebang `node`, che deve a sua volta essere trovato.
fn child_path(bin: &Path) -> std::ffi::OsString {
    let mut dirs = path_dirs();
    if let Some(d) = bin.parent() {
        dirs.push(d.to_path_buf());
    }
    dirs.extend(known_dirs());
    std::env::join_paths(dirs.iter().filter(|d| d.is_dir())).unwrap_or_default()
}

/// Cartella di lavoro vuota per la CLI: niente CLAUDE.md, niente .claude/.
fn work_dir() -> PathBuf {
    let dir = std::env::temp_dir().join("rustnotes-claude");
    let _ = std::fs::create_dir_all(&dir);
    dir
}

fn base_command(bin: &Path) -> Command {
    let mut cmd = Command::new(bin);
    cmd.env("PATH", child_path(bin))
        .current_dir(work_dir())
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .kill_on_drop(true);
    cmd
}

// ---------------------------------------------------------------------------
// Stato
// ---------------------------------------------------------------------------

async fn probe(bin: &Path, args: &[&str]) -> Option<String> {
    let out = tokio::time::timeout(PROBE_TIMEOUT, base_command(bin).args(args).output())
        .await
        .ok()?
        .ok()?;
    Some(String::from_utf8_lossy(&out.stdout).trim().to_string())
}

pub async fn status() -> ClaudeStatus {
    let Some(bin) = find_binary().await else {
        return ClaudeStatus {
            found: false,
            path: None,
            version: None,
            logged_in: false,
        };
    };
    // "2.1.222 (Claude Code)" -> "2.1.222"
    let version = probe(&bin, &["--version"])
        .await
        .and_then(|v| v.split_whitespace().next().map(str::to_string));
    let logged_in = probe(&bin, &["auth", "status"])
        .await
        .and_then(|s| serde_json::from_str::<Value>(&s).ok())
        .and_then(|v| v.get("loggedIn").and_then(Value::as_bool))
        .unwrap_or(false);
    ClaudeStatus {
        found: true,
        path: Some(bin.display().to_string()),
        version,
        logged_in,
    }
}

// ---------------------------------------------------------------------------
// Esecuzione
// ---------------------------------------------------------------------------

/// Interpreta il JSON di `--output-format json`. Distinto da `run` per poter
/// essere testato senza lanciare nulla.
pub fn parse_result(stdout: &str) -> Result<ClaudeReply, ClaudeError> {
    let v: Value = serde_json::from_str(stdout.trim())
        .map_err(|e| ClaudeError::new("bad-output", format!("{e}: {}", stdout.trim())))?;
    let result = v
        .get("result")
        .and_then(Value::as_str)
        .unwrap_or("")
        .to_string();
    if v.get("is_error").and_then(Value::as_bool).unwrap_or(false) {
        // Il messaggio di errore della CLI viaggia nel campo `result`.
        let code = if result.to_lowercase().contains("authenticate")
            || result.to_lowercase().contains("oauth")
            || result.to_lowercase().contains("login")
        {
            "not-logged-in"
        } else {
            "failed"
        };
        return Err(ClaudeError::new(code, result));
    }
    Ok(ClaudeReply {
        text: result,
        cost_usd: v
            .get("total_cost_usd")
            .and_then(Value::as_f64)
            .unwrap_or(0.0),
        duration_ms: v.get("duration_ms").and_then(Value::as_u64).unwrap_or(0),
    })
}

/// Avvia `claude -p` in modalita' stream-json su entrambi i lati: il
/// messaggio dell'utente arriva come JSON su stdin, cosi' lo stesso processo
/// puo' essere avviato prima e alimentato dopo (vedi `Warm`).
fn spawn_cli(bin: &Path, model: &str) -> Result<Spawned, ClaudeError> {
    let mut cmd = base_command(bin);
    cmd.args([
        "-p",
        "--input-format",
        "stream-json",
        "--output-format",
        "stream-json",
        "--verbose",
        "--include-partial-messages",
        // Solo testo: niente Bash, niente lettura o scrittura di file.
        "--tools",
        "",
        // Nessun server MCP dell'utente: rallenterebbero l'avvio e non
        // servono.
        "--strict-mcp-config",
        // Niente hook o permessi dalle impostazioni utente/progetto.
        "--setting-sources",
        "",
        "--no-session-persistence",
        "--system-prompt",
        SYSTEM_PROMPT,
    ]);
    if !model.is_empty() {
        cmd.args(["--model", model]);
    }
    let mut child = cmd
        .stdin(Stdio::piped())
        .spawn()
        .map_err(|e| ClaudeError::new("spawn-failed", e.to_string()))?;
    let stdin = child.stdin.take();
    let stdout = child.stdout.take();
    Ok(Spawned {
        model: model.to_string(),
        child,
        stdin,
        stdout,
    })
}

/// Prende il processo pre avviato se c'e', e' vivo e ha il modello giusto;
/// altrimenti lo scarta (verra' raccolto in background).
fn take_warm(warm: Option<&Warm>, model: &str) -> Option<Spawned> {
    let mut slot = warm?.0.lock().unwrap();
    let mut sp = slot.take()?;
    let alive = matches!(sp.child.try_wait(), Ok(None));
    if alive && sp.model == model {
        return Some(sp);
    }
    let _ = sp.child.start_kill();
    tauri::async_runtime::spawn(async move {
        let _ = sp.child.wait().await;
    });
    None
}

/// Avvia (o rimpiazza) il processo in attesa per `model`.
pub async fn prewarm(warm: &Warm, model: &str) -> Result<(), ClaudeError> {
    {
        let mut slot = warm.0.lock().unwrap();
        if let Some(sp) = slot.as_mut() {
            if sp.model == model && matches!(sp.child.try_wait(), Ok(None)) {
                return Ok(());
            }
            if let Some(mut old) = slot.take() {
                let _ = old.child.start_kill();
                tauri::async_runtime::spawn(async move {
                    let _ = old.child.wait().await;
                });
            }
        }
    }
    let bin = find_binary()
        .await
        .ok_or_else(|| ClaudeError::new("not-found", "claude binary not found"))?;
    let sp = spawn_cli(&bin, model)?;
    *warm.0.lock().unwrap() = Some(sp);
    Ok(())
}

/// All'uscita dell'app: niente processi Node orfani.
pub fn shutdown(warm: &Warm, running: &Running) {
    if let Some(mut sp) = warm.0.lock().unwrap().take() {
        let _ = sp.child.start_kill();
    }
    for (_, mut child) in running.0.lock().unwrap().drain() {
        let _ = child.start_kill();
    }
}

/// Manda `instruction` + `text` a Claude e ritorna il solo testo di risposta.
///
/// Ogni frammento di testo passa a `on_delta` mentre arriva; `on_end` scatta
/// a `message_stop`, quando il testo e' completo ma la CLI deve ancora
/// chiudere il turno (circa un secondo): il frontend puo' gia' abilitare i
/// pulsanti. La riga finale `result` da' testo completo, costo e durata.
/// Con `registry` e `request_id` il processo resta annullabile da `cancel`.
pub async fn run(
    instruction: &str,
    text: &str,
    model: &str,
    warm: Option<&Warm>,
    registry: Option<(&Running, &str)>,
    mut on_delta: impl FnMut(&str),
    mut on_end: impl FnMut(),
) -> Result<ClaudeReply, ClaudeError> {
    let mut sp = match take_warm(warm, model) {
        Some(sp) => sp,
        None => {
            let bin = find_binary()
                .await
                .ok_or_else(|| ClaudeError::new("not-found", "claude binary not found"))?;
            spawn_cli(&bin, model)?
        }
    };

    // Messaggio come JSON su stdin, poi EOF: la CLI risponde e termina.
    // Il testo dell'utente non passa dalla riga di comando.
    let content = format!("{instruction}\n\n---\n\n{text}");
    let message = serde_json::json!({
        "type": "user",
        "message": { "role": "user", "content": content }
    });
    if let Some(mut stdin) = sp.stdin.take() {
        let mut line = message.to_string();
        line.push('\n');
        stdin
            .write_all(line.as_bytes())
            .await
            .map_err(|e| ClaudeError::new("spawn-failed", e.to_string()))?;
        // drop chiude stdin.
    }
    let stdout = sp
        .stdout
        .take()
        .ok_or_else(|| ClaudeError::new("spawn-failed", "no stdout"))?;
    let mut stderr = sp.child.stderr.take();
    let child = sp.child;

    // Il figlio va nel registro solo dopo aver preso stdout/stderr: da qui in
    // avanti `cancel` puo' ucciderlo e la lettura termina per EOF.
    let mut fallback: Option<Child> = None;
    match registry {
        Some((reg, id)) => {
            reg.0.lock().unwrap().insert(id.to_string(), child);
        }
        None => fallback = Some(child),
    }
    let take_back =
        |registry: Option<(&Running, &str)>, fallback: Option<Child>| -> Option<Child> {
            match registry {
                Some((reg, id)) => reg.0.lock().unwrap().remove(id),
                None => fallback,
            }
        };

    let mut lines = BufReader::new(stdout).lines();
    let mut result_line: Option<String> = None;
    let read = async {
        while let Ok(Some(line)) = lines.next_line().await {
            let Ok(v) = serde_json::from_str::<Value>(&line) else {
                continue;
            };
            match v.get("type").and_then(Value::as_str) {
                Some("stream_event") => match v.pointer("/event/type").and_then(Value::as_str) {
                    Some("content_block_delta") => {
                        if v.pointer("/event/delta/type").and_then(Value::as_str)
                            == Some("text_delta")
                        {
                            if let Some(t) = v.pointer("/event/delta/text").and_then(Value::as_str)
                            {
                                on_delta(t);
                            }
                        }
                    }
                    Some("message_stop") => on_end(),
                    _ => {}
                },
                Some("result") => result_line = Some(line),
                _ => {}
            }
        }
    };
    let timed_out = tokio::time::timeout(RUN_TIMEOUT, read).await.is_err();

    // Registro: se `cancel` ha gia' tolto il figlio, e' stato annullato.
    let child = take_back(registry, fallback.take());
    let cancelled = registry.is_some() && child.is_none();
    if let Some(mut child) = child {
        if timed_out {
            let _ = child.start_kill();
        }
        let _ = child.wait().await;
    }
    if cancelled {
        return Err(ClaudeError::new("cancelled", "cancelled by user"));
    }
    if timed_out {
        return Err(ClaudeError::new("timeout", "no reply within timeout"));
    }

    match result_line {
        Some(line) => parse_result(&line),
        None => {
            let mut msg = String::new();
            if let Some(err) = stderr.as_mut() {
                let mut buf = Vec::new();
                let _ = tokio::io::AsyncReadExt::read_to_end(err, &mut buf).await;
                msg = String::from_utf8_lossy(&buf).trim().to_string();
            }
            Err(ClaudeError::new("failed", msg))
        }
    }
}

/// Uccide il processo di una richiesta in corso. La `run` corrispondente
/// vede EOF, non ritrova il figlio nel registro e ritorna `cancelled`.
pub fn cancel(registry: &Running, request_id: &str) {
    if let Some(mut child) = registry.0.lock().unwrap().remove(request_id) {
        let _ = child.start_kill();
        // Il wait lo fa `run`? No: il figlio e' uscito dal registro, quindi
        // lo si raccoglie qui in background per non lasciare zombie.
        tauri::async_runtime::spawn(async move {
            let _ = child.wait().await;
        });
    }
}

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

/// Il login della CLI e' interattivo (browser + codice da incollare) e vuole
/// un vero terminale. Invece di incorporarne uno, si scrive uno script
/// `.command` e lo si apre: macOS lo esegue in Terminal.app senza bisogno di
/// permessi di automazione. `done_message` e' la riga finale, tradotta dal
/// frontend.
pub async fn login(app: &AppHandle, done_message: &str) -> Result<(), ClaudeError> {
    let bin = find_binary()
        .await
        .ok_or_else(|| ClaudeError::new("not-found", "claude binary not found"))?;
    let script = work_dir().join("login.command");
    let body = format!(
        "#!/bin/zsh\nclear\n\"{}\" auth login\necho\necho {}\n",
        bin.display(),
        shell_quote(done_message)
    );
    std::fs::write(&script, body).map_err(|e| ClaudeError::new("failed", e.to_string()))?;
    {
        use std::os::unix::fs::PermissionsExt;
        std::fs::set_permissions(&script, std::fs::Permissions::from_mode(0o755))
            .map_err(|e| ClaudeError::new("failed", e.to_string()))?;
    }
    app.opener()
        .open_path(script.display().to_string(), None::<&str>)
        .map_err(|e| ClaudeError::new("failed", e.to_string()))
}

fn shell_quote(s: &str) -> String {
    format!("'{}'", s.replace('\'', "'\\''"))
}

// ---------------------------------------------------------------------------
// Comandi Tauri
// ---------------------------------------------------------------------------

#[tauri::command]
pub async fn claude_status() -> ClaudeStatus {
    let s = status().await;
    eprintln!(
        "[rustnotes] claude_status -> found={} version={:?} loggedIn={}",
        s.found, s.version, s.logged_in
    );
    s
}

#[tauri::command]
pub async fn claude_login(app: AppHandle, done_message: String) -> Result<(), ClaudeError> {
    login(&app, &done_message).await
}

#[tauri::command]
pub async fn claude_run(
    instruction: String,
    text: String,
    model: Option<String>,
) -> Result<ClaudeReply, ClaudeError> {
    let res = run(
        &instruction,
        &text,
        model.as_deref().unwrap_or(""),
        None,
        None,
        |_| {},
        || {},
    )
    .await;
    log_run(&res);
    res
}

/// Come `claude_run`, ma ogni frammento arriva al frontend come evento
/// `claude:delta` con `requestId`, `claude:end` segna la fine del testo, e
/// la richiesta e' annullabile. Usa il processo pre avviato se c'e'.
#[tauri::command]
pub async fn claude_stream(
    app: AppHandle,
    running: State<'_, Running>,
    warm: State<'_, Warm>,
    request_id: String,
    instruction: String,
    text: String,
    model: Option<String>,
) -> Result<ClaudeReply, ClaudeError> {
    let res = run(
        &instruction,
        &text,
        model.as_deref().unwrap_or(""),
        Some(&warm),
        Some((&running, &request_id)),
        |t| {
            let _ = app.emit(
                "claude:delta",
                DeltaEvent {
                    request_id: &request_id,
                    text: t,
                },
            );
        },
        || {
            let _ = app.emit(
                "claude:end",
                EndEvent {
                    request_id: &request_id,
                },
            );
        },
    )
    .await;
    log_run(&res);
    res
}

#[tauri::command]
pub async fn claude_prewarm(
    warm: State<'_, Warm>,
    model: Option<String>,
) -> Result<(), ClaudeError> {
    let res = prewarm(&warm, model.as_deref().unwrap_or("")).await;
    if let Err(e) = &res {
        eprintln!(
            "[rustnotes] claude_prewarm ERRORE {}: {}",
            e.code, e.message
        );
    }
    res
}

#[tauri::command]
pub fn claude_cancel(running: State<'_, Running>, request_id: String) {
    eprintln!("[rustnotes] claude_cancel -> {request_id}");
    cancel(&running, &request_id);
}

fn log_run(res: &Result<ClaudeReply, ClaudeError>) {
    match res {
        Ok(r) => eprintln!(
            "[rustnotes] claude_run -> {} caratteri, {} ms, ${:.4}",
            r.text.chars().count(),
            r.duration_ms,
            r.cost_usd
        ),
        Err(e) => eprintln!("[rustnotes] claude_run ERRORE {}: {}", e.code, e.message),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_success() {
        let json = r#"{"type":"result","subtype":"success","is_error":false,
            "result":"Testo corretto.","total_cost_usd":0.0123,"duration_ms":4200}"#;
        let r = parse_result(json).unwrap();
        assert_eq!(r.text, "Testo corretto.");
        assert_eq!(r.duration_ms, 4200);
        assert!((r.cost_usd - 0.0123).abs() < 1e-9);
    }

    #[test]
    fn parse_auth_error() {
        let json = r#"{"is_error":true,"subtype":"success","result":
            "Failed to authenticate: OAuth session expired and could not be refreshed"}"#;
        let e = parse_result(json).unwrap_err();
        assert_eq!(e.code, "not-logged-in");
    }

    #[test]
    fn quote_for_shell() {
        assert_eq!(shell_quote("ciao"), "'ciao'");
        assert_eq!(shell_quote("l'app"), "'l'\\''app'");
    }

    #[test]
    fn parse_garbage() {
        let e = parse_result("not json").unwrap_err();
        assert_eq!(e.code, "bad-output");
    }
}
