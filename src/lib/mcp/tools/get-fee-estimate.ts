import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { MockZokaRpcClient, MOCK_RPC_NODES } from "@/wallet/rpc/HttpZokaRpcClient";

export default defineTool({
  name: "get_fee_estimate",
  title: "Get transaction fee estimate",
  description:
    "Return low/normal/high fee estimates in atomic units for a Zoka RPC node. Public data — no wallet interaction.",
  inputSchema: {
    node_id: z
      .enum(["mock-mainnet", "mock-testnet", "mock-local"])
      .default("mock-testnet")
      .describe("Which authorized RPC node to query."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ node_id }) => {
    const node = MOCK_RPC_NODES.find((n) => n.id === node_id) ?? MOCK_RPC_NODES[1];
    const fee = await new MockZokaRpcClient(node).getFeeEstimate();
    return {
      content: [{ type: "text", text: JSON.stringify(fee, null, 2) }],
      structuredContent: { node_id: node.id, fee },
    };
  },
});
