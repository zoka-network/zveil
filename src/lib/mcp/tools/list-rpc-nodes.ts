import { defineTool } from "@lovable.dev/mcp-js";
import { MOCK_RPC_NODES } from "@/wallet/rpc/HttpZokaRpcClient";

export default defineTool({
  name: "list_rpc_nodes",
  title: "List authorized RPC nodes",
  description:
    "List the authorized Zoka RPC nodes this wallet knows about, with id, label, url, network and official flag.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => ({
    content: [{ type: "text", text: JSON.stringify(MOCK_RPC_NODES, null, 2) }],
    structuredContent: { nodes: MOCK_RPC_NODES },
  }),
});
