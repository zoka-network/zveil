import { createFileRoute } from "@tanstack/react-router";
import { Github, Globe, MessageCircle, Twitter } from "lucide-react";
import { open } from "@tauri-apps/plugin-shell";
import { isDesktop } from "@/wallet/runtime";
import { useAppVersion } from "@/wallet/useAppVersion";

export const Route = createFileRoute("/wallet/about")({
  component: AboutPage,
});

const LINKS = [
  { label: "zoka.network", href: "https://zoka.network", Icon: Globe },
  { label: "GitHub", href: "https://github.com/zoka-network", Icon: Github },
  { label: "X / Twitter", href: "https://x.com/zokanetwork", Icon: Twitter },
  { label: "Discord", href: "https://discord.com/invite/rg55f7drKc", Icon: MessageCircle },
];

// Opens in the system's default browser rather than navigating the app's own
// window — a plain <a target="_blank"> inside the Tauri webview has nowhere
// sensible to open a new window into.
function openExternal(href: string) {
  if (isDesktop()) void open(href);
  else window.open(href, "_blank", "noreferrer");
}

function AboutPage() {
  const version = useAppVersion();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">About</h1>
        <p className="mono mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
          Zveil {version.data ? `v${version.data}` : ""} · Privacy · Local operation
        </p>
      </header>

      <section className="zk-panel p-6 text-sm leading-relaxed text-muted-foreground">
        <p className="text-foreground">Zveil is a non-custodial desktop wallet for Zoka Network.</p>
        <ul className="mt-4 space-y-2">
          <li>· Your seed phrase is generated on this device and never leaves it.</li>
          <li>· Private scan and spend keys are never sent to any server.</li>
          <li>· Balance scanning runs against a Zoka node on this device.</li>
          <li>· Transactions are built, proved and signed locally, then broadcast.</li>
          <li>· Optional Tor hides your IP from the network.</li>
          <li>· No analytics, no session recording, no third-party trackers.</li>
        </ul>
      </section>

      <section className="zk-panel p-6 text-sm text-muted-foreground">
        <p className="mono text-[10px] uppercase tracking-widest">Status</p>
        <p className="mt-3">
          Early release. Zveil runs the official Zoka node engine locally to derive keys, scan
          balances and sign private transactions. Keep your seed phrase backed up offline — it is
          the only way to recover your funds.
        </p>
      </section>

      <section className="zk-panel p-6 text-sm text-muted-foreground">
        <p className="mono text-[10px] uppercase tracking-widest">Official links</p>
        <div className="mt-3 flex flex-wrap gap-4">
          {LINKS.map(({ label, href, Icon }) => (
            <button
              key={href}
              type="button"
              onClick={() => openExternal(href)}
              className="flex items-center gap-1.5 text-foreground hover:text-primary"
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
