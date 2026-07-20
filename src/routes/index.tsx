import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AlertTriangle, ArrowRight, KeyRound, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ZokaLogo } from "@/components/zoka/ZokaLogo";
import { DevEngineBanner } from "@/components/zoka/DevEngineBanner";
import { useWallet } from "@/wallet/WalletProvider";
import { hasStoredWalletSync } from "@/wallet/storage/localWallet";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    if (hasStoredWalletSync()) throw redirect({ to: "/wallet" });
  },
  component: LandingPage,
});

function LandingPage() {
  const { status, hasStoredWallet, storageError, forget } = useWallet();
  const navigate = useNavigate();

  // Runtime guard (covers state changes after mount).
  useEffect(() => {
    if (status === "unlocked" || hasStoredWallet) void navigate({ to: "/wallet" });
  }, [status, hasStoredWallet, navigate]);

  return (
    <div className="flex min-h-screen flex-col">
      <DevEngineBanner />
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <ZokaLogo />
          <span className="mono hidden text-[10px] uppercase tracking-widest text-muted-foreground sm:inline">
            Zoka Web Wallet
          </span>
        </div>
      </header>

      <main className="zk-grid relative flex-1">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 md:grid-cols-2 md:py-24">
          <div className="flex flex-col justify-center">
            <p className="mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
              Official · Non-custodial
            </p>
            <h1 className="mt-4 text-4xl font-semibold leading-[1.05] tracking-tight md:text-5xl">
              Privacy belongs to you.
            </h1>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-muted-foreground md:text-base">
              The official web wallet for Zoka Network. Zero-knowledge, full ownership. Your keys
              never leave this device.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="mono uppercase tracking-wider">
                <Link to="/create">
                  Create wallet <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="mono uppercase tracking-wider">
                <Link to="/restore">Restore wallet</Link>
              </Button>
            </div>

            <ul className="mono mt-10 grid gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
              <li>· Seed generated locally</li>
              <li>· Scanning runs in-browser</li>
              <li>· No account, no email, no tracking</li>
            </ul>
          </div>

          <div className="flex items-center justify-center">
            <div className="zk-panel-elevated relative w-full max-w-sm p-8">
              <div className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Zoka · Balance
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="mono text-3xl font-semibold">•••••</span>
                <span className="mono text-xs text-muted-foreground">ZKA</span>
              </div>
              <div className="mt-8 space-y-4">
                <div className="flex items-center gap-3 text-sm">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Private by design</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <KeyRound className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Your keys, your device</span>
                </div>
              </div>
              <div className="mono absolute -bottom-3 left-6 rounded-sm border border-border-strong bg-background px-2 py-1 text-[9px] uppercase tracking-widest text-muted-foreground">
                Preview
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-border">
        <div className="mono mx-auto flex max-w-6xl items-center justify-between px-4 py-4 text-[10px] uppercase tracking-widest text-muted-foreground">
          <span>Zoka Network</span>
          <span>Zero-knowledge · Full ownership</span>
        </div>
      </footer>
    </div>
  );
}
