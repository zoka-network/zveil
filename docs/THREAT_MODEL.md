# Threat Model

Assets to protect: seed phrase, private spend key, private scan key, wallet
password, decrypted transactions.

## Threats

| # | Threat                       | Mitigation                                                                 |
|---|------------------------------|----------------------------------------------------------------------------|
| 1 | XSS                          | No `dangerouslySetInnerHTML`. Strict CSP in production. No CDN scripts.    |
| 2 | Supply-chain (npm)           | Minimal deps. Pin lockfile. Periodic `bun audit`.                          |
| 3 | Malicious browser extension  | Warn users to use a clean profile. Signed builds. Show canonical URL.      |
| 4 | Clipboard hijacking          | Warn on copy. Recommend visual verification of address prefix/suffix.      |
| 5 | Malicious RPC node           | Schema validation. Chain-id / network cross-check. Fee sanity bounds.      |
| 6 | Phishing                     | Fixed origin. Encourage bookmarking. Warn on domain mismatch (future).     |
| 7 | DNS compromise               | HSTS + signed WASM hash verification (future).                             |
| 8 | Seed leaked via screenshot   | Hidden by default. Reveal is one-shot with explicit action.                |
| 9 | Browser memory disclosure    | Zero out Uint8Array secrets. Lock on inactivity. Best-effort only.         |
|10 | Stale service worker cache   | No service worker registered.                                              |
|11 | Sensitive data in logs       | No sensitive values passed to `reportAppError`.                            |
|12 | Analytics leakage            | No analytics, no third-party tracking, no session recording.               |
|13 | Duplicate transactions       | Per-operation local id; disabled buttons during broadcast.                 |
|14 | Wrong network broadcast      | Chain-id check before signing; UI shows network on confirmation.           |
|15 | Local tampering (device)     | Password-encrypted container (future); user education.                     |

## Out of scope (documented, not solved)

- Physical device compromise.
- Malicious user hardware / firmware.
- Endpoint malware capable of reading DOM/memory.

## Pre-mainnet checklist

- [ ] WASM engine integrated and reproducible build documented.
- [ ] Independent security audit.
- [ ] Encrypted storage KDF locked in.
- [ ] Strict CSP verified in production.
- [ ] Signed release + hash publication process.
- [ ] Bug bounty program live.
