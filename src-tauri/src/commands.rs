// Tauri commands the wallet UI invokes. Each one shells out to the native
// `zoka` binary through the bridge in `zoka.rs`. No cryptography lives here or
// in the frontend: keys, scanning, proofs and signing all happen inside `zoka`.
//
// The password is entered once at unlock/restore and then held in the native
// session (see `zoka::Session`); read/spend commands take no password argument
// and pull it from there.

use serde_json::{json, Value};
use tauri::AppHandle;

use crate::zoka::{self, NodeStatus};

// Passwords and seeds are handed to the child via env/stdin, never argv.
const PW_ENV: &str = "ZOKA_WALLET_PASSWORD";

fn s(v: &str) -> String {
    v.to_string()
}

/// Whether a local node (ours or ZSilent's) is up, so the UI can show the
/// connection state and know that balance/send will reach the chain.
#[tauri::command]
pub fn node_status() -> NodeStatus {
    let attached = zoka::local_node_running();
    NodeStatus {
        attached,
        rpc_url: if attached {
            "http://127.0.0.1:3000".to_string()
        } else {
            String::new()
        },
    }
}

/// Current chain height as seen by the attached node. Returns 0 when no node
/// is up, so the UI can render a "connecting" state instead of failing.
#[tauri::command]
pub fn chain_height(app: AppHandle) -> Result<u64, String> {
    if !zoka::local_node_running() {
        return Ok(0);
    }
    let paths = zoka::resolve_paths(&app)?;
    let args = vec![
        s("rpc-height"),
        s("--rpc"),
        s("http://127.0.0.1:3000"),
        s("--json"),
    ];
    let out = match zoka::run(&paths, &args, &[], None) {
        Ok(o) => o,
        Err(_) => return Ok(0),
    };
    let v = zoka::parse_json(&out.stdout).unwrap_or(Value::Null);
    let height = v
        .get("height")
        .or_else(|| v.get("local_height"))
        .and_then(Value::as_u64)
        .unwrap_or(0);
    Ok(height)
}

/// Generate a fresh recovery phrase. Offline; no wallet is persisted yet.
#[tauri::command]
pub fn generate_seed(app: AppHandle, words: u32) -> Result<Value, String> {
    let words = if words == 12 { 12 } else { 24 };
    let paths = zoka::resolve_paths(&app)?;
    let args = vec![
        s("wallet-generate-seed"),
        s("--seed-words"),
        words.to_string(),
        s("--json"),
    ];
    let out = zoka::run(&paths, &args, &[], None)?;
    zoka::parse_json(&out.stdout)
}

/// List locally stored wallets with their cached balances.
#[tauri::command]
pub fn list_wallets(app: AppHandle, network: String) -> Result<Value, String> {
    let paths = zoka::resolve_paths(&app)?;
    let args = vec![s("wallets"), s("--network"), network, s("--json")];
    let out = zoka::run(&paths, &args, &[], None)?;
    zoka::parse_json(&out.stdout)
}

/// Restore/derive a wallet from a recovery phrase and persist it encrypted with
/// `password`. Used for both "create new" (generate a phrase, then restore it)
/// and "restore existing". On success the session is unlocked for that wallet.
#[tauri::command]
pub fn restore_wallet(
    app: AppHandle,
    phrase: String,
    password: String,
    name: String,
    network: String,
) -> Result<Value, String> {
    let paths = zoka::resolve_paths(&app)?;
    let args = vec![
        s("wallet-restore-from-seed"),
        s("--seed-stdin"),
        s("--password-env"),
        s(PW_ENV),
        s("--name"),
        name.clone(),
        s("--network"),
        network.clone(),
    ];
    let out = zoka::run(
        &paths,
        &args,
        &[(s(PW_ENV), password.clone())],
        Some(phrase.trim()),
    )?;

    // The restore prints "Address: zka1...". Read the address straight from its
    // output rather than by name — the caller passes a unique name, and the
    // same keys may already be stored under a different name (e.g. from
    // ZSilent), in which case `wallets` lists it under that other name.
    let address = parse_address(&out.stdout)
        .ok_or_else(|| format!("wallet restored but no address was returned: {}", out.stdout.trim()))?;

    zoka::set_session(password, address.clone(), network.clone());

    // Best-effort balance record; fall back to a minimal one if the listing
    // does not surface it (dedup, timing, etc.).
    let wallets = list_wallets(app, network)?;
    let record = find_wallet_by_address(&wallets, &address).unwrap_or_else(|| {
        json!({ "address": address, "name": name, "balance": "0", "balance_atoms": 0 })
    });
    Ok(record)
}

