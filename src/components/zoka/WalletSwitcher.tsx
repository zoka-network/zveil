import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Check, Loader2, Plus, Users } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWallet } from "@/wallet/WalletProvider";
import { listStoredWallets, type StoredWalletSummary } from "@/wallet/walletStore";
import { atomsToZka } from "@/wallet/format";
import { errToString } from "@/wallet/errors";
import { shortenAddress } from "@/wallet/security/validation";
import type { DerivedWallet, OpaqueKey } from "@/wallet/engine/ZokaWalletEngine";
import { cn } from "@/lib/utils";

/**
 * Lists every wallet already stored on this device (same store ZSilent uses)
 * and lets the user switch the active one or create another. Switching
 * re-verifies that wallet's own password with the native engine before
 * activating it — each wallet keeps its own password.
 */
export function WalletSwitcher() {
  const { wallet, engine, unlockWithWallet } = useWallet();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [wallets, setWallets] = useState<StoredWalletSummary[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const activeAddress = wallet?.primaryAddress.value;

  async function openMenu(next: boolean) {
    setOpen(next);
    setSwitching(null);
    setPassword("");
    setError(null);
    if (next) {
      setLoading(true);
      setWallets(await listStoredWallets());
      setLoading(false);
    }
  }

  async function confirmSwitch(address: string) {
    if (busy || !password) return;
    setBusy(true);
    setError(null);
    try {
      const ok = await engine.unlock(address, password);
      if (!ok) {
        setError("Incorrect password");
        return;
      }
      const derived: DerivedWallet = {
        primaryAddress: { value: address, index: 0 },
        publicScanKey: "",
        publicSpendKey: "",
        secretHandle: { __opaque: "zoka-opaque-key" } as OpaqueKey,
      };
      unlockWithWallet(derived);
      setOpen(false);
    } catch (e) {
      setError(errToString(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={(next) => void openMenu(next)}>
      <PopoverTrigger asChild>
        <button
          title="Switch wallet"
          aria-label="Switch wallet"
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
            open && "bg-accent text-foreground",
          )}
        >
          <Users className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="max-h-80 overflow-y-auto p-2">
          <p className="mono px-2 py-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
            Wallets on this device
          </p>
          {loading && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
          {!loading &&
            wallets?.map((w) => {
              const isActive = w.address === activeAddress;
              const isSwitching = switching === w.address;
              return (
                <div key={w.address}>
                  <button
                    onClick={() => {
                      if (isActive) return;
                      setSwitching(isSwitching ? null : w.address);
                      setPassword("");
                      setError(null);
                    }}
                    disabled={isActive}
                    className={
                      "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors " +
                      (isActive ? "bg-accent" : "hover:bg-accent/40")
                    }
                  >
                    {isActive ? (
                      <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                    ) : (
                      <span className="h-3.5 w-3.5 shrink-0" />
                    )}
                    <span className="flex-1 overflow-hidden">
                      <span className="mono block truncate text-xs">
                        {shortenAddress(w.address, 8)}
                      </span>
                      <span className="mono block text-[10px] text-muted-foreground">
                        {atomsToZka(w.balanceAtoms)} ZKA
                      </span>
                    </span>
                  </button>
                  {isSwitching && (
                    <div className="space-y-2 px-2 pb-3 pt-1">
                      <Input
                        type="password"
                        autoFocus
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          setError(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void confirmSwitch(w.address);
                        }}
                        placeholder="Password"
                        className="h-8 text-sm"
                      />
                      {error && (
                        <p className="mono text-[10px] uppercase tracking-wider text-destructive">
                          {error}
                        </p>
                      )}
                      <Button
                        size="sm"
                        disabled={busy || !password}
                        onClick={() => void confirmSwitch(w.address)}
                        className="mono w-full uppercase tracking-wider"
                      >
                        {busy ? "Unlocking…" : "Switch"}
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          {!loading && wallets && wallets.length === 0 && (
            <p className="px-2 py-3 text-xs text-muted-foreground">No wallets found.</p>
          )}
        </div>
        <div className="border-t border-border p-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setOpen(false);
              void navigate({ to: "/create", search: { add: true } });
            }}
            className="mono w-full justify-start uppercase tracking-wider text-muted-foreground"
          >
            <Plus className="mr-2 h-3.5 w-3.5" />
            New wallet
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
