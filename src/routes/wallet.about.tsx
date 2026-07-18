import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/wallet/about")({
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">About</h1>
        <p className="mono mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
          Privacy · Local operation · Open design
        </p>
      </header>

      <section className="zk-panel p-6 text-sm leading-relaxed text-muted-foreground">
        <p className="text-foreground">Zoka Web Wallet is a non-custodial browser wallet.</p>
        <ul className="mt-4 space-y-2">
          <li>· Your seed phrase is generated on this device and never leaves it.</li>
          <li>· Private scan and spend keys are never sent to any server.</li>
          <li>· Balance scanning runs locally against a Zoka node you choose.</li>
          <li>· Transactions are built, proved and signed inside this browser.</li>
          <li>· No analytics, no session recording, no third-party trackers.</li>
        </ul>
      </section>

      <section className="zk-panel p-6 text-sm text-muted-foreground">
        <p className="mono text-[10px] uppercase tracking-widest">Status</p>
        <p className="mt-3">
          This build ships a UI-only preview with a mock cryptographic engine. It is not audited
          and MUST NOT be used with real funds. Mainnet is disabled until the official Zoka WASM
          engine is integrated and independently reviewed.
        </p>
      </section>
    </div>
  );
}
