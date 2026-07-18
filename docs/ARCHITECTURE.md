# Zoka Web Wallet — Architecture

Non-custodial, privacy-first browser wallet for Zoka Network.

## Layers

```
┌──────────────────────────────────────────┐
│ UI (React + TanStack Router)             │
│  routes/, layouts/, components/          │
├──────────────────────────────────────────┤
│ WalletProvider (session state, auto-lock)│
├──────────────────────────────────────────┤
│ ZokaWalletEngine (interface)             │
│   ├─ MockZokaWalletEngine  ← dev only    │
│   └─ WasmZokaWalletEngine  ← official    │
├──────────────────────────────────────────┤
│ ZokaRpcClient (interface)                │
│   └─ HttpZokaRpcClient / MockZokaRpc     │
├──────────────────────────────────────────┤
│ EncryptedWalletStorage (interface)       │
│   └─ PlaceholderWalletStorage (stub)     │
└──────────────────────────────────────────┘
```

## Boundaries

- **UI never touches key bytes.** The engine exposes an opaque `secretHandle`
  and returns only public addresses and public scan/spend keys.
- **RPC never receives secrets.** Only public compact blocks queries, fee
  estimates, and already-signed transaction bytes cross this boundary.
- **Storage is optional and encrypted.** Ephemeral mode is the default until
  the KDF is finalised with the Zoka team.

## Session lifecycle

`empty` → user creates or restores → `unlocked` → (inactivity or explicit
lock) → `locked` → (unlock or forget) → `unlocked` / `empty`.

`WalletProvider` implements auto-lock and clears the engine's sensitive
state on lock.

## Files to know

- `src/wallet/engine/ZokaWalletEngine.ts` — canonical engine surface.
- `src/wallet/engine/MockZokaWalletEngine.ts` — dev-only implementation.
- `src/wallet/rpc/ZokaRpcClient.ts` — canonical RPC surface.
- `src/wallet/storage/EncryptedWalletStorage.ts` — storage surface.
- `src/wallet/WalletProvider.tsx` — React context + auto-lock.
- `src/wallet/config.ts` — public env-driven config only.
