/**
 * ZokaRpcClient — canonical interface for talking to a Zoka node.
 *
 * The real endpoint names, request formats and response shapes are
 * Zoka-specific and MUST come from the official node documentation. The
 * placeholders in HttpZokaRpcClient exist only to compile — never assume
 * they match a real Zoka node.
 *
 * The private scan key, private spend key and mnemonic are NEVER passed
 * to this client. Only public data and already-signed transactions cross
 * this boundary.
 */

export interface ZokaNetworkInfo {
  readonly network: "mainnet" | "testnet" | "devnet" | "unknown";
  readonly chainId: string;
  readonly nodeVersion: string;
  readonly addressPrefix: string;
}

export interface CompactBlock {
  readonly height: number;
  readonly hash: string;
  readonly timestamp: number;
  /** Opaque payload — parsed by the Zoka WASM engine, not by the UI. */
  readonly payload: string;
}

export interface FeeEstimate {
  readonly low: string;
  readonly normal: string;
  readonly high: string;
  readonly unit: "atomic";
}

export interface BroadcastAck {
  readonly txId: string;
  readonly acceptedAt: number;
}

export interface ZokaRpcClient {
  readonly endpoint: string;
  getNetworkInfo(): Promise<ZokaNetworkInfo>;
  getBlockHeight(): Promise<number>;
  getCompactBlocks(fromHeight: number, toHeight: number): Promise<readonly CompactBlock[]>;
  getFeeEstimate(): Promise<FeeEstimate>;
  broadcastTransaction(rawTransaction: string): Promise<BroadcastAck>;
}

export interface RpcNode {
  readonly id: string;
  readonly label: string;
  readonly url: string;
  readonly network: ZokaNetworkInfo["network"];
  readonly official: boolean;
}
