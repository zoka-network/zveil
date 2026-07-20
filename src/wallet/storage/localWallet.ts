/**
 * Client-side persistence helpers for the CURRENT development stage.
 *
 * ⚠️  These are NOT the production storage format. See EncryptedWalletStorage
 * for the encrypted container that will be used once the KDF is defined.
 */
import type { DerivedWallet, OpaqueKey } from "@/wallet/engine/ZokaWalletEngine";

export const STORAGE_KEY = "zoka.wallet.public.v0";
export const NODE_KEY = "zoka.wallet.node.v0";

export interface StoredPublicWallet {
  readonly primaryAddress: { value: string; index?: number };
  readonly publicScanKey: string;
  readonly publicSpendKey: string;
}

export type LoadResult =
  | { kind: "empty" }
  | { kind: "ok"; wallet: DerivedWallet }
  | { kind: "corrupt"; reason: string };

function isValidPayload(x: unknown): x is StoredPublicWallet {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  const addr = o.primaryAddress as Record<string, unknown> | undefined;
  return (
    typeof o.publicScanKey === "string" &&
    o.publicScanKey.length > 0 &&
    typeof o.publicSpendKey === "string" &&
    o.publicSpendKey.length > 0 &&
    !!addr &&
    typeof addr.value === "string" &&
    addr.value.length > 0
  );
}

export function hasStoredWalletSync(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STORAGE_KEY) !== null;
}

export function loadStoredWallet(): LoadResult {
  if (typeof window === "undefined") return { kind: "empty" };
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return { kind: "empty" };
  try {
    const parsed = JSON.parse(raw);
    if (!isValidPayload(parsed)) {
      return { kind: "corrupt", reason: "Missing or invalid fields in stored wallet." };
    }
    const secretHandle = { __opaque: "zoka-opaque-key" } as unknown as OpaqueKey;
    return {
      kind: "ok",
      wallet: {
        primaryAddress: parsed.primaryAddress,
        publicScanKey: parsed.publicScanKey,
        publicSpendKey: parsed.publicSpendKey,
        secretHandle,
      },
    };
  } catch (e) {
    return { kind: "corrupt", reason: e instanceof Error ? e.message : "Unreadable JSON." };
  }
}

export function persistWallet(w: DerivedWallet): void {
  if (typeof window === "undefined") return;
  const payload: StoredPublicWallet = {
    primaryAddress: { value: w.primaryAddress.value, index: w.primaryAddress.index },
    publicScanKey: w.publicScanKey,
    publicSpendKey: w.publicSpendKey,
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function clearStoredWallet(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export function loadStoredNodeId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(NODE_KEY);
}

export function persistNodeId(id: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(NODE_KEY, id);
}
