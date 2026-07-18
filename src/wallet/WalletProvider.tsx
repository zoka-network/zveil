import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { MockZokaWalletEngine } from "@/wallet/engine/MockZokaWalletEngine";
import type { DerivedWallet, ZokaWalletEngine } from "@/wallet/engine/ZokaWalletEngine";
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

  unlockWithWallet: (w: DerivedWallet) => void;
  lock: () => void;
  forget: () => void;
  setActiveNode: (id: string) => void;
  toggleBalanceHidden: () => void;
  bumpActivity: () => void;
}

const WalletContext = createContext<WalletState | null>(null);

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
  const lastActivityRef = useRef<number>(Date.now());

  const unlockWithWallet = useCallback((w: DerivedWallet) => {
    setWallet(w);
    setStatus("unlocked");
    lastActivityRef.current = Date.now();
  }, []);

  const lock = useCallback(() => {
    engineRef.current.destroySensitiveState();
    setStatus((s) => (s === "unlocked" ? "locked" : s));
  }, []);

  const forget = useCallback(() => {
    engineRef.current.destroySensitiveState();
    setWallet(null);
    setStatus("empty");
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
