import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Cpu, Globe, Radio, ShieldCheck } from "lucide-react";
import { useWallet } from "@/wallet/WalletProvider";

export const Route = createFileRoute("/wallet/network")({
  component: NetworkPage,
});

function NetworkPage() {
  const { rpc, nodeState } = useWallet();

  const height = useQuery({
    queryKey: ["network", "height"],
    queryFn: () => rpc.getBlockHeight(),
    refetchInterval: 10_000,
  });

  const connection = nodeState.ready
    ? "Connected"
    : nodeState.attached
      ? "Syncing"
      : nodeState.managed
        ? "Starting node…"
        : "Offline";

  const mode = nodeState.managed
    ? "Running a local node on this device"
    : nodeState.attached
      ? "Using a node already running on this device"
      : "No node reachable yet";

  const dotClass = nodeState.ready
    ? "bg-success"
    : nodeState.attached || nodeState.managed
      ? "bg-warning"
      : "bg-muted-foreground";

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Network</h1>
        <p className="mono mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
          Serverless · Peer-to-peer
        </p>
      </header>

      <section className="zk-panel-elevated p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Connection
            </p>
            <div className="mt-2 flex items-center gap-2">
              <span className={"h-2.5 w-2.5 rounded-full " + dotClass} />
              <span className="text-sm font-medium">{connection}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{mode}</p>
          </div>
          <div className="text-right">
            <p className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Block height
            </p>
            <p className="mono mt-2 text-lg font-semibold">
              {height.data ? height.data.toLocaleString() : "—"}
            </p>
          </div>
        </div>
      </section>

      <section className="zk-panel p-5">
        <p className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
          How Zveil connects
        </p>
        <ul className="mt-4 space-y-4 text-sm">
          <li className="flex items-start gap-3">
            <Cpu className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              <p className="font-medium">No central server</p>
              <p className="mt-0.5 text-muted-foreground">
                There is no company RPC to trust or to go down. Zveil talks to the network through a
                node on your own machine.
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <Radio className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              <p className="font-medium">Peer-to-peer sync</p>
              <p className="mt-0.5 text-muted-foreground">
                The node fetches the chain from other peers (libp2p gossip) and bootstraps quickly
                over an iroh snapshot — no open ports or port-forwarding needed.
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              <p className="font-medium">Optional Tor</p>
              <p className="mt-0.5 text-muted-foreground">
                Hide your IP from the network by routing the node through Tor. Configure it under{" "}
                <Link to="/wallet/privacy" className="text-foreground underline underline-offset-2">
                  Privacy
                </Link>
                .
              </p>
            </div>
          </li>
        </ul>
      </section>

      <section className="zk-panel p-5">
        <p className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Chain
        </p>
        <dl className="mono mt-4 grid grid-cols-2 gap-y-3 text-sm">
          <dt className="flex items-center gap-2 text-muted-foreground">
            <Globe className="h-3.5 w-3.5" /> Network
          </dt>
          <dd>Zoka Mainnet</dd>
          <dt className="text-muted-foreground">Address prefix</dt>
          <dd>zka1</dd>
          <dt className="text-muted-foreground">Height</dt>
          <dd>{height.data ? height.data.toLocaleString() : "—"}</dd>
        </dl>
      </section>
    </div>
  );
}
