/**
 * Runtime selection: the production (native) engine and RPC client when running
 * inside the Tauri desktop shell, the mock ones when running in a plain browser
 * (Lovable preview / `vite dev`). Detection uses the Tauri global so no network
 * or async probe is needed.
 */

import { MockZokaWalletEngine } from "@/wallet/engine/MockZokaWalletEngine";
import { TauriZokaWalletEngine } from "@/wallet/engine/TauriZokaWalletEngine";
import type { ZokaWalletEngine } from "@/wallet/engine/ZokaWalletEngine";
import { MockZokaRpcClient } from "@/wallet/rpc/HttpZokaRpcClient";
import { TauriZokaRpcClient } from "@/wallet/rpc/TauriZokaRpcClient";
import type { RpcNode, ZokaRpcClient } from "@/wallet/rpc/ZokaRpcClient";

export function isDesktop(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export function createEngine(): ZokaWalletEngine {
  return isDesktop() ? new TauriZokaWalletEngine() : new MockZokaWalletEngine();
}

export function createRpcClient(node: RpcNode): ZokaRpcClient {
  return isDesktop() ? new TauriZokaRpcClient(node) : new MockZokaRpcClient(node);
}
