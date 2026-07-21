import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { MockZokaRpcClient, MOCK_RPC_NODES } from "@/wallet/rpc/HttpZokaRpcClient";

export default defineTool({
  name: "get_block_height",
  title: "Get current block height",
  description:
    "Return the current tip block height for a Zoka RPC node. Public chain data only.",
  inputSchema: {
    node_id: z
      .enum(["mock-mainnet", "mock-testnet", "mock-local"])
      .default("mock-testnet")
      .describe("Which authorized RPC node to query."),
  },
  annotations: { readOnlyHint: true, idempotentHint: false, openWorldHint: false },
  handler: async ({ node_id }) => {
    const node = MOCK_RPC_NODES.find((n) => n.id === node_id) ?? MOCK_RPC_NODES[1];
    const height = await new MockZokaRpcClient(node).getBlockHeight();
    return {
      content: [{ type: "text", text: `Block height on ${node.label}: ${height}` }],
      structuredContent: { node_id: node.id, height },
    };
  },
});
