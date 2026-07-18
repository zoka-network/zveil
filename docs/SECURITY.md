# Zoka Web Wallet — Security Model

## Non-negotiables

The following data MUST never leave the user's browser:

- Seed phrase / mnemonic
- Private spend key
- Private scan key
- Wallet password (used to derive the KDF key)
- Any decrypted key material

They must not appear in:

- Network requests to Supabase, Lovable Cloud, analytics, or any server
- URL parameters or hash fragments
- Console logs, error reports, or breadcrumbs
- `localStorage`, `sessionStorage`, `IndexedDB` as plaintext
- Screenshots or session recordings

The Zoka RPC node only receives:

- Public queries (network info, block height, compact blocks, fee estimate)
- Already-signed, serialized transaction bytes

## Session security

- Auto-lock after configurable inactivity (default 5 min).
- Locking calls `engine.destroySensitiveState()` and drops the derived
  wallet from React state.
- No service worker registered — an outdated cached JS/WASM bundle would be
  a cryptographic risk. Revisit once safe update semantics are designed.

## Storage

Two modes:

1. **Ephemeral** (default today): nothing persisted. Tab close = wallet gone.
2. **Device** (future): seed encrypted with Web Crypto (AES-GCM) using a key
   derived by an approved KDF (Argon2id or scrypt — awaiting Zoka spec).
   Random salt + IV per container. Password never stored.

## What is intentionally NOT in this app

- No email/password account.
- No cloud sync of wallet, keys, contacts, notes, or history.
- No analytics, pixels, Hotjar, third-party scripts.
- No `dangerouslySetInnerHTML`.
- No mainnet enablement until WASM engine is wired and audited.

## Reporting

`reportLovableError` is the platform's error reporter. Sensitive values must
never be passed to it. Prefer generic messages ("failed to sign") over
including any transaction/secret detail.
