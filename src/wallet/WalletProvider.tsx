import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { MockZokaWalletEngine } from "@/wallet/engine/MockZokaWalletEngine";
import type { DerivedWallet, OpaqueKey, ZokaWalletEngine } from "@/wallet/engine/ZokaWalletEngine";
import { MockZokaRpcClient } from "@/wallet/rpc/HttpZokaRpcClient";
import type { RpcNode, ZokaRpcClient } from "@/wallet/rpc/ZokaRpcClient";
import { authorizedNodes, zokaConfig } from "@/wallet/config";

export type WalletStatus = "empty" | "unlocked" | "locked";

interface WalletState {
  status: WalletStatus;
  wallet: DerivedWallet | null;
  engine: ZokaWalletEngine;
  rpc: ZokaRpcClient;
  activeNode: RpcNode;
  nodes: readonly RpcNode[];
  balanceHidden: boolean;
  hasStoredWallet: boolean;

  unlockWithWallet: (w: DerivedWallet) => void;
  lock: () => void;
  forget: () => void;
  setActiveNode: (id: string) => void;
  toggleBalanceHidden: () => void;
  bumpActivity: () => void;
}

const WalletContext = createContext<WalletState | null>(null);

/**
 * Persistence marker for the CURRENT development stage.
 *
 * ⚠️  This is NOT the production storage format. The production build must
 * persist an encrypted container produced by EncryptedWalletStorage and
 * require the user's password to unlock. Here we only remember the public
 * portion of the derived wallet so the UI can route the user back to their
 * existing wallet instead of offering to create a new one.
 */
const STORAGE_KEY = "zoka.wallet.public.v0";

interface StoredPublicWallet {
  readonly primaryAddress: { value: string; index?: number };
  readonly publicScanKey: string;
  readonly publicSpendKey: string;
}

function loadStoredWallet(): DerivedWallet | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredPublicWallet;
    // Rebuild a placeholder opaque handle. The mock engine does not
    // dereference it; the real WASM engine will require a proper unlock
    // flow that produces a fresh handle from the encrypted container.
    const secretHandle = { __opaque: "zoka-opaque-key" } as unknown as OpaqueKey;
    return { ...parsed, secretHandle };
  } catch {
    return null;
  }
}

function persistWallet(w: DerivedWallet): void {
  if (typeof window === "undefined") return;
  const payload: StoredPublicWallet = {
    primaryAddress: { value: w.primaryAddress.value, index: w.primaryAddress.index },
    publicScanKey: w.publicScanKey,
    publicSpendKey: w.publicSpendKey,
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function clearStoredWallet(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const engineRef = useRef<ZokaWalletEngine>(new MockZokaWalletEngine());
  const [activeNodeId, setActiveNodeId] = useState<string>(authorizedNodes[1].id);
  const activeNode = useMemo(
    () => authorizedNodes.find((n) => n.id === activeNodeId) ?? authorizedNodes[0],
    [activeNodeId],
  );
  const rpcRef = useRef<ZokaRpcClient>(new MockZokaRpcClient(activeNode));

  useEffect(() => {
    rpcRef.current = new MockZokaRpcClient(activeNode);
  }, [activeNode]);

  const [wallet, setWallet] = useState<DerivedWallet | null>(null);
  const [status, setStatus] = useState<WalletStatus>("empty");
  const [balanceHidden, setBalanceHidden] = useState(true);
  const [hasStoredWallet, setHasStoredWallet] = useState(false);
  const lastActivityRef = useRef<number>(Date.now());

  // On mount, restore any wallet previously created on this device.
  // The wallet lands in "locked" state — the user must explicitly unlock it.
  useEffect(() => {
    const stored = loadStoredWallet();
    if (stored) {
      setWallet(stored);
      setStatus("locked");
      setHasStoredWallet(true);
    }
  }, []);

  const unlockWithWallet = useCallback((w: DerivedWallet) => {
    setWallet(w);
    setStatus("unlocked");
    setHasStoredWallet(true);
    persistWallet(w);
    lastActivityRef.current = Date.now();
  }, []);

  const lock = useCallback(() => {
    engineRef.current.destroySensitiveState();
    setStatus((s) => (s === "unlocked" ? "locked" : s));
  }, []);

  const forget = useCallback(() => {
    engineRef.current.destroySensitiveState();
    clearStoredWallet();
    setWallet(null);
    setStatus("empty");
    setHasStoredWallet(false);
  }, []);

  const bumpActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  // Auto-lock inactivity timer
  useEffect(() => {
    if (status !== "unlocked") return;
    const interval = setInterval(() => {
      if (Date.now() - lastActivityRef.current > zokaConfig.autoLockMs) {
        lock();
      }
    }, 5_000);
    const activity = () => bumpActivity();
    window.addEventListener("mousemove", activity, { passive: true });
    window.addEventListener("keydown", activity);
    window.addEventListener("touchstart", activity, { passive: true });
    return () => {
      clearInterval(interval);
      window.removeEventListener("mousemove", activity);
      window.removeEventListener("keydown", activity);
      window.removeEventListener("touchstart", activity);
    };
  }, [status, lock, bumpActivity]);

  const value: WalletState = {
    status,
    wallet,
    engine: engineRef.current,
    rpc: rpcRef.current,
    activeNode,
    nodes: authorizedNodes,
    balanceHidden,
    hasStoredWallet,
    unlockWithWallet,
    lock,
    forget,
    setActiveNode: setActiveNodeId,
    toggleBalanceHidden: () => setBalanceHidden((v) => !v),
    bumpActivity,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletState {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}
