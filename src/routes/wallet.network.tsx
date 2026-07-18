import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Check, Circle } from "lucide-react";
import { useWallet } from "@/wallet/WalletProvider";

export const Route = createFileRoute("/wallet/network")({
  component: NetworkPage,
});

function NetworkPage() {
  const { rpc, activeNode, nodes, setActiveNode } = useWallet();

  const info = useQuery({
    queryKey: ["rpc", activeNode.id, "info"],
    queryFn: () => rpc.getNetworkInfo(),
  });

  const height = useQuery({
    queryKey: ["rpc", activeNode.id, "height"],
    queryFn: () => rpc.getBlockHeight(),
    refetchInterval: 10_000,
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Network</h1>
        <p className="mono mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
          RPC node · Sync · Chain
        </p>
      </header>

      <section className="zk-panel p-5">
        <p className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Active node
        </p>
        <div className="mt-3 space-y-2">
          {nodes.map((n) => {
            const active = n.id === activeNode.id;
            return (
              <button
                key={n.id}
                onClick={() => setActiveNode(n.id)}
                className={
                  "flex w-full items-center gap-3 rounded-md border px-4 py-3 text-left transition-colors " +
                  (active
                    ? "border-border-strong bg-accent"
                    : "border-border bg-transparent hover:bg-accent/40")
                }
              >
                <div
                  className={
                    "flex h-6 w-6 items-center justify-center rounded-full border " +
                    (active ? "border-primary bg-primary text-primary-foreground" : "border-border")
                  }
                >
                  {active ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-2 w-2" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{n.label}</p>
                  <p className="mono mt-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                    {n.network} · {n.official ? "Official" : "Custom"}
                  </p>
                </div>
                <span className="mono hidden text-[10px] text-muted-foreground sm:inline">
                  {n.url}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="zk-panel p-5">
        <p className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Chain info
        </p>
        <dl className="mono mt-4 grid grid-cols-2 gap-y-3 text-sm">
          <dt className="text-muted-foreground">Network</dt>
          <dd>{info.data?.network ?? "—"}</dd>
          <dt className="text-muted-foreground">Chain id</dt>
          <dd>{info.data?.chainId ?? "—"}</dd>
          <dt className="text-muted-foreground">Node version</dt>
          <dd>{info.data?.nodeVersion ?? "—"}</dd>
          <dt className="text-muted-foreground">Address prefix</dt>
          <dd>{info.data?.addressPrefix ?? "—"}</dd>
          <dt className="text-muted-foreground">Height</dt>
          <dd>{height.data?.toLocaleString() ?? "—"}</dd>
        </dl>
      </section>
    </div>
  );
}
