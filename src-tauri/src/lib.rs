// Zoka Wallet — Tauri backend.
//
// The UI is a static SPA; every wallet action it takes is a `#[tauri::command]`
// that shells out to the native `zoka` binary (see `commands` / `zoka`). No
// key material, scanning, proving or signing happens in this shell or in the
// webview — only in `zoka`. When no node is running the shell also supervises
// its own `zoka fullnode` (see `node`), optionally over Tor (see `tor`).

mod commands;
mod node;
mod tor;
mod zoka;

use tauri::Emitter;

use node::NodeManager;
use tor::TorManager;

/// Returns the native shell version so the UI can prove it is running inside
/// the packaged desktop app rather than a plain browser tab.
#[tauri::command]
fn shell_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

/// Forces the window closed once the frontend's confirmation dialog has been
/// accepted. `destroy()` bypasses `CloseRequested` — calling `.close()`
/// instead would just re-trigger the interception below and reopen the same
/// dialog forever.
#[tauri::command]
fn force_close(window: tauri::Window) {
    let _ = window.destroy();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(NodeManager::default())
        .manage(TorManager::default())
        .invoke_handler(tauri::generate_handler![
            shell_version,
            force_close,
            commands::node_status,
            commands::chain_height,
            commands::generate_seed,
            commands::list_wallets,
            commands::restore_wallet,
            commands::unlock_wallet,
            commands::lock_wallet,
            commands::receive_address,
            commands::wallet_balance,
            commands::wallet_history,
            commands::send_transaction,
            node::start_node,
            node::stop_node,
            node::node_run_state,
            tor::start_tor,
            tor::stop_tor,
            tor::tor_state,
        ])
        // Intercepted once, permanently, at the Rust level rather than from a
        // JS-side listener the frontend would have to keep registered — that
        // approach turned out fragile (a missed re-registration silently
        // stopped intercepting the close button, with no visible error, and
        // once the window was gone there was nothing left to reattach it to).
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.emit("close-requested", ());
            }
        })
        .build(tauri::generate_context!())
        .expect("error while running the Zoka Wallet application")
        .run(|app_handle, event| {
            // Tear down any node/Tor processes we started when the app exits, so
            // nothing is left holding the database or a socket.
            if let tauri::RunEvent::Exit = event {
                use tauri::Manager;
                app_handle.state::<NodeManager>().kill();
                app_handle.state::<TorManager>().kill();
            }
        });
}
