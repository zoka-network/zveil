/**
 * MockZokaRpcClient — returns simulated network data for UI development.
 *
 * The real client (HttpZokaRpcClient) must use the endpoint names,
 * request formats and response schemas defined by the official Zoka node.
 */

import type {
  BroadcastAck,
  CompactBlock,
  FeeEstimate,
  RpcNode,
  ZokaNetworkInfo,
  ZokaRpcClient,
} from "./ZokaRpcClient";

export const MOCK_RPC_NODES: readonly RpcNode[] = [
  {
    id: "mock-mainnet",
    label: "Zoka Mainnet (mock)",
    url: "https://rpc.mock.zoka.network",
    network: "mainnet",
    official: true,
  },
  {
    id: "mock-testnet",
    label: "Zoka Testnet (mock)",
    url: "https://rpc-testnet.mock.zoka.network",
    network: "testnet",
    official: true,
  },
  {
    id: "mock-local",
    label: "Local devnet (mock)",
    url: "http://127.0.0.1:38081",
    network: "devnet",
    official: false,
  },
];

export class MockZokaRpcClient implements ZokaRpcClient {
  readonly endpoint: string;
  private readonly network: ZokaNetworkInfo["network"];
  private readonly startHeight = 812_400;
  private readonly startedAt = Date.now();

  constructor(node: RpcNode) {
    this.endpoint = node.url;
    this.network = node.network;
  }

  async getNetworkInfo(): Promise<ZokaNetworkInfo> {
    await this.delay();
    return {
      network: this.network,
      chainId: `zoka-${this.network}-mock`,
      nodeVersion: "0.0.0-mock",
      addressPrefix: "zoka1",
    };
  }

  async getBlockHeight(): Promise<number> {
    await this.delay();
    // simulate ~1 block per 10s
    const elapsed = Math.floor((Date.now() - this.startedAt) / 10_000);
    return this.startHeight + elapsed;
  }

  async getCompactBlocks(from: number, to: number): Promise<readonly CompactBlock[]> {
    await this.delay();
    const blocks: CompactBlock[] = [];
    for (let h = from; h <= to && blocks.length < 128; h++) {
      blocks.push({
        height: h,
        hash: `mockhash_${h}`,
        timestamp: this.startedAt + h * 10_000,
        payload: "",
      });
    }
    return blocks;
  }

  async getFeeEstimate(): Promise<FeeEstimate> {
    await this.delay();
    return { low: "500", normal: "1000", high: "2000", unit: "atomic" };
  }

  async broadcastTransaction(_raw: string): Promise<BroadcastAck> {
    await this.delay(400);
    return {
      txId: crypto.randomUUID().replace(/-/g, ""),
      acceptedAt: Date.now(),
    };
  }

  private delay(ms = 120) {
    return new Promise((r) => setTimeout(r, ms));
  }
}
