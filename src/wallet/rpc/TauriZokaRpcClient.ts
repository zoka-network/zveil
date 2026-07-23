/**
 * TauriZokaRpcClient — talks to the local node (ours or ZSilent's) through the
 * native backend. Chain reads and scanning happen inside `zoka`; this client
 * only surfaces the few network figures the UI shows and terminates the send
 * flow.
 */

import { invoke } from "@tauri-apps/api/core";

import { zokaConfig } from "@/wallet/config";
import type {
  BroadcastAck,
  CompactBlock,
  FeeEstimate,
  RpcNode,
  ZokaNetworkInfo,
  ZokaRpcClient,
} from "./ZokaRpcClient";

export class TauriZokaRpcClient implements ZokaRpcClient {
  readonly endpoint: string;
  private readonly network: ZokaNetworkInfo["network"];

  constructor(node: RpcNode) {
    this.endpoint = node.url;
    this.network = node.network;
  }

  async getNetworkInfo(): Promise<ZokaNetworkInfo> {
    return {
      network: this.network,
      chainId: zokaConfig.chainId,
      nodeVersion: "",
      addressPrefix: zokaConfig.addressPrefix,
    };
  }

  async getBlockHeight(): Promise<number> {
    return invoke<number>("chain_height", {});
  }

  async getCompactBlocks(): Promise<readonly CompactBlock[]> {
    // Scanning is done natively inside `zoka`; the UI never walks blocks itself.
    return [];
  }

  async getFeeEstimate(): Promise<FeeEstimate> {
    // The real fee is applied by `zoka send`; these are indicative figures.
    return { low: "0", normal: "0", high: "0", unit: "atomic" };
  }

  async broadcastTransaction(rawTransaction: string): Promise<BroadcastAck> {
    // No-op: `signTransaction` already ran `zoka send`, which broadcasts. The
    // raw value we were handed is the tx id from that step.
    return { txId: rawTransaction, acceptedAt: Date.now() };
  }
}
