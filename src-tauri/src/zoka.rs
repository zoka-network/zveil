// Bridge to the native `zoka` binary.
//
// Mirrors the approach ZSilent uses in ZokaCli.kt: locate the bundled binary,
// point it at a shared ZOKA_HOME, hand it the network manifest and the trusted
// setup, serialize invocations, and — crucially — detect an already-running
// node so a second one is never started against the same database.

use std::io::Write;
use std::net::{SocketAddr, TcpStream};
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::sync::Mutex;
use std::time::Duration;

use serde::Serialize;
use serde_json::Value;
use tauri::{AppHandle, Manager};

// The trusted setup that ships with 1.5.0+ wallets. Same digest ZSilent pins.
const TRUSTED_SETUP_DIGEST: &str = "219fdb5d5e47e115ca899d13a6de284df03c86eaaef05eb4ff4adb395cfb0d8e";

// Local node RPC. A node (ours or ZSilent's) binds this; we attach to it rather
// than starting a competing process that would fail on the RocksDB lock.
const LOCAL_RPC_HOST: &str = "127.0.0.1";
const LOCAL_RPC_PORT: u16 = 3000;

// Only one CLI call touches the wallet store at a time, exactly like the
// ReentrantLock ZSilent wraps its own invocations in.
static CLI_LOCK: Mutex<()> = Mutex::new(());

#[derive(Clone)]
pub struct ZokaPaths {
    pub binary: PathBuf,
    pub home: PathBuf,
    pub network_config: Option<PathBuf>,
    pub trusted_setup_dir: Option<PathBuf>,
}

fn first_existing(candidates: &[PathBuf]) -> Option<PathBuf> {
    candidates.iter().find(|p| p.exists()).cloned()
}

/// Shared data root. Matches setup_zoka_home() on the Rust node side and
/// defaultDataRoot() in ZokaCli.kt, so the wallet-lite, the CLI and ZSilent all
/// operate on the same .zoka/<network> tree and see the same wallets.
fn default_home() -> PathBuf {
    if let Ok(explicit) = std::env::var("ZOKA_HOME") {
        if !explicit.is_empty() {
            return PathBuf::from(explicit);
        }
    }
    if cfg!(windows) {
        if let Ok(appdata) = std::env::var("APPDATA") {
            if !appdata.is_empty() {
                return PathBuf::from(appdata).join("Zoka");
            }
        }
    } else if cfg!(target_os = "macos") {
        if let Ok(home) = std::env::var("HOME") {
            return PathBuf::from(home).join("Library/Application Support/Zoka");
        }
    } else if let Ok(xdg) = std::env::var("XDG_DATA_HOME") {
        if !xdg.is_empty() {
            return PathBuf::from(xdg).join("zoka");
        }
    }
    let home = std::env::var("HOME").unwrap_or_else(|_| ".".into());
    PathBuf::from(home).join(".zoka")
}

pub fn resolve_paths(app: &AppHandle) -> Result<ZokaPaths, String> {
    let bin_name = if cfg!(windows) { "zoka.exe" } else { "zoka" };
    let resource_dir = app.path().resource_dir().ok();

    let mut bin_candidates: Vec<PathBuf> = Vec::new();
    let mut config_candidates: Vec<PathBuf> = Vec::new();
    let mut setup_candidates: Vec<PathBuf> = Vec::new();

    // Dev override: point the shell at a locally built binary/repo.
    if let Ok(p) = std::env::var("ZOKA_WALLET_ZOKA_BIN") {
        bin_candidates.push(PathBuf::from(p));
    }

    if let Some(rd) = &resource_dir {
        bin_candidates.push(rd.join(bin_name));
        config_candidates.push(rd.join("mainnet-network.v1.json"));
        setup_candidates.push(rd.join("trusted-setup"));
    }

    // Dev fallback: the parent ZOKA repo, when running unbundled from target/.
    if let Ok(exe) = std::env::current_exe() {
        // .../zoka-guard-vault/src-tauri/target/<profile>/zoka-wallet.exe
        // walk up to the ZOKA repo root and reach its built binary + assets.
        if let Some(repo) = exe.ancestors().nth(5) {
            bin_candidates.push(repo.join("target/release").join(bin_name));
            config_candidates.push(repo.join("docs/mainnet-network.v1.json"));
            setup_candidates.push(repo.join("trusted-setup"));
        }
    }

    let binary = first_existing(&bin_candidates)
        .ok_or_else(|| "zoka binary not found (bundled resource missing)".to_string())?;

    Ok(ZokaPaths {
        binary,
        home: default_home(),
        network_config: first_existing(&config_candidates),
        trusted_setup_dir: first_existing(&setup_candidates),
    })
}

