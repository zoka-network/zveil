import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowDownToLine, ArrowUpFromLine, Eye, EyeOff, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/wallet/WalletProvider";
import { shortenAddress } from "@/wallet/security/validation";

export const Route = createFileRoute("/wallet/")({
  component: WalletHome,
});

function WalletHome() {
  const { wallet, rpc, activeNode, balanceHidden, toggleBalanceHidden } = useWallet();

  const height = useQuery({
    queryKey: ["rpc", activeNode.id, "height"],
    queryFn: () => rpc.getBlockHeight(),
    refetchInterval: 10_000,
  });

  const localHeight = height.data ?? 0; // mock: assume fully synced
  const syncPct = 100;

  if (!wallet) return null;

  return (
    <div className="space-y-6">
      <section className="zk-panel-elevated p-6 md:p-8">
        <div className="flex items-center justify-between">
          <p className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Available balance
          </p>
          <Button variant="ghost" size="sm" onClick={toggleBalanceHidden} className="mono uppercase tracking-wider">
            {balanceHidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          </Button>
        </div>
        <div className="mt-3 flex items-baseline gap-3">
          <span className="mono text-4xl font-semibold tracking-tight md:text-5xl">
            {balanceHidden ? "•••••" : "0.000000"}
          </span>
          <span className="mono text-sm text-muted-foreground">ZKA</span>
        </div>
        <p className="mono mt-2 text-[10px] uppercase tracking-widest text-muted-foreground">
          Pending: {balanceHidden ? "•••" : "0.000000"} ZKA
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild className="mono uppercase tracking-wider">
            <Link to="/wallet/send">
              <ArrowUpFromLine className="mr-1.5 h-4 w-4" /> Send
            </Link>
          </Button>
          <Button asChild variant="outline" className="mono uppercase tracking-wider">
            <Link to="/wallet/receive">
              <ArrowDownToLine className="mr-1.5 h-4 w-4" /> Receive
            </Link>
          </Button>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="zk-panel p-5">
          <p className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Primary address
          </p>
          <p className="mono mt-3 break-all text-sm">{shortenAddress(wallet.primaryAddress.value, 12)}</p>
        </section>

        <section className="zk-panel p-5">
          <div className="flex items-center justify-between">
            <p className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Sync
            </p>
            <button
              onClick={() => height.refetch()}
              className="mono flex items-center gap-1 text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className={"h-3 w-3 " + (height.isFetching ? "animate-spin" : "")} />
              Refresh
            </button>
          </div>
          <div className="mono mt-3 flex items-baseline gap-2 text-sm">
            <span>{localHeight.toLocaleString()}</span>
            <span className="text-muted-foreground">/</span>
            <span className="text-muted-foreground">{localHeight.toLocaleString()}</span>
          </div>
          <div className="mt-3 h-1 overflow-hidden rounded-full bg-accent">
            <div className="h-full bg-primary" style={{ width: `${syncPct}%` }} />
          </div>
          <p className="mono mt-2 text-[10px] uppercase tracking-widest text-muted-foreground">
            {syncPct}% · {activeNode.network}
          </p>
        </section>
      </div>

      <section className="zk-panel p-5">
        <p className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Recent activity
        </p>
        <p className="mono mt-6 text-center text-xs text-muted-foreground">
          No transactions detected on this device.
        </p>
      </section>
    </div>
  );
}