/// Pull the first `zka1...` address out of CLI output.
fn parse_address(text: &str) -> Option<String> {
    for line in text.lines() {
        if let Some(idx) = line.find("zka1") {
            let addr: String = line[idx..]
                .chars()
                .take_while(|c| c.is_ascii_alphanumeric())
                .collect();
            if addr.len() > 20 {
                return Some(addr);
            }
        }
    }
    None
}

/// Verify a password against a stored wallet and unlock the session. Returns
/// the wallet record. A wrong password fails the underlying decrypt and errors.
#[tauri::command]
pub fn unlock_wallet(
    app: AppHandle,
    address: String,
    password: String,
    network: String,
) -> Result<Value, String> {
    let paths = zoka::resolve_paths(&app)?;
    // `receive` has to decrypt the wallet to produce its address, so it is a
    // cheap, offline password check.
    let args = vec![
        s("receive"),
        address.clone(),
        s("--network"),
        network.clone(),
        s("--password-env"),
        s(PW_ENV),
        s("--json"),
    ];
    zoka::run(&paths, &args, &[(s(PW_ENV), password.clone())], None)
        .map_err(|_| "incorrect password".to_string())?;

    zoka::set_session(password, address.clone(), network.clone());

    let wallets = list_wallets(app, network)?;
    find_wallet_by_address(&wallets, &address)
        .ok_or_else(|| "wallet unlocked but could not be read back".to_string())
}

/// Clear the in-memory password session.
#[tauri::command]
pub fn lock_wallet() {
    zoka::clear_session();
}

/// Receiving address details for the unlocked wallet.
#[tauri::command]
pub fn receive_address(app: AppHandle) -> Result<Value, String> {
    let (password, address, network) = zoka::session_snapshot()?;
    let paths = zoka::resolve_paths(&app)?;
    let args = vec![
        s("receive"),
        address,
        s("--network"),
        network,
        s("--password-env"),
        s(PW_ENV),
        s("--json"),
    ];
    let out = zoka::run(&paths, &args, &[(s(PW_ENV), password)], None)?;
    zoka::parse_json(&out.stdout)
}

/// Live balance for the unlocked wallet via the attached node's RPC.
#[tauri::command]
pub fn wallet_balance(app: AppHandle) -> Result<Value, String> {
    let (password, address, network) = zoka::session_snapshot()?;
    let paths = zoka::resolve_paths(&app)?;
    let args = vec![
        s("balance"),
        address,
        s("--network"),
        network,
        s("--password-env"),
        s(PW_ENV),
        s("--json"),
    ];
    let out = zoka::run(&paths, &args, &[(s(PW_ENV), password)], None)?;
    zoka::parse_json(&out.stdout)
}

/// Transaction history for the unlocked wallet.
#[tauri::command]
pub fn wallet_history(app: AppHandle) -> Result<Value, String> {
    let (password, address, network) = zoka::session_snapshot()?;
    let paths = zoka::resolve_paths(&app)?;
    let args = vec![
        s("wallet-history"),
        s("--address"),
        address,
        s("--network"),
        network,
        s("--password-env"),
        s(PW_ENV),
        s("--json"),
    ];
    let out = zoka::run(&paths, &args, &[(s(PW_ENV), password)], None)?;
    zoka::parse_json(&out.stdout)
}

/// Build, prove, sign and broadcast a private transfer from the unlocked
/// wallet. Slow path: the zk proof is generated inside `zoka`.
#[tauri::command]
pub fn send_transaction(app: AppHandle, to: String, amount: String) -> Result<Value, String> {
    let (password, from, network) = zoka::session_snapshot()?;
    let paths = zoka::resolve_paths(&app)?;
    let args = vec![
        s("send"),
        s("--from"),
        from,
        s("--to"),
        to,
        s("--amount"),
        amount,
        s("--network"),
        network,
        s("--password-env"),
        s(PW_ENV),
        s("--yes"),
        s("--json"),
    ];
    // Proving + broadcast do real network work; cap it instead of letting the
    // UI hang forever if the node is stuck (e.g. still syncing, no peers).
    let out = zoka::run_with_timeout(
        &paths,
        &args,
        &[(s(PW_ENV), password)],
        None,
        std::time::Duration::from_secs(90),
    )?;
    zoka::parse_json(&out.stdout)
        .or_else(|_| Ok(json!({ "raw": out.stdout.trim() })))
}

fn find_wallet_by_address(wallets: &Value, address: &str) -> Option<Value> {
    wallets
        .get("private_wallets")?
        .as_array()?
        .iter()
        .find(|w| w.get("address").and_then(Value::as_str) == Some(address))
        .cloned()
}
