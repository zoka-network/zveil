import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { DerivedWallet, ZokaWalletEngine } from "@/wallet/engine/ZokaWalletEngine";
import type { RpcNode, ZokaRpcClient } from "@/wallet/rpc/ZokaRpcClient";
import { createEngine, createRpcClient } from "@/wallet/runtime";
import { isDesktop } from "@/wallet/runtime";
import {
  nodeRunState,
  startConnectivity,
  type NodeRunState,
} from "@/wallet/nodeControl";
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
  /** Connection state of the local node (attached/managed/ready). */
  nodeState: NodeRunState;
  balanceHidden: boolean;
  hasStoredWallet: boolean;
  /** Non-null when localStorage has data that could not be parsed. */
  storageError: string | null;

  /** True when the pre-lock confirmation dialog should be shown. */
  lockWarningVisible: boolean;
  /** Whole seconds remaining before auto-lock fires (0 when hidden). */
  secondsUntilLock: number;

  unlockWithWallet: (w: DerivedWallet) => void;
  /** Verify the password and re-establish the session for the stored wallet. */
  unlockSession: (password: string) => Promise<boolean>;
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
  const engineRef = useRef<ZokaWalletEngine>(createEngine());

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
  const rpcRef = useRef<ZokaRpcClient>(createRpcClient(activeNode));

  useEffect(() => {
    rpcRef.current = createRpcClient(activeNode);
    persistNodeId(activeNode.id);
  }, [activeNode]);

  const [wallet, setWallet] = useState<DerivedWallet | null>(null);
  const [status, setStatus] = useState<WalletStatus>("empty");
  const [nodeState, setNodeState] = useState<NodeRunState>({
    attached: false,
    managed: false,
    ready: false,
  });

  // On desktop, bring up (or attach to) a node and keep its status fresh so the
  // UI can show the connection state. In the browser preview this is a no-op.
  useEffect(() => {
    if (!isDesktop()) {
      setNodeState({ attached: true, managed: false, ready: true });
      return;
    }
    let alive = true;
    void startConnectivity()
      .then((s) => alive && setNodeState(s))
      .catch(() => {});
    const iv = setInterval(() => {
      void nodeRunState().then((s) => alive && setNodeState(s));
    }, 5000);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, []);
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

  // Re-establish the native crypto session for the stored wallet. Resolves
  // false when the password is wrong, so the locked screen can show an error.
  const unlockSession = useCallback(
    async (password: string): Promise<boolean> => {
      if (!wallet) return false;
      const ok = await engineRef.current.unlock(wallet.primaryAddress.value, password);
      if (ok) {
        setStatus("unlocked");
        const now = Date.now();
        lastActivityRef.current = now;
        persistSession(now);
      }
      return ok;
    },
    [wallet],
  );

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
    nodeState,
    balanceHidden,
    hasStoredWallet,
    storageError,
    lockWarningVisible,
    secondsUntilLock,
    unlockWithWallet,
    unlockSession,
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
