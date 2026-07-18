import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, Check, Copy, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ZokaLogo } from "@/components/zoka/ZokaLogo";
import { DevEngineBanner } from "@/components/zoka/DevEngineBanner";
import { useWallet } from "@/wallet/WalletProvider";

export const Route = createFileRoute("/create")({
  component: CreatePage,
});

type Step = "warn" | "reveal" | "confirm" | "done";

function CreatePage() {
  const { engine, unlockWithWallet } = useWallet();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("warn");
  const [acknowledged, setAcknowledged] = useState(false);
  const [phrase, setPhrase] = useState<string>("");
  const [revealed, setRevealed] = useState(false);

  const words = useMemo(() => phrase.split(" ").filter(Boolean), [phrase]);

  // Random indices to confirm
  const confirmIndices = useMemo(() => {
    if (words.length === 0) return [] as number[];
    const set = new Set<number>();
    while (set.size < Math.min(3, words.length)) {
      const bytes = new Uint8Array(1);
      crypto.getRandomValues(bytes);
      set.add(bytes[0] % words.length);
    }
    return Array.from(set).sort((a, b) => a - b);
  }, [words]);

  const [answers, setAnswers] = useState<Record<number, string>>({});

  async function beginGenerate() {
    const mnemonic = await engine.generateWallet();
    setPhrase(mnemonic.phrase);
    setStep("reveal");
  }

  async function copyPhrase() {
    await navigator.clipboard.writeText(phrase);
    toast.warning("Seed copied to clipboard", {
      description: "Clear it once you have written it down.",
    });
  }

  const allConfirmed =
    confirmIndices.length > 0 &&
    confirmIndices.every((i) => (answers[i] ?? "").trim().toLowerCase() === words[i]);

  async function finalize() {
    const wallet = await engine.deriveWallet(phrase);
    // Best-effort wipe of local state
    setPhrase("");
    setAnswers({});
    unlockWithWallet(wallet);
    setStep("done");
    setTimeout(() => void navigate({ to: "/wallet" }), 400);
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
        {step === "warn" && (
          <section className="zk-panel-elevated p-8">
            <p className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Step 1 · Read carefully
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">Create a new wallet</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Your seed phrase is the only way to recover this wallet. Zoka Network cannot restore
              it for you. If you lose it, your funds are lost forever.
            </p>

            <div className="mt-6 space-y-3 rounded-md border border-warning/30 bg-warning/5 p-4 text-sm text-warning">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-medium">Write it down on paper.</p>
                  <p className="mt-1 text-warning/80">
                    Never store it in email, cloud drives, screenshots, chats or password managers
                    synced online.
                  </p>
                </div>
              </div>
            </div>

            <label className="mt-6 flex items-start gap-3 text-sm">
              <Checkbox
                checked={acknowledged}
                onCheckedChange={(v) => setAcknowledged(Boolean(v))}
                className="mt-0.5"
              />
              <span className="text-muted-foreground">
                I understand that Zoka cannot recover a lost seed and that anyone with this seed
                has full access to my funds.
              </span>
            </label>

            <Button
              className="mono mt-8 w-full uppercase tracking-wider"
              disabled={!acknowledged}
              onClick={beginGenerate}
            >
              Generate seed
            </Button>
          </section>
        )}

        {step === "reveal" && (
          <section className="zk-panel-elevated p-8">
            <p className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Step 2 · Backup
            </p>
            <div className="mt-2 flex items-center justify-between">
              <h1 className="text-2xl font-semibold tracking-tight">Your seed phrase</h1>
              <Button
                variant="ghost"
                size="sm"
                className="mono uppercase tracking-wider"
                onClick={() => setRevealed((v) => !v)}
              >
                {revealed ? (
                  <>
                    <EyeOff className="mr-1.5 h-3.5 w-3.5" /> Hide
                  </>
                ) : (
                  <>
                    <Eye className="mr-1.5 h-3.5 w-3.5" /> Reveal
                  </>
                )}
              </Button>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {words.map((w, i) => (
                <div
                  key={i}
                  className="mono flex items-baseline gap-2 rounded-md border border-border bg-background/40 px-3 py-2 text-sm"
                >
                  <span className="text-[10px] text-muted-foreground">{i + 1}</span>
                  <span>{revealed ? w : "••••••"}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={copyPhrase} className="mono uppercase tracking-wider">
                <Copy className="mr-1.5 h-3.5 w-3.5" />
                Copy
              </Button>
              <Button
                size="sm"
                className="mono ml-auto uppercase tracking-wider"
                onClick={() => setStep("confirm")}
              >
                I saved it — continue
              </Button>
            </div>
          </section>
        )}

        {step === "confirm" && (
          <section className="zk-panel-elevated p-8">
            <p className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Step 3 · Verify
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">Confirm your seed</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Type the words at the positions below to confirm you saved the phrase correctly.
            </p>

            <div className="mt-6 space-y-4">
              {confirmIndices.map((i) => (
                <div key={i}>
                  <Label className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    Word #{i + 1}
                  </Label>
                  <Input
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    value={answers[i] ?? ""}
                    onChange={(e) => setAnswers((a) => ({ ...a, [i]: e.target.value }))}
                    className="mono mt-1"
                  />
                </div>
              ))}
            </div>

            <div className="mt-8 flex justify-between">
              <Button variant="ghost" onClick={() => setStep("reveal")} className="mono uppercase tracking-wider">
                Back
              </Button>
              <Button
                onClick={finalize}
                disabled={!allConfirmed}
                className="mono uppercase tracking-wider"
              >
                Confirm & open wallet
              </Button>
            </div>
          </section>
        )}

        {step === "done" && (
          <section className="zk-panel-elevated flex flex-col items-center p-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-success bg-success/10 text-success">
              <Check className="h-5 w-5" />
            </div>
            <h1 className="mt-4 text-xl font-semibold">Wallet ready</h1>
            <p className="mono mt-2 text-[11px] uppercase tracking-widest text-muted-foreground">
              Opening dashboard…
            </p>
          </section>
        )}
      </main>
    </div>
  );
}

// Best-effort: wipe phrase from memory on unmount handled via React state gc.
export function _noop() {
  useEffect(() => () => {}, []);
}
