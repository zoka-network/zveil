import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, ArrowUpRight, Eye, EyeOff, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CopyButton } from "@/components/zoka/CopyButton";
import { useWallet } from "@/wallet/WalletProvider";
import { shortenAddress } from "@/wallet/security/validation";
import { atomsToZka as toZka } from "@/wallet/format";
import { cn } from "@/lib/utils";
import { isDesktop } from "@/wallet/runtime";
import { fetchWalletHistory } from "@/wallet/walletStore";

export const Route = createFileRoute("/wallet/")({
  component: WalletHome,
});

function WalletHome() {
  const { wallet, engine, rpc, activeNode, nodeState, balanceHidden, toggleBalanceHidden } =
    useWallet();

  const height = useQuery({
    queryKey: ["rpc", activeNode.id, "height"],
    queryFn: () => rpc.getBlockHeight(),
    refetchInterval: 10_000,
  });

  const localHeight = height.data ?? 0;

  const balance = useQuery({
    queryKey: ["balance", wallet?.primaryAddress.value],
    enabled: !!wallet,
    queryFn: () =>
      engine.scanWallet({
        secretHandle: wallet!.secretHandle,
        fromHeight: 0,
        toHeight: localHeight,
      }),
    refetchInterval: 15_000,
  });

  const available = balance.data ? toZka(balance.data.balanceAvailable) : null;
  const pending = balance.data ? toZka(balance.data.balancePending) : null;
  const syncing = !nodeState.ready;

  const desktop = isDesktop();
  const history = useQuery({
    queryKey: ["wallet-history"],
    queryFn: fetchWalletHistory,
    enabled: desktop,
    refetchInterval: 20_000,
  });
  const recentTxs = (history.data ?? []).slice(0, 3);

  // Brief highlight when the balance changes (e.g. a payment arrives) — but
  // not on the very first load, which would flash on every app open.
  const [flash, setFlash] = useState(false);
  const prevAvailable = useRef<string | null>(null);
  useEffect(() => {
    if (available === null) return;
    const prev = prevAvailable.current;
    prevAvailable.current = available;
    if (prev !== null && prev !== available) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 900);
      return () => clearTimeout(t);
    }
  }, [available]);

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
          {!balanceHidden && available === null && !balance.isError ? (
            <Skeleton className="h-10 w-40 md:h-12 md:w-48" />
          ) : (
            <span
              className={cn(
                "mono text-4xl font-semibold tracking-tight transition-colors duration-500 md:text-5xl",
                flash && "text-success",
              )}
            >
              {balanceHidden ? "•••••" : (available ?? (balance.isError ? "—" : "…"))}
            </span>
          )}
          <span className="mono text-sm text-muted-foreground">ZKA</span>
        </div>
        <p className="mono mt-2 text-[10px] uppercase tracking-widest text-muted-foreground">
          Pending: {balanceHidden ? "•••" : (pending ?? "0.000000")} ZKA
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
          <div className="mt-3 flex items-center gap-1">
            <p className="mono flex-1 break-all text-sm">
              {shortenAddress(wallet.primaryAddress.value, 12)}
            </p>
            <CopyButton value={wallet.primaryAddress.value} label="Copy address" />
          </div>
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
          </div>
          <div className="mt-3 h-1 overflow-hidden rounded-full bg-accent">
            <div
              className={"h-full bg-primary transition-all " + (syncing ? "w-2/3 animate-pulse" : "w-full")}
            />
          </div>
          <p className="mono mt-2 flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
            <span className="relative flex h-1.5 w-1.5">
              {syncing && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-warning opacity-75" />
              )}
              <span
                className={cn(
                  "relative inline-flex h-1.5 w-1.5 rounded-full",
                  syncing ? "bg-warning" : "bg-success",
                )}
              />
            </span>
            {syncing ? "Syncing" : "Synced"} · Mainnet
          </p>
        </section>
      </div>

      <section className="zk-panel p-5">
        <div className="flex items-center justify-between">
          <p className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Recent activity
          </p>
          {desktop && recentTxs.length > 0 && (
            <Link
              to="/wallet/activity"
              className="mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
            >
              View all
            </Link>
          )}
        </div>
        {desktop && history.isLoading ? (
          <div className="mt-4 space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : recentTxs.length === 0 ? (
          <p className="mono mt-6 text-center text-xs text-muted-foreground">
            No transactions detected on this device.
          </p>
        ) : (
          <div className="mt-3 divide-y divide-border">
            {recentTxs.map((tx) => (
              <div key={tx.txHash} className="flex items-center gap-3 py-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-accent text-foreground">
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm">Private transfer</p>
                  <p className="mono text-[10px] text-muted-foreground">{tx.status}</p>
                </div>
                <span className="mono shrink-0 text-[10px] text-muted-foreground">
                  {tx.timestamp ? new Date(tx.timestamp * 1000).toLocaleDateString() : "—"}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
