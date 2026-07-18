import { createFileRoute } from "@tanstack/react-router";
import { Lock, ShieldOff, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/wallet/WalletProvider";
import { zokaConfig } from "@/wallet/config";

export const Route = createFileRoute("/wallet/security")({
  component: SecurityPage,
});

function SecurityPage() {
  const { lock, forget } = useWallet();
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Security</h1>
        <p className="mono mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
          Session · Auto-lock · Storage
        </p>
      </header>

      <section className="zk-panel p-5">
        <div className="flex items-start gap-3">
          <Timer className="mt-0.5 h-4 w-4 text-muted-foreground" />
          <div className="flex-1">
            <p className="text-sm font-medium">Auto-lock</p>
            <p className="mono mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
              Locks after {Math.round(zokaConfig.autoLockMs / 60_000)} min of inactivity
            </p>
          </div>
        </div>
      </section>

      <section className="zk-panel p-5">
        <div className="flex items-start gap-3">
          <Lock className="mt-0.5 h-4 w-4 text-muted-foreground" />
          <div className="flex-1">
            <p className="text-sm font-medium">Lock session</p>
            <p className="mono mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
              Wipes decrypted keys from memory
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={lock} className="mono uppercase tracking-wider">
            Lock now
          </Button>
        </div>
      </section>

      <section className="zk-panel p-5">
        <div className="flex items-start gap-3">
          <ShieldOff className="mt-0.5 h-4 w-4 text-destructive" />
          <div className="flex-1">
            <p className="text-sm font-medium">Forget wallet</p>
            <p className="mono mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
              Removes the wallet from this session. Requires seed to restore.
            </p>
          </div>
          <Button size="sm" variant="destructive" onClick={forget} className="mono uppercase tracking-wider">
            Forget
          </Button>
        </div>
      </section>

      <section className="zk-panel p-5">
        <p className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Device storage
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Encrypted device storage is not enabled yet. The KDF (Argon2id or scrypt) and container
          format are waiting on the official Zoka specification. Until then, this wallet runs in
          ephemeral mode — closing the tab wipes the session.
        </p>
      </section>
    </div>
  );
}
