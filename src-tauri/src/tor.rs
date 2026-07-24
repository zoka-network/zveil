// Tor supervisor.
//
// Runs Tor with a SOCKS proxy the node routes its peer traffic through.
// Outbound-only (SOCKS) is enough for a wallet: we do not need to be a
// reachable inbound peer, so no hidden service is configured. The node is
// launched with `--tor-proxy 127.0.0.1:19050` (and `--tor-only` for strict
// privacy); see node.rs.
//
// On Windows we bundle a checksum-pinned `tor.exe` (see the parent repo's
// managed-Tor docs), same as ZSilent. On Linux we deliberately don't: `tor`
// is a well-maintained distro package almost everywhere, and depending on it
// means its security updates land through the user's normal package manager
// instead of waiting on us to re-verify and re-bundle a new Expert Bundle.

use std::fs;
use std::io::Write;
use std::net::{SocketAddr, TcpStream};
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::time::Duration;

use serde::Serialize;
use tauri::{AppHandle, Manager, State};

use crate::zoka;

pub const SOCKS_HOST: &str = "127.0.0.1";
pub const SOCKS_PORT: u16 = 19050;

#[derive(Default)]
pub struct TorManager {
    child: Mutex<Option<Child>>,
}

impl TorManager {
    /// Requests termination of the Tor process this manager itself spawned
    /// (identified by its own `Child` handle, never by name — this can never
    /// touch a separately-running `tor.exe`, e.g. one launched by ZSilent).
    /// Does not block waiting for it to fully exit; see NodeManager::kill for
    /// why (avoids a "not responding" prompt on close).
    pub fn kill(&self) {
        if let Ok(mut guard) = self.child.lock() {
            if let Some(mut child) = guard.take() {
                let _ = child.kill();
            }
        }
    }

    fn holds_child(&self) -> bool {
        self.child.lock().map(|g| g.is_some()).unwrap_or(false)
    }
}

#[derive(Serialize)]
pub struct TorState {
    pub running: bool,
    pub socks_proxy: String,
}

fn socks_ready() -> bool {
    let addr = SocketAddr::from(([127, 0, 0, 1], SOCKS_PORT));
    TcpStream::connect_timeout(&addr, Duration::from_millis(400)).is_ok()
}

/// Search `$PATH` for `name`, the same resolution a shell would do. Used on
/// Linux, where we deliberately don't bundle our own `tor` (see module docs
/// on why Windows does) and instead rely on the distro's package, which gets
/// its own security updates independent of our release cadence.
fn find_in_path(name: &str) -> Option<PathBuf> {
    let path_var = std::env::var_os("PATH")?;
    std::env::split_paths(&path_var)
        .map(|dir| dir.join(name))
        .find(|candidate| candidate.is_file())
}

fn tor_binary(app: &AppHandle) -> Result<PathBuf, String> {
    let name = if cfg!(windows) { "tor.exe" } else { "tor" };
    let mut candidates: Vec<PathBuf> = Vec::new();
    if let Ok(p) = std::env::var("ZOKA_WALLET_TOR_BIN") {
        candidates.push(PathBuf::from(p));
    }
    if let Ok(rd) = app.path().resource_dir() {
        candidates.push(rd.join("tor").join(name));
    }
    // Dev fallback: the parent ZOKA repo's third-party Tor bundle.
    if let Ok(exe) = std::env::current_exe() {
        if let Some(repo) = exe.ancestors().nth(5) {
            candidates.push(repo.join("third_party/tor/windows-x86_64").join(name));
        }
    }
    if let Some(found) = candidates.into_iter().find(|p| p.exists()) {
        return Ok(found);
    }
    // Linux/macOS: no bundled binary shipped, so fall back to a system
    // install (e.g. `apt install tor`). Not offered on Windows, where there
    // is no equivalent package manager convention to rely on.
    if !cfg!(windows) {
        if let Some(system) = find_in_path(name) {
            return Ok(system);
        }
    }
    Err("tor binary not found (bundled resource missing, and no system tor on PATH)".to_string())
}

fn tor_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let paths = zoka::resolve_paths(app)?;
    let dir = paths.home.join("zoka-wallet").join("tor");
    fs::create_dir_all(&dir).map_err(|e| format!("cannot create tor dir: {e}"))?;
    Ok(dir)
}

fn write_torrc(dir: &PathBuf) -> Result<PathBuf, String> {
    let data_dir = dir.join("data");
    fs::create_dir_all(&data_dir).map_err(|e| format!("cannot create tor data dir: {e}"))?;
    let torrc = dir.join("torrc");
    let body = format!(
        "SocksPort {SOCKS_HOST}:{SOCKS_PORT}\n\
         DataDirectory {}\n\
         Log notice file {}\n\
         ClientOnly 1\n",
        data_dir.display(),
        dir.join("tor.log").display(),
    );
    let mut f = fs::File::create(&torrc).map_err(|e| format!("cannot write torrc: {e}"))?;
    f.write_all(body.as_bytes())
        .map_err(|e| format!("cannot write torrc: {e}"))?;
    Ok(torrc)
}

#[cfg(windows)]
fn no_window(cmd: &mut Command) {
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x0800_0000;
    cmd.creation_flags(CREATE_NO_WINDOW);
}

#[cfg(not(windows))]
fn no_window(_cmd: &mut Command) {}

/// Start Tor if it is not already up. Returns once the process is spawned; the
/// SOCKS port becomes reachable a moment later as Tor bootstraps.
#[tauri::command]
pub fn start_tor(app: AppHandle, state: State<'_, TorManager>) -> Result<TorState, String> {
    let proxy = format!("{SOCKS_HOST}:{SOCKS_PORT}");
    if socks_ready() {
        return Ok(TorState { running: true, socks_proxy: proxy });
    }
    if state.holds_child() {
        return Ok(TorState { running: false, socks_proxy: proxy });
    }

    let binary = tor_binary(&app)?;
    let dir = tor_dir(&app)?;
    let torrc = write_torrc(&dir)?;

    let mut cmd = Command::new(&binary);
    cmd.arg("-f").arg(&torrc);
    cmd.stdin(Stdio::null()).stdout(Stdio::null()).stderr(Stdio::null());
    no_window(&mut cmd);

    let child = cmd.spawn().map_err(|e| format!("failed to start tor: {e}"))?;
    *state.child.lock().map_err(|_| "tor lock poisoned".to_string())? = Some(child);

    Ok(TorState { running: false, socks_proxy: proxy })
}

#[tauri::command]
pub fn stop_tor(state: State<'_, TorManager>) {
    state.kill();
}

#[tauri::command]
pub fn tor_state(_state: State<'_, TorManager>) -> TorState {
    TorState {
        running: socks_ready(),
        socks_proxy: format!("{SOCKS_HOST}:{SOCKS_PORT}"),
    }
}
