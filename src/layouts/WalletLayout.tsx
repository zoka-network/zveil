import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  ArrowDownToLine,
  ArrowUpFromLine,
  Info,
  Lock,
  Network,
  Shield,
  Wallet,
} from "lucide-react";
import { useEffect } from "react";
import { DevEngineBanner } from "@/components/zoka/DevEngineBanner";
import { ZokaLogo } from "@/components/zoka/ZokaLogo";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/wallet/WalletProvider";

const NAV = [
  { to: "/wallet", label: "Balance", icon: Wallet, exact: true },
  { to: "/wallet/send", label: "Send", icon: ArrowUpFromLine },
  { to: "/wallet/receive", label: "Receive", icon: ArrowDownToLine },
  { to: "/wallet/activity", label: "Activity", icon: Activity },
  { to: "/wallet/network", label: "Network", icon: Network },
  { to: "/wallet/security", label: "Security", icon: Shield },
  { to: "/wallet/about", label: "About", icon: Info },
] as const;

export function WalletLayout() {
  const { status, wallet, lock, activeNode } = useWallet();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (status === "empty") {
      void navigate({ to: "/" });
    }
  }, [status, navigate]);

  if (!wallet) return null;

  return (
    <div className="flex min-h-screen flex-col">
      <DevEngineBanner />
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/wallet" className="text-foreground">
            <ZokaLogo />
          </Link>
          <div className="flex items-center gap-3">
            <div className="mono hidden text-[10px] uppercase tracking-widest text-muted-foreground sm:flex sm:items-center sm:gap-2">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-success" />
              {activeNode.network}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={lock}
              className="mono text-[11px] uppercase tracking-wider"
            >
              <Lock className="mr-1.5 h-3.5 w-3.5" />
              Lock
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 md:flex-row">
        <aside className="md:w-56 md:shrink-0">
          <nav className="flex gap-1 overflow-x-auto md:flex-col">
            {NAV.map((item) => {
              const active = item.exact
                ? pathname === item.to
                : pathname === item.to || pathname.startsWith(item.to + "/");
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={
                    "mono flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-[12px] uppercase tracking-wider transition-colors " +
                    (active
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground")
                  }
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>

      <footer className="border-t border-border">
        <div className="mono mx-auto flex max-w-6xl items-center justify-between px-4 py-3 text-[10px] uppercase tracking-widest text-muted-foreground">
          <span>Privacy belongs to you.</span>
          <span>zero-knowledge · full ownership</span>
        </div>
      </footer>
    </div>
  );
}
