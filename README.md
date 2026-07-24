<p align="center">
  <img src="src-tauri/icons/128x128@2x.png" width="128" height="128" alt="Zveil" />
</p>

<h1 align="center">Zveil</h1>

<p align="center">
  Private, non-custodial desktop wallet for <a href="https://zoka.network">Zoka Network</a>.
</p>

<p align="center">
  <a href="https://github.com/ZokaNetwork/zveil/releases/latest">Download</a> ·
  <a href="https://discord.com/invite/rg55f7drKc">Discord</a> ·
  <a href="https://x.com/zokanetwork">X / Twitter</a>
</p>

---

Zveil is a lightweight desktop wallet for Zoka's zero-knowledge private
transactions. It's a thin, native shell around the same `zoka` engine that
powers the full node ([ZSilent Core](https://github.com/ZokaNetwork/zsilent-core))
— no reimplementation of wallet logic, no keys ever handled outside that
engine.

## What it does

- **Create or restore** a private wallet from a 12/24-word seed phrase.
- **Send and receive** shielded ZKA transfers — amounts, senders and
  recipients stay private on-chain.
- **Attaches to a node you already have running** (e.g. ZSilent) instead of
  competing with it for the chain database, or launches its own if none is
  found.
- **Optional Tor** routing for network privacy.
- Nothing leaves your machine: no telemetry, no accounts, no cloud sync.

## Why it's separate from ZSilent

ZSilent Core is the full control center — node, miner, wallet, network
diagnostics. Zveil is just the wallet, for anyone who wants a small app to
send and receive privately without running a full node UI alongside it. Both
talk to the same local `zoka` node when one is present.

## Install

Prebuilt installers are on the
[Releases page](https://github.com/ZokaNetwork/zveil/releases/latest):

| Platform | Package |
| -------- | ------- |
| Windows  | `.msi`  |
| Linux    | `.deb`  |

Always verify the SHA-256 of what you download against the checksum posted
with the release before installing.

## How it's built

- **Frontend:** React + TanStack Router, Tailwind, shadcn/ui.
- **Shell:** [Tauri v2](https://tauri.app) (Rust). The Rust side never
  touches key material directly — every wallet operation shells out to the
  native `zoka` CLI binary, which does all scanning, proving and signing.
  The webview only ever sees public addresses and already-signed output.
- **Node:** bundles the same `zoka` binary as ZSilent Core, built from the
  [ZokaNetwork/ZokaNetwork](https://github.com/ZokaNetwork/ZokaNetwork)
  source for the matching release tag.

## Development

```bash
npm install
npm run tauri dev
```

Building a release bundle requires a `zoka` (Windows: `zoka.exe`) binary and
the network manifest + trusted-setup files staged under
`src-tauri/resources/` first — see `.github/workflows/release.yml` for the
exact steps CI runs.

## Security

- Seed phrases, spend keys and passwords are handled exclusively by the
  native `zoka` binary — never by the webview, never logged, never sent
  anywhere but the local node.
- No analytics, no third-party scripts, no telemetry of any kind.
