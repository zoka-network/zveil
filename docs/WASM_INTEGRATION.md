# WASM Integration

The definitive `ZokaWalletEngine` implementation is `WasmZokaWalletEngine`.
It delegates every canonical operation to the official Zoka Rust core
compiled to WebAssembly. Until that bundle is available, only the mock
engine is wired in and the UI displays:

> Development mode — cryptographic engine not connected.

## Expected pipeline

1. Zoka team publishes the Rust crate exposing (at minimum):
   - `generate_mnemonic`, `validate_mnemonic`
   - `derive_wallet` (returns primary address + public keys + opaque secret)
   - `scan_blocks` (compact blocks → detected outputs + nullifiers)
   - `build_transaction`, `prove_transaction`, `sign_transaction`
   - `validate_address`
2. Build with:

   ```bash
   wasm-pack build --target web --release
   ```

3. Place artifacts:
   - `public/wasm/zoka_core_bg.wasm`
   - `src/wasm/zoka_core.js` and `src/wasm/zoka_core_bg.js` (co-located)
4. In `zoka_core.js`, set the default WASM URL to `/wasm/zoka_core_bg.wasm`.
5. Implement `WasmZokaWalletEngine` methods by calling the exports.
6. Feature-flag replacement:

   ```ts
   const engine: ZokaWalletEngine = import.meta.env.VITE_ZOKA_USE_WASM
     ? new WasmZokaWalletEngine()
     : new MockZokaWalletEngine();
   ```

## Rules

- Never re-implement Zoka cryptography in TypeScript.
- Never call `ethers`, `bitcoinjs`, `@solana/web3`, `bip32`, `bip39`,
  `@noble/secp256k1`, etc. as a substitute.
- Zero out returned key buffers immediately (`Uint8Array.fill(0)`).
- Do not enable mainnet UI until the WASM bundle is integrated AND audited.
