import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Lock, Plus, ShieldOff, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ForgetWalletDialog } from "@/components/zoka/ForgetWalletDialog";
import { useWallet } from "@/wallet/WalletProvider";
import { zokaConfig } from "@/wallet/config";

export const Route = createFileRoute("/wallet/security")({
  component: SecurityPage,
});

function SecurityPage() {
  const { lock, forget } = useWallet();
  const navigate = useNavigate();
  const [forgetOpen, setForgetOpen] = useState(false);
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
          <Plus className="mt-0.5 h-4 w-4 text-muted-foreground" />
          <div className="flex-1">
            <p className="text-sm font-medium">Create a new wallet</p>
            <p className="mono mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
              A fresh seed and its own password. Switches to it when done.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void navigate({ to: "/create", search: { add: true } })}
            className="mono uppercase tracking-wider"
          >
            New wallet
          </Button>
        </div>
      </section>

      <section className="zk-panel p-5">
        <div className="flex items-start gap-3">
          <ShieldOff className="mt-0.5 h-4 w-4 text-destructive" />
          <div className="flex-1">
            <p className="text-sm font-medium">Forget wallet</p>
            <p className="mono mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
              Removes this wallet from the app. Requires the seed to restore.
            </p>
          </div>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setForgetOpen(true)}
            className="mono uppercase tracking-wider"
          >
            Forget
          </Button>
        </div>
      </section>

      <section className="zk-panel p-5">
        <p className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Device storage
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Your keys are stored on this device, encrypted with your password by the Zoka engine.
          The password is required to unlock the wallet and to sign transactions, and is never
          stored or transmitted. Back up your seed phrase offline — it is the only recovery path.
        </p>
      </section>

      <ForgetWalletDialog open={forgetOpen} onOpenChange={setForgetOpen} onConfirm={forget} />
    </div>
  );
}
