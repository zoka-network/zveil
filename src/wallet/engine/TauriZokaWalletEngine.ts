/**
 * TauriZokaWalletEngine — the production engine.
 *
 * Every method delegates to the native `zoka` binary through Tauri commands
 * (see src-tauri/src/commands.rs). No cryptography, key handling or address
 * encoding happens in TypeScript: the browser only ever sees public data and
 * the recovery phrase the user is already looking at.
 *
 * The password is handed to `restoreWallet`/`unlock` once and then lives in the
 * native session (src-tauri/src/zoka.rs); later reads and the send flow carry
 * no password across this boundary.
 */

import { invoke } from "@tauri-apps/api/core";

import { zokaConfig } from "@/wallet/config";
import type {
  BuildTransactionParams,
  DerivedWallet,
  Mnemonic,
  OpaqueKey,
  ProvedZokaTransaction,
  ScanWalletParams,
  ScanWalletResult,
  SignedZokaTransaction,
  UnsignedZokaTransaction,
  ZokaWalletEngine,
} from "./ZokaWalletEngine";

// Each import/create gets a unique store name so it never collides with an
// existing wallet (e.g. one already created by ZSilent). The wallet is tracked
// by its address afterwards, not by this name.
function uniqueWalletName(): string {
  return `zveil-${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;
}

// build/prove/sign are one atomic `zoka send` on the native side; carry the
// recipient and amount forward through the intermediate objects so signing has
// everything it needs.
interface PendingTx {
  readonly recipient: string;
  readonly amount: string;
}
type CarryingUnsigned = UnsignedZokaTransaction & { readonly __pending: PendingTx };
type CarryingProved = ProvedZokaTransaction & { readonly __pending: PendingTx };

interface WalletRecord {
  address: string;
  name?: string;
  balance?: string;
  balance_atoms?: number;
  locked_balance?: string;
  total_balance?: string;
  tx_count?: number;
}

function opaque(): OpaqueKey {
  // The real secret keys never leave the native session; this is only a token
  // the UI can hold without meaning anything.
  return { __opaque: "zoka-opaque-key" } as OpaqueKey;
}

function toDerived(record: WalletRecord): DerivedWallet {
  return {
    primaryAddress: { value: record.address, index: 0 },
    // Public sub-keys are not surfaced by the CLI; the UI does not render them.
    publicScanKey: "",
    publicSpendKey: "",
    secretHandle: opaque(),
  };
}

export class TauriZokaWalletEngine implements ZokaWalletEngine {
  readonly kind = "wasm" as const;

  private readonly network = zokaConfig.network;

  async generateWallet(wordCount: 12 | 24 = 24): Promise<Mnemonic> {
    const res = await invoke<{ recovery_phrase: string; seed_words: number }>("generate_seed", {
      words: wordCount,
    });
    return { phrase: res.recovery_phrase, wordCount: res.seed_words };
  }

  async validateMnemonic(mnemonic: string): Promise<boolean> {
    const words = mnemonic.trim().split(/\s+/).filter(Boolean);
    return words.length === 12 || words.length === 24;
  }

  async restoreWallet(mnemonic: string, password?: string): Promise<DerivedWallet> {
    if (!password) throw new Error("a password is required to create the wallet");
    const record = await invoke<WalletRecord>("restore_wallet", {
      phrase: mnemonic.trim(),
      password,
      name: uniqueWalletName(),
      network: this.network,
    });
    return toDerived(record);
  }

  deriveWallet(mnemonic: string, password?: string): Promise<DerivedWallet> {
    return this.restoreWallet(mnemonic, password);
  }

  async unlock(address: string, password: string): Promise<boolean> {
    try {
      await invoke<WalletRecord>("unlock_wallet", {
        address,
        password,
        network: this.network,
      });
      return true;
    } catch {
      return false;
    }
  }

  async scanWallet(params: ScanWalletParams): Promise<ScanWalletResult> {
    // `balance --json` returns integer atom counts (balance_atoms etc.) plus
    // pre-formatted strings. Always use the atom counts — the formatted string
    // drops the fractional part for whole numbers, which then reads as atoms.
    const bal = await invoke<{
      balance_atoms?: number;
      locked_balance_atoms?: number;
      total_balance_atoms?: number;
    }>("wallet_balance", {});
    return {
      detectedOutputs: [],
      lastScannedHeight: params.toHeight,
      balanceAvailable: String(bal.balance_atoms ?? 0),
      balancePending: String(bal.locked_balance_atoms ?? 0),
    };
  }

  async buildTransaction(params: BuildTransactionParams): Promise<UnsignedZokaTransaction> {
    const pending: PendingTx = { recipient: params.recipient.value, amount: params.amount };
    const unsigned: CarryingUnsigned = {
      __brand: "UnsignedZokaTransaction",
      // The real fee is applied by `zoka send`; shown as pending until then.
      fee: "0",
      total: params.amount,
      summary: { recipient: params.recipient.value, amount: params.amount },
      __pending: pending,
    };
    return unsigned;
  }

  async proveTransaction(tx: UnsignedZokaTransaction): Promise<ProvedZokaTransaction> {
    // The proof is generated inside `zoka send` (in signTransaction); this step
    // only forwards the pending transfer.
    const proved: CarryingProved = {
      __brand: "ProvedZokaTransaction",
      __pending: (tx as CarryingUnsigned).__pending,
    };
    return proved;
  }

  async signTransaction(tx: ProvedZokaTransaction): Promise<SignedZokaTransaction> {
    const pending = (tx as CarryingProved).__pending;
    if (!pending) throw new Error("no pending transaction to sign");
    // This shells out to `zoka send`, which builds, proves, signs AND
    // broadcasts. The RPC broadcast step in the UI is therefore a no-op.
    const res = await invoke<{ tx_id?: string; txid?: string; raw?: string }>("send_transaction", {
      to: pending.recipient,
      amount: pending.amount,
    });
    const txId = res.tx_id ?? res.txid ?? res.raw ?? "";
    return { __brand: "SignedZokaTransaction", raw: txId, txId };
  }

  async validateAddress(address: string): Promise<boolean> {
    // Canonical validation happens in `zoka send`; this is a cheap format gate.
    return /^zka1[A-Za-z0-9]{40,}$/.test(address.trim());
  }

  destroySensitiveState(): void {
    void invoke("lock_wallet").catch(() => {});
  }
}
