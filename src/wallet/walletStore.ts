/**
 * Enumerates every wallet already stored in the shared native store (the same
 * store ZSilent uses) — not just the one wallet Zveil currently has active.
 * This is what powers the wallet switcher: it reflects the real state on
 * disk, so a wallet created in ZSilent shows up here too.
 */

import { invoke } from "@tauri-apps/api/core";

import { zokaConfig } from "@/wallet/config";
import { isDesktop } from "@/wallet/runtime";

export interface StoredWalletSummary {
  readonly address: string;
  readonly name: string;
  readonly balanceAtoms: string;
}

interface WalletsResponse {
  private_wallets?: Array<{
    address: string;
    name: string;
    balance_atoms?: number;
  }>;
}

export async function listStoredWallets(): Promise<StoredWalletSummary[]> {
  if (!isDesktop()) return [];
  try {
    const res = await invoke<WalletsResponse>("list_wallets", { network: zokaConfig.network });
    return (res.private_wallets ?? []).map((w) => ({
      address: w.address,
      name: w.name,
      balanceAtoms: String(w.balance_atoms ?? 0),
    }));
  } catch {
    return [];
  }
}

export interface WalletHistoryEntry {
  readonly txHash: string;
  /** "pending (private)" | "verified" | "confirmed (private)" | "failed" */
  readonly status: string;
  /** Unix seconds. */
  readonly timestamp: number;
  readonly outputs: number;
}

interface WalletHistoryResponse {
  transactions?: Array<{
    tx_hash: string;
    status: string;
    timestamp: number;
    outputs: number;
  }>;
}

/**
 * History for the currently unlocked wallet. `wallet-history --json` hides
 * amounts and direction by design (the CLI's own privacy defaults) — only
 * hash/status/timestamp/output-count are available without deeper decoding.
 */
export async function fetchWalletHistory(): Promise<WalletHistoryEntry[]> {
  if (!isDesktop()) return [];
  try {
    const res = await invoke<WalletHistoryResponse>("wallet_history", {});
    return (res.transactions ?? []).map((t) => ({
      txHash: t.tx_hash,
      status: t.status,
      timestamp: t.timestamp,
      outputs: t.outputs,
    }));
  } catch {
    return [];
  }
}