/// True when a node already answers on the local RPC port. When it does we
/// attach to it instead of launching a second node against the same database.
pub fn local_node_running() -> bool {
    let addr = SocketAddr::from(([127, 0, 0, 1], LOCAL_RPC_PORT));
    TcpStream::connect_timeout(&addr, Duration::from_millis(400)).is_ok()
}

fn base_command(paths: &ZokaPaths) -> Command {
    let mut cmd = Command::new(&paths.binary);
    cmd.env("ZOKA_HOME", &paths.home);
    cmd.env("ZOKA_MINER_LAUNCHER", "zoka-wallet");
    if let Some(cfg) = &paths.network_config {
        cmd.env("ZOKA_NETWORK_CONFIG", cfg);
        cmd.env("ZOKA_MAINNET_NETWORK_CONFIG", cfg);
    }
    if let Some(setup) = &paths.trusted_setup_dir {
        cmd.env("ZOKA_TRUSTED_SETUP_DIR", setup);
        cmd.env("ZOKA_EXPECTED_SETUP_DIGEST", TRUSTED_SETUP_DIGEST);
    }
    // Attach to a running node (ours or ZSilent's) for chain reads/broadcast.
    if local_node_running() {
        let url = format!("http://{LOCAL_RPC_HOST}:{LOCAL_RPC_PORT}");
        cmd.env("ZOKA_LOCAL_RPC_URL", &url);
        cmd.env("ZOKA_NODE_ENDPOINT", &url);
        cmd.env("ZOKA_CLI_NODE_ENDPOINT", &url);
    }
    cmd
}

pub struct CliOutput {
    pub stdout: String,
    #[allow(dead_code)]
    pub stderr: String,
}

// Hide the console window Windows would otherwise pop up for each `zoka.exe`
// invocation. Without this, every balance/height poll flashes a cmd window.
#[cfg(windows)]
pub fn no_window(cmd: &mut Command) {
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x0800_0000;
    cmd.creation_flags(CREATE_NO_WINDOW);
}

#[cfg(not(windows))]
pub fn no_window(_cmd: &mut Command) {}

/// Run the binary with the given args. `secret_env` values are attached only to
/// this child process (passwords/seeds are passed via env or stdin, never in
/// argv where they would show up in the process list). `stdin_data` is written
/// to the child's stdin, for `--seed-stdin` / `--password-stdin`.
pub fn run(
    paths: &ZokaPaths,
    args: &[String],
    secret_env: &[(String, String)],
    stdin_data: Option<&str>,
) -> Result<CliOutput, String> {
    let _guard = CLI_LOCK.lock().map_err(|_| "cli lock poisoned".to_string())?;

    let mut cmd = base_command(paths);
    cmd.args(args);
    for (k, v) in secret_env {
        cmd.env(k, v);
    }
    cmd.stdout(Stdio::piped()).stderr(Stdio::piped());
    if stdin_data.is_some() {
        cmd.stdin(Stdio::piped());
    }
    no_window(&mut cmd);

    let mut child = cmd
        .spawn()
        .map_err(|e| format!("failed to launch zoka: {e}"))?;

    if let Some(data) = stdin_data {
        if let Some(mut stdin) = child.stdin.take() {
            stdin
                .write_all(data.as_bytes())
                .map_err(|e| format!("failed to write to zoka stdin: {e}"))?;
        }
    }

    let out = child
        .wait_with_output()
        .map_err(|e| format!("zoka did not complete: {e}"))?;

    let stdout = String::from_utf8_lossy(&out.stdout).to_string();
    let stderr = String::from_utf8_lossy(&out.stderr).to_string();

    if !out.status.success() {
        let detail = if !stderr.trim().is_empty() {
            stderr.trim().to_string()
        } else {
            stdout.trim().to_string()
        };
        return Err(detail);
    }
    Ok(CliOutput { stdout, stderr })
}

