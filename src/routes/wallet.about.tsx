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
        <p className="text-foreground">Zveil is a non-custodial desktop wallet for Zoka Network.</p>
        <ul className="mt-4 space-y-2">
          <li>· Your seed phrase is generated on this device and never leaves it.</li>
          <li>· Private scan and spend keys are never sent to any server.</li>
          <li>· Balance scanning runs against a Zoka node on this device.</li>
          <li>· Transactions are built, proved and signed locally, then broadcast.</li>
          <li>· Optional Tor hides your IP from the network.</li>
          <li>· No analytics, no session recording, no third-party trackers.</li>
        </ul>
      </section>

      <section className="zk-panel p-6 text-sm text-muted-foreground">
        <p className="mono text-[10px] uppercase tracking-widest">Status</p>
        <p className="mt-3">
          Early release. Zveil runs the official Zoka node engine locally to derive keys, scan
          balances and sign private transactions. Keep your seed phrase backed up offline — it is
          the only way to recover your funds.
        </p>
      </section>
    </div>
  );
}
