// Managed local node.
//
// When no node answers on the RPC port, the wallet starts its own
// `zoka fullnode --no-mine` so a user who only installed the wallet (no
// ZSilent) can still reach the serverless network. The node bootstraps its
// chain over iroh (QUIC hole-punching, no open port) and then serves RPC on
// 127.0.0.1:3000, which every wallet command attaches to.
//
// If a node is already running (e.g. ZSilent), we never start a second one —
// two nodes on the same RocksDB would collide on its exclusive lock.

use std::fs;
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;

use serde::Serialize;
use serde_json::Value;
use tauri::{AppHandle, State};

use crate::zoka::{self, ZokaPaths};

// Throwaway identity for the embedded node. This is NOT the user's wallet
// password: the node wallet holds no funds and never mines. The user's real
// wallet is separate and encrypted with their own password.
const NODE_PASSWORD: &str = "zoka-wallet-embedded-node";
const NODE_PW_ENV: &str = "ZOKA_WALLET_NODE_PASSWORD";

#[derive(Default)]
pub struct NodeManager {
    child: Mutex<Option<Child>>,
}

impl NodeManager {
    /// Requests termination of the node process this manager itself spawned
    /// (identified by its own `Child` handle, never by name — this can never
    /// touch a separately-running `zoka.exe`, e.g. one launched by ZSilent).
    /// Does not wait for the OS to finish reaping it: on app exit this runs on
    /// the main event loop, and blocking there while a process takes a moment
    /// to die is what made Windows show a "not responding" prompt on close.
    /// `kill()` alone still guarantees the process receives a terminate
    /// request; the OS reclaims it independently of whether this app is still
    /// running to observe that.
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
pub struct NodeRunState {
    /// A node (ours or another process's) answers on the RPC port.
    pub attached: bool,
    /// We launched and are supervising the node process.
    pub managed: bool,
    /// The node has written its ready-file (chain caught up enough to serve).
    pub ready: bool,
}

fn wallet_dir(paths: &ZokaPaths) -> PathBuf {
    let dir = paths.home.join("zoka-wallet");
    let _ = fs::create_dir_all(&dir);
    dir
}

fn ready_file(paths: &ZokaPaths) -> PathBuf {
    wallet_dir(paths).join("fullnode-ready.json")
}

#[cfg(windows)]
fn no_window(cmd: &mut Command) {
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x0800_0000;
    cmd.creation_flags(CREATE_NO_WINDOW);
}

#[cfg(not(windows))]
fn no_window(_cmd: &mut Command) {}

/// Start the embedded node if none is running. `tor_proxy` (e.g.
/// "127.0.0.1:19050") routes the node's peer traffic through Tor when set;
/// `tor_only` forbids any clearnet peer. Returns the current run state.
#[tauri::command]
pub fn start_node(
    app: AppHandle,
    state: State<'_, NodeManager>,
    tor_proxy: Option<String>,
    tor_only: bool,
) -> Result<NodeRunState, String> {
    if zoka::local_node_running() {
        return Ok(NodeRunState {
            attached: true,
            managed: state.holds_child(),
            ready: ready_file(&zoka::resolve_paths(&app)?).exists(),
        });
    }

    // Reap a dead child before starting a new one.
    if state.holds_child() {
        let mut guard = state.child.lock().map_err(|_| "node lock poisoned".to_string())?;
        if let Some(child) = guard.as_mut() {
            if matches!(child.try_wait(), Ok(Some(_))) {
                *guard = None;
            } else {
                // Still starting up; nothing to do.
                return Ok(NodeRunState { attached: false, managed: true, ready: false });
            }
        }
    }

    let paths = zoka::resolve_paths(&app)?;
    let dir = wallet_dir(&paths);
    let ready = ready_file(&paths);
    let _ = fs::remove_file(&ready);
    let log = dir.join("node.log");
    let log_out = fs::File::create(&log).map_err(|e| format!("cannot open node log: {e}"))?;
    let log_err = log_out
        .try_clone()
        .map_err(|e| format!("cannot open node log: {e}"))?;

    let mut cmd = Command::new(&paths.binary);
    cmd.env("ZOKA_HOME", &paths.home);
    cmd.env(NODE_PW_ENV, NODE_PASSWORD);
    if let Some(cfg) = &paths.network_config {
        cmd.env("ZOKA_NETWORK_CONFIG", cfg);
        cmd.env("ZOKA_MAINNET_NETWORK_CONFIG", cfg);
    }
    cmd.arg("fullnode")
        .args(["--network", "mainnet"])
        .args(["--password-env", NODE_PW_ENV])
        .arg("--allow-isolated-start")
        .args(["--sync-warmup-secs", "30"])
        .args(["--ready-file"])
        .arg(&ready)
        .arg("--no-mine")
        .args(["--min-mine-peers", "1"])
        .arg("--serve-iroh-snapshot");
    if let Some(cfg) = &paths.network_config {
        cmd.args(["--network-config"]).arg(cfg);
    }
    if let Some(proxy) = tor_proxy.as_deref().filter(|p| !p.is_empty()) {
        cmd.args(["--tor-proxy", proxy]);
        if tor_only {
            cmd.arg("--tor-only");
        }
    }
    cmd.stdin(Stdio::null())
        .stdout(Stdio::from(log_out))
        .stderr(Stdio::from(log_err));
    no_window(&mut cmd);

    let child = cmd.spawn().map_err(|e| format!("failed to start node: {e}"))?;
    *state.child.lock().map_err(|_| "node lock poisoned".to_string())? = Some(child);

    Ok(NodeRunState { attached: false, managed: true, ready: false })
}

/// Asks an attached (not self-managed) node whether it's caught up, via
/// `zoka rpc-status --json`. Best-effort: any failure to launch, parse, or a
/// short timeout just reads as "not ready yet" rather than an error, since
/// this is polled every few seconds and a single hiccup shouldn't flip the
/// UI to an error state.
fn remote_node_is_ready(paths: &ZokaPaths) -> bool {
    let args = vec![
        "rpc-status".to_string(),
        "--rpc".to_string(),
        "http://127.0.0.1:3000".to_string(),
        "--json".to_string(),
    ];
    let Ok(out) = zoka::run(paths, &args, &[], None) else {
        return false;
    };
    let Ok(json) = zoka::parse_json(&out.stdout) else {
        return false;
    };
    json.get("health")
        .and_then(|h| h.get("ready"))
        .and_then(Value::as_bool)
        .unwrap_or(false)
}

/// Stop the embedded node if we started one. A node we merely attached to
/// (e.g. ZSilent's) is left untouched.
#[tauri::command]
pub fn stop_node(state: State<'_, NodeManager>) {
    state.kill();
}

/// Current node run state for the UI's connection indicator.
///
/// "ready" has two different sources depending on who owns the node:
/// - We spawned it ourselves (`managed`): the ready-file our own `start_node`
///   passed via `--ready-file` is the fast, subprocess-free signal.
/// - We attached to a node someone else started (e.g. ZSilent's): that
///   process writes to *its own* ready-file path, which we have no reason to
///   know — checking ours here always came back false, so the UI was stuck
///   showing "Syncing" forever even on a fully caught-up node. Ask the node
///   directly instead, via the same `rpc-status` the rest of this bridge
///   already shells out through.
#[tauri::command]
pub fn node_run_state(app: AppHandle, state: State<'_, NodeManager>) -> Result<NodeRunState, String> {
    let paths = zoka::resolve_paths(&app)?;
    let attached = zoka::local_node_running();
    let managed = state.holds_child();
    let ready = if managed {
        ready_file(&paths).exists()
    } else if attached {
        remote_node_is_ready(&paths)
    } else {
        false
    };
    Ok(NodeRunState {
        attached,
        managed,
        ready,
    })
}
