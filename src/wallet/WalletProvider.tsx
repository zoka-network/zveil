import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { MockZokaWalletEngine } from "@/wallet/engine/MockZokaWalletEngine";
import type { DerivedWallet, ZokaWalletEngine } from "@/wallet/engine/ZokaWalletEngine";
import { MockZokaRpcClient } from "@/wallet/rpc/HttpZokaRpcClient";
import type { RpcNode, ZokaRpcClient } from "@/wallet/rpc/ZokaRpcClient";
import { authorizedNodes, zokaConfig } from "@/wallet/config";
import {
  clearSession,
  clearStoredWallet,
  loadSession,
  loadStoredNodeId,
  loadStoredWallet,
  persistNodeId,
  persistSession,
  persistWallet,
} from "@/wallet/storage/localWallet";


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
  /** Non-null when localStorage has data that could not be parsed. */
  storageError: string | null;

  /** True when the pre-lock confirmation dialog should be shown. */
  lockWarningVisible: boolean;
  /** Whole seconds remaining before auto-lock fires (0 when hidden). */
  secondsUntilLock: number;

  unlockWithWallet: (w: DerivedWallet) => void;
  lock: () => void;
  forget: () => void;
  setActiveNode: (id: string) => void;
  toggleBalanceHidden: () => void;
  bumpActivity: () => void;
  /** Dismiss the lock warning and restart the inactivity timer. */
  stayUnlocked: () => void;
}

const WalletContext = createContext<WalletState | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const engineRef = useRef<ZokaWalletEngine>(new MockZokaWalletEngine());

  // Restore the last selected RPC node (if any) — falls back to default.
  const [activeNodeId, setActiveNodeId] = useState<string>(() => {
    const stored = loadStoredNodeId();
    if (stored && authorizedNodes.some((n) => n.id === stored)) return stored;
    return authorizedNodes[1].id;
  });
  const activeNode = useMemo(
    () => authorizedNodes.find((n) => n.id === activeNodeId) ?? authorizedNodes[0],
    [activeNodeId],
  );
  const rpcRef = useRef<ZokaRpcClient>(new MockZokaRpcClient(activeNode));

  useEffect(() => {
    rpcRef.current = new MockZokaRpcClient(activeNode);
    persistNodeId(activeNode.id);
  }, [activeNode]);

  const [wallet, setWallet] = useState<DerivedWallet | null>(null);
  const [status, setStatus] = useState<WalletStatus>("empty");
  const [balanceHidden, setBalanceHidden] = useState(true);
  const [hasStoredWallet, setHasStoredWallet] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  // On mount, restore any wallet previously created on this device.
  // If a session marker is present AND the last activity is still within the
  // auto-lock window, restore the unlocked state so a page reload does not
  // force the user to re-unlock. The password is NEVER persisted.
  useEffect(() => {
    const result = loadStoredWallet();
    if (result.kind === "ok") {
      setWallet(result.wallet);
      setHasStoredWallet(true);
      const session = loadSession();
      const now = Date.now();
      if (session && now - session.lastActivity < zokaConfig.autoLockMs) {
        lastActivityRef.current = session.lastActivity;
        setStatus("unlocked");
      } else {
        if (session) clearSession();
        setStatus("locked");
      }
    } else if (result.kind === "corrupt") {
      setStorageError(result.reason);
    }
  }, []);

  const unlockWithWallet = useCallback((w: DerivedWallet) => {
    setWallet(w);
    setStatus("unlocked");
    setHasStoredWallet(true);
    setStorageError(null);
    persistWallet(w);
    const now = Date.now();
    lastActivityRef.current = now;
    persistSession(now);
  }, []);

  const lock = useCallback(() => {
    engineRef.current.destroySensitiveState();
    clearSession();
    setStatus((s) => (s === "unlocked" ? "locked" : s));
  }, []);

  const forget = useCallback(() => {
    engineRef.current.destroySensitiveState();
    clearStoredWallet();
    clearSession();
    setWallet(null);
    setStatus("empty");
    setHasStoredWallet(false);
    setStorageError(null);
  }, []);

  const [lockWarningVisible, setLockWarningVisible] = useState(false);
  const [secondsUntilLock, setSecondsUntilLock] = useState(0);
  const lockWarningRef = useRef(false);

  const bumpActivity = useCallback(() => {
    // Ignore ambient activity while the confirmation dialog is up — the user
    // must explicitly choose "Stay signed in" or "Lock now".
    if (lockWarningRef.current) return;
    const now = Date.now();
    lastActivityRef.current = now;
    persistSession(now);
  }, []);

  const stayUnlocked = useCallback(() => {
    const now = Date.now();
    lastActivityRef.current = now;
    persistSession(now);
    lockWarningRef.current = false;
    setLockWarningVisible(false);
    setSecondsUntilLock(0);
  }, []);

  useEffect(() => {
    if (status !== "unlocked") {
      lockWarningRef.current = false;
      setLockWarningVisible(false);
      setSecondsUntilLock(0);
      return;
    }
    const tick = () => {
      const idle = Date.now() - lastActivityRef.current;
      const { autoLockMs, warnBeforeLockMs } = zokaConfig;
      if (idle >= autoLockMs) {
        lockWarningRef.current = false;
        setLockWarningVisible(false);
        setSecondsUntilLock(0);
        lock();
        return;
      }
      if (idle >= autoLockMs - warnBeforeLockMs) {
        lockWarningRef.current = true;
        setLockWarningVisible(true);
        setSecondsUntilLock(Math.max(0, Math.ceil((autoLockMs - idle) / 1000)));
      } else {
        if (lockWarningRef.current) {
          lockWarningRef.current = false;
          setLockWarningVisible(false);
          setSecondsUntilLock(0);
        }
      }
    };
    tick();
    const interval = setInterval(tick, 1_000);
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
    storageError,
    lockWarningVisible,
    secondsUntilLock,
    unlockWithWallet,
    lock,
    forget,
    setActiveNode: setActiveNodeId,
    toggleBalanceHidden: () => setBalanceHidden((v) => !v),
    bumpActivity,
    stayUnlocked,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletState {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}
