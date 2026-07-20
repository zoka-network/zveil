import { LockKeyhole } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/wallet/WalletProvider";
import { DevEngineBanner } from "./DevEngineBanner";
import { ZokaLogo } from "./ZokaLogo";

/**
 * Rendered when the wallet is locked. The UI stays isolated — no route
 * beyond /wallet renders while status === "locked".
 */
export function LockedScreen() {
  const { wallet, unlockWithWallet, forget } = useWallet();
  const navigate = useNavigate();
  const handleForget = () => {
    forget();
    void navigate({ to: "/" });
  };
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
            Auto-locked after inactivity
          </p>
          <div className="mt-6 space-y-2">
            <Button
              className="mono w-full uppercase tracking-wider"
              onClick={() => wallet && unlockWithWallet(wallet)}
            >
              Unlock session
            </Button>
            <Button
              variant="ghost"
              className="mono w-full uppercase tracking-wider text-muted-foreground"
              onClick={handleForget}
            >
              Forget wallet
            </Button>
          </div>
          <p className="mt-6 text-xs text-muted-foreground">
            In production, unlocking will require the password used to encrypt the wallet on this
            device.
          </p>
        </div>
      </div>
    </div>
  );
}
