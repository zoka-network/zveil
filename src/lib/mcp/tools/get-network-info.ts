import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { MockZokaRpcClient, MOCK_RPC_NODES } from "@/wallet/rpc/HttpZokaRpcClient";

export default defineTool({
  name: "get_network_info",
  title: "Get Zoka network info",
  description:
    "Return public network metadata (network name, chain id, node version, address prefix) for a Zoka RPC node. Uses mock RPC data — no wallet secrets are ever accessed.",
  inputSchema: {
    node_id: z
      .enum(["mock-mainnet", "mock-testnet", "mock-local"])
      .default("mock-testnet")
      .describe("Which authorized RPC node to query."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ node_id }) => {
    const node = MOCK_RPC_NODES.find((n) => n.id === node_id) ?? MOCK_RPC_NODES[1];
    const info = await new MockZokaRpcClient(node).getNetworkInfo();
    return {
      content: [{ type: "text", text: JSON.stringify(info, null, 2) }],
      structuredContent: { node: { id: node.id, label: node.label, url: node.url }, info },
    };
  },
});
