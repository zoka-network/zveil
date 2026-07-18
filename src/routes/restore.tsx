import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ZokaLogo } from "@/components/zoka/ZokaLogo";
import { DevEngineBanner } from "@/components/zoka/DevEngineBanner";
import { useWallet } from "@/wallet/WalletProvider";
import { looksLikeMnemonic } from "@/wallet/security/validation";

export const Route = createFileRoute("/restore")({
  component: RestorePage,
});

function RestorePage() {
  const { engine, unlockWithWallet } = useWallet();
  const navigate = useNavigate();

  const [phrase, setPhrase] = useState("");
  const [reveal, setReveal] = useState(false);
  const [busy, setBusy] = useState(false);

  async function restore() {
    setBusy(true);
    try {
      const ok = await engine.validateMnemonic(phrase.trim());
      if (!ok) {
        toast.error("Invalid seed phrase", {
          description: "Check each word against the Zoka wordlist and try again.",
        });
        return;
      }
      const wallet = await engine.restoreWallet(phrase.trim());
      setPhrase(""); // clear form best-effort
      unlockWithWallet(wallet);
      void navigate({ to: "/wallet" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <DevEngineBanner />
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link to="/" className="text-foreground">
            <ZokaLogo />
          </Link>
          <Button asChild variant="ghost" size="sm" className="mono uppercase tracking-wider">
            <Link to="/">
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              Cancel
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <section className="zk-panel-elevated p-8">
          <p className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Restore · Local only
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Restore your wallet</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Enter your seed phrase. It is never sent anywhere — validation and derivation happen
            entirely in this browser.
          </p>

          <div className="mt-6">
            <div className="flex items-center justify-between">
              <Label htmlFor="phrase" className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Seed phrase
              </Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReveal((v) => !v)}
                className="mono uppercase tracking-wider"
              >
                {reveal ? (
                  <>
                    <EyeOff className="mr-1.5 h-3.5 w-3.5" /> Hide
                  </>
                ) : (
                  <>
                    <Eye className="mr-1.5 h-3.5 w-3.5" /> Show
                  </>
                )}
              </Button>
            </div>
            <Textarea
              id="phrase"
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              rows={4}
              autoComplete="off"
              spellCheck={false}
              className={"mono mt-2 " + (reveal ? "" : "[-webkit-text-security:disc] [text-security:disc]")}
              placeholder="word1 word2 word3 …"
            />
            <p className="mono mt-2 text-[10px] uppercase tracking-widest text-muted-foreground">
              {looksLikeMnemonic(phrase) ? "Length looks valid" : "Expected 12 or 24 words"}
            </p>
          </div>

          <Button
            className="mono mt-8 w-full uppercase tracking-wider"
            disabled={!looksLikeMnemonic(phrase) || busy}
            onClick={restore}
          >
            {busy ? "Deriving…" : "Restore wallet"}
          </Button>
        </section>
      </main>
    </div>
  );
}
