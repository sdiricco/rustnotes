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
use tauri::AppHandle;
use tauri_plugin_opener::OpenerExt;
use std::path::{Path, PathBuf};
use std::process::Stdio;
use std::time::Duration;
use tokio::io::AsyncWriteExt;
use tokio::process::Command;

/// Tempo massimo per una risposta. Un testo lungo da riformulare puo'
/// richiedere piu' di un minuto; oltre tre e' quasi certamente un blocco.
const RUN_TIMEOUT: Duration = Duration::from_secs(180);
/// Le chiamate di ispezione (`--version`, `auth status`) sono locali:
/// se non rispondono in pochi secondi qualcosa e' rotto.
const PROBE_TIMEOUT: Duration = Duration::from_secs(10);

const SYSTEM_PROMPT: &str = "You are a writing assistant embedded in a notes app. \
The user sends an instruction followed by a text. Reply ONLY with the requested text: \
no preamble, no explanation, no closing remarks, no markdown code fences. \
Write in the same language as the input text unless the instruction asks otherwise.";

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
            ".local/bin",     // installer nativo (curl | sh)
            ".claude/local",  // vecchio installer locale
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
        .filter(|l| l.starts_with('/'))
        .last()
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
    let result = v.get("result").and_then(Value::as_str).unwrap_or("").to_string();
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
        cost_usd: v.get("total_cost_usd").and_then(Value::as_f64).unwrap_or(0.0),
        duration_ms: v.get("duration_ms").and_then(Value::as_u64).unwrap_or(0),
    })
}

/// Manda `instruction` + `text` a Claude e ritorna il solo testo di risposta.
pub async fn run(instruction: &str, text: &str) -> Result<ClaudeReply, ClaudeError> {
    let bin = find_binary()
        .await
        .ok_or_else(|| ClaudeError::new("not-found", "claude binary not found"))?;

    let mut child = base_command(&bin)
        .args([
            "-p",
            "--output-format",
            "json",
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
        ])
        .stdin(Stdio::piped())
        .spawn()
        .map_err(|e| ClaudeError::new("spawn-failed", e.to_string()))?;

    // Tutto via stdin, senza prompt posizionale: cosi' il testo dell'utente
    // non passa per la riga di comando (limiti di lunghezza, ps).
    if let Some(mut stdin) = child.stdin.take() {
        let input = format!("{instruction}\n\n---\n\n{text}");
        stdin
            .write_all(input.as_bytes())
            .await
            .map_err(|e| ClaudeError::new("spawn-failed", e.to_string()))?;
        // drop chiude stdin: la CLI legge fino a EOF.
    }

    let out = tokio::time::timeout(RUN_TIMEOUT, child.wait_with_output())
        .await
        .map_err(|_| ClaudeError::new("timeout", "no reply within timeout"))?
        .map_err(|e| ClaudeError::new("spawn-failed", e.to_string()))?;

    let stdout = String::from_utf8_lossy(&out.stdout);
    if stdout.trim().is_empty() {
        let stderr = String::from_utf8_lossy(&out.stderr).trim().to_string();
        return Err(ClaudeError::new("failed", stderr));
    }
    parse_result(&stdout)
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
pub async fn claude_run(instruction: String, text: String) -> Result<ClaudeReply, ClaudeError> {
    let res = run(&instruction, &text).await;
    match &res {
        Ok(r) => eprintln!(
            "[rustnotes] claude_run -> {} caratteri, {} ms, ${:.4}",
            r.text.chars().count(),
            r.duration_ms,
            r.cost_usd
        ),
        Err(e) => eprintln!("[rustnotes] claude_run ERRORE {}: {}", e.code, e.message),
    }
    res
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