/// Same as `run`, but kills the child and returns an error instead of hanging
/// forever if it doesn't finish within `timeout`. Used for the send path,
/// which does real network work (proving + broadcast): without this, a stuck
/// node (e.g. still syncing, or isolated with no peers) leaves the UI showing
/// "Signing…" indefinitely with no way to know something is wrong.
pub fn run_with_timeout(
    paths: &ZokaPaths,
    args: &[String],
    secret_env: &[(String, String)],
    stdin_data: Option<&str>,
    timeout: Duration,
) -> Result<CliOutput, String> {
    let _guard = CLI_LOCK.lock().map_err(|_| "cli lock poisoned".to_string())?;

    let mut cmd = base_command(paths);
    cmd.args(args);
    for (k, v) in secret_env {
        cmd.env(k, v);
    }
    cmd.stdout(Stdio::piped()).stderr(Stdio::piped());
    if stdin_data.is_some() {
        cmd.stdin(Stdio::piped());
    }
    no_window(&mut cmd);

    let mut child = cmd
        .spawn()
        .map_err(|e| format!("failed to launch zoka: {e}"))?;

    if let Some(data) = stdin_data {
        if let Some(mut stdin) = child.stdin.take() {
            stdin
                .write_all(data.as_bytes())
                .map_err(|e| format!("failed to write to zoka stdin: {e}"))?;
        }
    }

    let start = std::time::Instant::now();
    loop {
        match child.try_wait() {
            Ok(Some(_status)) => break,
            Ok(None) => {
                if start.elapsed() > timeout {
                    let _ = child.kill();
                    let _ = child.wait();
                    return Err(format!(
                        "timed out after {}s waiting for zoka to respond — check that the node is connected and caught up",
                        timeout.as_secs()
                    ));
                }
                std::thread::sleep(Duration::from_millis(200));
            }
            Err(e) => return Err(format!("failed to poll zoka: {e}")),
        }
    }

    let out = child
        .wait_with_output()
        .map_err(|e| format!("zoka did not complete: {e}"))?;

    let stdout = String::from_utf8_lossy(&out.stdout).to_string();
    let stderr = String::from_utf8_lossy(&out.stderr).to_string();

    if !out.status.success() {
        let detail = if !stderr.trim().is_empty() {
            stderr.trim().to_string()
        } else {
            stdout.trim().to_string()
        };
        return Err(detail);
    }
    Ok(CliOutput { stdout, stderr })
}

/// Parse the last JSON object/array printed on stdout. Some commands print a
/// human line or two before the `--json` payload, so scan from the end.
pub fn parse_json(stdout: &str) -> Result<Value, String> {
    for line in stdout.lines().rev() {
        let t = line.trim();
        if t.starts_with('{') || t.starts_with('[') {
            if let Ok(v) = serde_json::from_str::<Value>(t) {
                return Ok(v);
            }
        }
    }
    // Fall back to the whole payload (multi-line JSON).
    serde_json::from_str::<Value>(stdout.trim())
        .map_err(|_| format!("no JSON found in zoka output: {}", stdout.trim()))
}

#[derive(Serialize)]
pub struct NodeStatus {
    pub attached: bool,
    pub rpc_url: String,
}

// ---------------------------------------------------------------------------
// Password session
//
// The wallet UI (built for a WASM engine) unlocks once and then operates
// without re-entering the password. The CLI, by contrast, needs the password
// on every call. We bridge that by holding the password in native memory for
// the unlocked session only — never in the webview, never persisted — and
// clearing it on lock. This is where the password lives; the frontend never
// keeps it after handing it over to `unlock`/`restore`.

pub struct Session {
    pub password: String,
    pub address: String,
    pub network: String,
}

static SESSION: Mutex<Option<Session>> = Mutex::new(None);

pub fn set_session(password: String, address: String, network: String) {
    if let Ok(mut guard) = SESSION.lock() {
        *guard = Some(Session {
            password,
            address,
            network,
        });
    }
}

pub fn clear_session() {
    if let Ok(mut guard) = SESSION.lock() {
        *guard = None;
    }
}

/// (password, address, network) for the unlocked wallet, or an error when
/// locked. Callers must never return the password to the frontend.
pub fn session_snapshot() -> Result<(String, String, String), String> {
    let guard = SESSION.lock().map_err(|_| "session lock poisoned".to_string())?;
    match guard.as_ref() {
        Some(s) => Ok((s.password.clone(), s.address.clone(), s.network.clone())),
        None => Err("wallet is locked".to_string()),
    }
}
