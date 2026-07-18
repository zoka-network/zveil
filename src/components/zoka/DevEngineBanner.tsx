import { useWallet } from "@/wallet/WalletProvider";
import { AlertTriangle } from "lucide-react";

export function DevEngineBanner() {
  const { engine } = useWallet();
  if (engine.kind !== "mock") return null;
  return (
    <div className="border-b border-warning/30 bg-warning/10 text-warning">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2 text-xs">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
        <span className="mono uppercase tracking-wider">
          Development mode — cryptographic engine not connected.
        </span>
        <span className="hidden text-warning/70 sm:inline">
          All keys, addresses and balances shown are simulated. Do not use with real funds.
        </span>
      </div>
    </div>
  );
}
