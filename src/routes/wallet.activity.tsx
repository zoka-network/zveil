import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/wallet/activity")({
  component: ActivityPage,
});

function ActivityPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Activity</h1>
        <p className="mono mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
          Detected locally · Never uploaded
        </p>
      </header>

      <section className="zk-panel p-5">
        <div className="mono grid grid-cols-5 gap-2 border-b border-border pb-2 text-[10px] uppercase tracking-widest text-muted-foreground">
          <span>Type</span>
          <span>Status</span>
          <span>Amount</span>
          <span>Height</span>
          <span className="text-right">Tx id</span>
        </div>
        <div className="mono py-16 text-center text-xs text-muted-foreground">
          No transactions yet.
        </div>
      </section>

      <p className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
        History requires scanning against the Zoka node. Scanning happens locally using the private
        scan key — never uploaded.
      </p>
    </div>
  );
}
