import { useState } from "react";
import { LockKeyhole } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWallet } from "@/wallet/WalletProvider";
import { errToString } from "@/wallet/errors";
import { ForgetWalletDialog } from "./ForgetWalletDialog";
import { DevEngineBanner } from "./DevEngineBanner";
import { ZokaLogo } from "./ZokaLogo";

/**
 * Rendered when the wallet is locked. The UI stays isolated — no route
 * beyond /wallet renders while status === "locked". Unlocking re-establishes
 * the native session with the wallet password.
 */
export function LockedScreen() {
  const { unlockSession, forget } = useWallet();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgetOpen, setForgetOpen] = useState(false);

  const handleForget = () => {
    forget();
    void navigate({ to: "/" });
  };

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !password) return;
    setBusy(true);
    setError(null);
    try {
      const ok = await unlockSession(password);
      if (!ok) setError("Incorrect password");
      else setPassword("");
    } catch (err) {
      setError(errToString(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <DevEngineBanner />
      <div className="flex flex-1 items-center justify-center px-4">
        <div className="zk-panel-elevated w-full max-w-md p-8 text-center">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full border border-border-strong">
            <LockKeyhole className="h-6 w-6 text-muted-foreground" />
          </div>
          <ZokaLogo className="justify-center" />
          <h1 className="mt-6 text-lg font-semibold">Wallet locked</h1>
          <p className="mono mt-2 text-[11px] uppercase tracking-wider text-muted-foreground">
            Enter your password to unlock
          </p>

          <form onSubmit={handleUnlock} className="mt-6 space-y-3 text-left">
            <Input
              type="password"
              autoFocus
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
              placeholder="Password"
              className="text-center"
            />
            {error && (
              <p className="mono text-center text-[11px] uppercase tracking-wider text-destructive">
                {error}
              </p>
            )}
            <Button
              type="submit"
              disabled={busy || !password}
              className="mono w-full uppercase tracking-wider"
            >
              {busy ? "Unlocking…" : "Unlock"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="mono w-full uppercase tracking-wider text-muted-foreground"
              onClick={() => setForgetOpen(true)}
            >
              Forget wallet
            </Button>
          </form>

          <p className="mt-6 text-xs text-muted-foreground">
            The password never leaves this device. It decrypts your keys locally to sign
            transactions.
          </p>
        </div>
      </div>
      <ForgetWalletDialog open={forgetOpen} onOpenChange={setForgetOpen} onConfirm={handleForget} />
    </div>
  );
}
