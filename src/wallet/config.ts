import type { RpcNode } from "@/wallet/rpc/ZokaRpcClient";
import { MOCK_RPC_NODES } from "@/wallet/rpc/HttpZokaRpcClient";

/**
 * All secrets stay client-side. These are PUBLIC config values only.
 * Read from Vite env when provided.
 */
export const zokaConfig = {
  network: (import.meta.env.VITE_ZOKA_NETWORK as string) ?? "mainnet",
  defaultRpc: (import.meta.env.VITE_ZOKA_DEFAULT_RPC as string) ?? MOCK_RPC_NODES[1].url,
  explorerUrl: (import.meta.env.VITE_ZOKA_EXPLORER_URL as string) ?? "",
  addressPrefix: (import.meta.env.VITE_ZOKA_ADDRESS_PREFIX as string) ?? "zoka1",
  chainId: (import.meta.env.VITE_ZOKA_CHAIN_ID as string) ?? "",

  /** Auto-lock after N ms of inactivity. */
  autoLockMs: 5 * 60 * 1000,
  /** Show a confirmation dialog this many ms before auto-lock fires. */
  warnBeforeLockMs: 60 * 1000,
};

export const authorizedNodes: readonly RpcNode[] = MOCK_RPC_NODES;
