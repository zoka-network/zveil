import { defineMcp } from "@lovable.dev/mcp-js";
import getNetworkInfo from "./tools/get-network-info";
import getBlockHeight from "./tools/get-block-height";
import getFeeEstimate from "./tools/get-fee-estimate";
import listRpcNodes from "./tools/list-rpc-nodes";
import validateAddress from "./tools/validate-address";

export default defineMcp({
  name: "zoka-web-wallet-mcp",
  title: "Zoka Web Wallet",
  version: "0.1.0",
  instructions:
    "Public, read-only tools for Zoka Network: query authorized RPC nodes for network info, block height and fee estimates, and sanity-check address formats. This server exposes NO wallet secrets, seeds, keys, balances or transaction history — the wallet is non-custodial and lives only in the user's browser.",
  tools: [getNetworkInfo, getBlockHeight, getFeeEstimate, listRpcNodes, validateAddress],
});
