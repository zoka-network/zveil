import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/wallet/WalletProvider";
import { errToString } from "@/wallet/errors";
import {
  getTorEnabled,
  getTorOnly,
  restartConnectivity,
  setTorEnabled,
  setTorOnly,
  torStatus,
  type TorState,
} from "@/wallet/nodeControl";

export const Route = createFileRoute("/wallet/privacy")({
  component: PrivacyPage,
});

function PrivacyPage() {
  const { nodeState } = useWallet();
  const [tor, setTor] = useState(getTorEnabled());
  const [torOnly, setOnly] = useState(getTorOnly());
  const [applying, setApplying] = useState(false);
  const [torRt, setTorRt] = useState<TorState>({ running: false, socks_proxy: "" });

  useEffect(() => {
    let alive = true;
    const tick = () => void torStatus().then((s) => alive && setTorRt(s));
    tick();
    const iv = setInterval(tick, 5000);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, []);

  const dirty = tor !== getTorEnabled() || torOnly !== getTorOnly();

  async function apply() {
    setApplying(true);
    try {
      setTorEnabled(tor);
      setTorOnly(tor ? torOnly : false);
      await restartConnectivity();
      toast.success(tor ? "Routing through Tor" : "Tor disabled", {
        description: tor
          ? "The node is reconnecting over the Tor network."
          : "The node is reconnecting directly.",
      });
    } catch (e) {
      toast.error("Could not apply privacy settings", {
        description: errToString(e),
      });
    } finally {
      setApplying(false);
    }
  }

  const connection = nodeState.ready
    ? "Connected"
    : nodeState.attached
      ? "Syncing"
      : nodeState.managed
        ? "Starting node…"
        : "Offline";

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Privacy</h1>
        <p className="mono mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
          Network-level anonymity · Tor
        </p>
      </header>

      <section className="zk-panel-elevated p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Connection
            </p>
            <p className="mt-1 text-sm font-medium">{connection}</p>
          </div>
          <div className="text-right">
            <p className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Tor
            </p>
            <p className="mt-1 text-sm font-medium">
              {torRt.running ? "Running" : tor ? "Starting…" : "Off"}
            </p>
          </div>
        </div>
      </section>

      <section className="zk-panel-elevated space-y-6 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Route through Tor</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Hide your IP address from the network. Your node connects to peers over the Tor
                network instead of directly. Transactions are already private; this adds
                network-level anonymity. Expect slower sync.
              </p>
            </div>
          </div>
          <Switch checked={tor} onCheckedChange={setTor} />
        </div>

        {tor && (
          <div className="flex items-start justify-between gap-4 border-t border-border pt-6">
            <div>
              <p className="text-sm font-medium">Strict Tor only</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Refuse any direct (clearnet) connection. Maximum privacy, but the node cannot
                connect at all if Tor is unavailable.
              </p>
            </div>
            <Switch checked={torOnly} onCheckedChange={setOnly} />
          </div>
        )}

        <div className="flex items-center justify-end gap-3 border-t border-border pt-6">
          {dirty && (
            <p className="mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Restarts the node
            </p>
          )}
          <Button
            onClick={apply}
            disabled={!dirty || applying}
            className="mono uppercase tracking-wider"
          >
            {applying && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
            Apply
          </Button>
        </div>
      </section>

      <p className="text-xs text-muted-foreground">
        Tor runs locally on this device and is bundled with the wallet — nothing is installed or
        configured by you. When enabled, the node's peer traffic is proxied through it.
      </p>
    </div>
  );
}
