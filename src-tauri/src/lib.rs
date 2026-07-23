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

use node::NodeManager;
use tor::TorManager;

/// Returns the native shell version so the UI can prove it is running inside
/// the packaged desktop app rather than a plain browser tab.
#[tauri::command]
fn shell_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(NodeManager::default())
        .manage(TorManager::default())
        .invoke_handler(tauri::generate_handler![
            shell_version,
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
        .build(tauri::generate_context!())
        .expect("error while building the Zoka Wallet application")
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
