/**
 * Control of the embedded node and Tor from the UI. All calls are no-ops in a
 * plain browser (the mock preview): only the packaged desktop app runs a node.
 */

import { invoke } from "@tauri-apps/api/core";

import { isDesktop } from "@/wallet/runtime";

export interface NodeRunState {
  attached: boolean;
  managed: boolean;
  ready: boolean;
}

export interface TorState {
  running: boolean;
  socks_proxy: string;
}

const TOR_PREF_KEY = "zoka.privacy.tor";
const TOR_ONLY_PREF_KEY = "zoka.privacy.torOnly";

export function getTorEnabled(): boolean {
  return typeof localStorage !== "undefined" && localStorage.getItem(TOR_PREF_KEY) === "1";
}
export function setTorEnabled(on: boolean): void {
  localStorage.setItem(TOR_PREF_KEY, on ? "1" : "0");
}
export function getTorOnly(): boolean {
  return typeof localStorage !== "undefined" && localStorage.getItem(TOR_ONLY_PREF_KEY) === "1";
}
export function setTorOnly(on: boolean): void {
  localStorage.setItem(TOR_ONLY_PREF_KEY, on ? "1" : "0");
}

const OFFLINE: NodeRunState = { attached: false, managed: false, ready: false };
const TOR_OFF: TorState = { running: false, socks_proxy: "" };

export async function nodeRunState(): Promise<NodeRunState> {
  if (!isDesktop()) return { attached: true, managed: false, ready: true };
  try {
    return await invoke<NodeRunState>("node_run_state");
  } catch {
    return OFFLINE;
  }
}

export async function torStatus(): Promise<TorState> {
  if (!isDesktop()) return TOR_OFF;
  try {
    return await invoke<TorState>("tor_state");
  } catch {
    return TOR_OFF;
  }
}

/** Start Tor and wait (briefly) for the SOCKS port to accept connections. */
async function ensureTor(): Promise<string> {
  await invoke<TorState>("start_tor");
  for (let i = 0; i < 40; i++) {
    const st = await torStatus();
    if (st.running) return st.socks_proxy;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("Tor did not become ready");
}

/**
 * Bring up connectivity: if Tor is enabled, start it first and route the node
 * through it; otherwise start the node directly. A node already running (ours
 * or ZSilent's) is reused, never duplicated.
 */
export async function startConnectivity(): Promise<NodeRunState> {
  if (!isDesktop()) return { attached: true, managed: false, ready: true };
  let torProxy: string | undefined;
  const torOnly = getTorOnly();
  if (getTorEnabled()) {
    torProxy = await ensureTor();
  }
  return invoke<NodeRunState>("start_node", { torProxy, torOnly });
}

export async function stopConnectivity(): Promise<void> {
  if (!isDesktop()) return;
  await invoke("stop_node").catch(() => {});
  await invoke("stop_tor").catch(() => {});
}

/** Apply a change to the Tor setting by restarting the node accordingly. */
export async function restartConnectivity(): Promise<NodeRunState> {
  if (!isDesktop()) return { attached: true, managed: false, ready: true };
  await invoke("stop_node").catch(() => {});
  if (!getTorEnabled()) {
    await invoke("stop_tor").catch(() => {});
  }
  return startConnectivity();
}
