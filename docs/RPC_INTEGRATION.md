# RPC Integration

`ZokaRpcClient` is the only channel from the wallet to a Zoka node. Every
concrete implementation MUST:

- Reject responses that don't match the expected schema (use zod when wiring).
- Time out requests (recommend 10s default, configurable).
- Retry with capped exponential backoff — never infinite.
- Refuse block ranges larger than a configured cap.
- Refuse responses claiming a different `network` / `chainId` than the
  currently selected node.
- Never send any private key, scan key, mnemonic, or password.

## Endpoints (placeholder — awaiting official docs)

The real Zoka node method names and payload shapes are unknown to this
codebase. `HttpZokaRpcClient` (currently mock) enumerates the calls the
wallet needs; the real HTTP wiring will map each to whatever the node
exposes.

## Environment variables

Public only:

```
VITE_ZOKA_NETWORK           # "mainnet" | "testnet" | "devnet"
VITE_ZOKA_DEFAULT_RPC       # https://rpc.zoka.network
VITE_ZOKA_EXPLORER_URL      # https://explorer.zoka.network
VITE_ZOKA_ADDRESS_PREFIX    # e.g. "zoka1"
VITE_ZOKA_CHAIN_ID
```

No secrets belong here.

## Network-switch safety

When the user switches nodes, the wallet must:

1. Refetch `getNetworkInfo` for the new node.
2. Reject signing/broadcast if the built transaction was prepared against a
   different network than the currently selected node.
