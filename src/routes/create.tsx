import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, Check, Copy, Eye, EyeOff, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ZokaLogo } from "@/components/zoka/ZokaLogo";
import { DevEngineBanner } from "@/components/zoka/DevEngineBanner";
import { useWallet } from "@/wallet/WalletProvider";
import { errToString } from "@/wallet/errors";
import { hasStoredWalletSync } from "@/wallet/storage/localWallet";

export const Route = createFileRoute("/create")({
  // `?add=true` lets the user create an additional wallet from inside the app
  // (each with its own fresh seed); without it, an existing wallet redirects to
  // the wallet screen.
  validateSearch: (s: Record<string, unknown>): { add?: boolean } => {
    const add = s.add === true || s.add === "true" || s.add === "1";
    return add ? { add: true } : {};
  },
  beforeLoad: ({ search }) => {
    if (!search.add && hasStoredWalletSync()) throw redirect({ to: "/wallet" });
  },
  component: CreatePage,
});

type Step = "warn" | "reveal" | "confirm" | "password" | "done";
type WordCount = 12 | 24;

const DISTRACTOR_POOL = [
  "abandon", "ability", "able", "about", "above", "absent", "absorb", "abstract",
  "absurd", "abuse", "access", "accident", "account", "accuse", "achieve", "acid",
  "acoustic", "acquire", "across", "action", "actor", "actress", "actual", "adapt",
  "advice", "aerobic", "affair", "afford", "afraid", "agree", "airport", "alarm",
  "album", "alert", "alien", "almost", "alone", "already", "always", "amazing",
];

function shuffle<T>(arr: T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const bytes = new Uint8Array(1);
    crypto.getRandomValues(bytes);
    const j = bytes[0] % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function pickIndices(total: number, count: number): number[] {
  const set = new Set<number>();
  while (set.size < Math.min(count, total)) {
    const bytes = new Uint8Array(1);
    crypto.getRandomValues(bytes);
    set.add(bytes[0] % total);
  }
  return Array.from(set).sort((a, b) => a - b);
}

function CreatePage() {
  const { engine, unlockWithWallet, hasStoredWallet } = useWallet();
  const { add } = Route.useSearch();
  const navigate = useNavigate();

  // Outside "add" mode, an existing wallet redirects away. In "add" mode we let
  // the user create another wallet; finishing switches the active wallet to it.
  useEffect(() => {
    if (!add && hasStoredWallet) void navigate({ to: "/wallet" });
  }, [add, hasStoredWallet, navigate]);

  const [step, setStep] = useState<Step>("warn");
  const [wordCount, setWordCount] = useState<WordCount>(12);
  const [acknowledged, setAcknowledged] = useState(false);
  const [phrase, setPhrase] = useState<string>("");
  const [revealed, setRevealed] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);


  const words = useMemo(() => phrase.split(" ").filter(Boolean), [phrase]);

  // Confirm: pick 4 positions and generate 6-word options each (correct + distractors).
  const challenges = useMemo(() => {
    if (words.length === 0) return [] as { index: number; options: string[] }[];
    const positions = pickIndices(words.length, 4);
    return positions.map((pos) => {
      const correct = words[pos];
      const distractorSource = [
        ...words.filter((w) => w !== correct),
        ...DISTRACTOR_POOL.filter((w) => w !== correct),
      ];
      const distractors: string[] = [];
      const used = new Set<string>([correct]);
      while (distractors.length < 5 && distractorSource.length > 0) {
        const bytes = new Uint8Array(1);
        crypto.getRandomValues(bytes);
        const cand = distractorSource[bytes[0] % distractorSource.length];
        if (!used.has(cand)) {
          used.add(cand);
          distractors.push(cand);
        }
      }
      return { index: pos, options: shuffle([correct, ...distractors]) };
    });
  }, [words]);

  // Per-challenge state: selected word and whether it was correct.
  const [picks, setPicks] = useState<Record<number, { word: string; correct: boolean }>>({});
  const [wrongFlash, setWrongFlash] = useState<Record<number, string>>({});

  async function beginGenerate() {
    const mnemonic = await engine.generateWallet(wordCount);
    setPhrase(mnemonic.phrase);
    setPicks({});
    setWrongFlash({});
    setStep("reveal");
  }

  async function copyPhrase() {
    await navigator.clipboard.writeText(phrase);
    toast.warning("Seed copied to clipboard", {
      description: "Clear it once you have written it down.",
    });
  }

  function handlePick(challengeIdx: number, wordIndex: number, chosen: string) {
    const correct = words[wordIndex] === chosen;
    if (correct) {
      setPicks((p) => ({ ...p, [challengeIdx]: { word: chosen, correct: true } }));
      setWrongFlash((f) => {
        const { [challengeIdx]: _, ...rest } = f;
        return rest;
      });
    } else {
      setWrongFlash((f) => ({ ...f, [challengeIdx]: chosen }));
      // Clear the red flash after a moment so user can retry.
      setTimeout(() => {
        setWrongFlash((f) => {
          if (f[challengeIdx] !== chosen) return f;
          const { [challengeIdx]: _, ...rest } = f;
          return rest;
        });
      }, 900);
    }
  }

  const allCorrect =
    challenges.length > 0 && challenges.every((_, i) => picks[i]?.correct);

  // Once every challenge is correct, move on to set a password.
  useEffect(() => {
    if (step !== "confirm" || !allCorrect) return;
    setStep("password");
  }, [step, allCorrect]);

  const passwordValid = password.length >= 8 && password === passwordConfirm;

  async function finalize() {
    if (!passwordValid || creating) return;
    setCreating(true);
    setCreateError(null);
    try {
      const wallet = await engine.deriveWallet(phrase, password);
      setPhrase("");
      setPicks({});
      setPassword("");
      setPasswordConfirm("");
      unlockWithWallet(wallet);
      setStep("done");
      setTimeout(() => void navigate({ to: "/wallet" }), 500);
    } catch (e) {
      setCreateError(errToString(e));
    } finally {
      setCreating(false);
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

            <div className="mt-6">
              <p className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Seed length
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {([12, 24] as const).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setWordCount(n)}
                    className={
                      "mono rounded-md border px-4 py-3 text-left text-sm uppercase tracking-wider transition-colors " +
                      (wordCount === n
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-background/40 text-muted-foreground hover:border-border-strong hover:text-foreground")
                    }
                  >
                    <span className="block text-base font-semibold">{n} words</span>
                    <span className="mt-1 block text-[10px] normal-case tracking-normal text-muted-foreground">
                      {n === 12 ? "Standard security" : "Highest security"}
                    </span>
                  </button>
                ))}
              </div>
            </div>

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
              Generate {wordCount}-word seed
            </Button>
          </section>
        )}

        {step === "reveal" && (
          <section className="zk-panel-elevated p-8">
            <p className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Step 2 · Backup · {words.length} words
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

        {step === "password" && (
          <section className="zk-panel-elevated p-8">
            <p className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Step 4 · Protect
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">Set a password</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              This password encrypts your keys on this device. You'll enter it to unlock the wallet
              and to sign transactions. It is never sent anywhere and cannot be recovered — if you
              forget it, restore from your seed phrase.
            </p>

            <form
              className="mt-6 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                void finalize();
              }}
            >
              <div>
                <label className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Password
                </label>
                <Input
                  type="password"
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="mt-1.5"
                />
              </div>
              <div>
                <label className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Confirm password
                </label>
                <Input
                  type="password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  placeholder="Re-enter password"
                  className="mt-1.5"
                />
              </div>
              {passwordConfirm.length > 0 && password !== passwordConfirm && (
                <p className="mono text-[11px] uppercase tracking-wider text-destructive">
                  Passwords do not match
                </p>
              )}
              {createError && (
                <p className="mono text-[11px] uppercase tracking-wider text-destructive">
                  {createError}
                </p>
              )}
              <Button
                type="submit"
                disabled={!passwordValid || creating}
                className="mono w-full uppercase tracking-wider"
              >
                {creating ? "Creating wallet…" : "Create wallet"}
              </Button>
            </form>
          </section>
        )}

        {step === "confirm" && (
          <section className="zk-panel-elevated p-8">
            <p className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Step 3 · Verify
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">Confirm your seed</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Tap the correct word for each position. Correct picks turn green, wrong picks turn
              red — you can try again until it's right.
            </p>

            <div className="mt-6 space-y-6">
              {challenges.map((ch, ci) => {
                const pick = picks[ci];
                const wrong = wrongFlash[ci];
                return (
                  <div key={ci}>
                    <div className="mono flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
                      <span>Word #{ch.index + 1}</span>
                      {pick?.correct && (
                        <span className="flex items-center gap-1 text-success">
                          <Check className="h-3 w-3" /> Correct
                        </span>
                      )}
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {ch.options.map((opt) => {
                        const isCorrectPick = pick?.correct && pick.word === opt;
                        const isWrongFlash = wrong === opt;
                        const disabled = pick?.correct === true;
                        return (
                          <button
                            key={opt}
                            type="button"
                            disabled={disabled}
                            onClick={() => handlePick(ci, ch.index, opt)}
                            className={
                              "mono flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm transition-colors " +
                              (isCorrectPick
                                ? "border-success bg-success/10 text-success"
                                : isWrongFlash
                                  ? "border-destructive bg-destructive/10 text-destructive"
                                  : disabled
                                    ? "border-border bg-background/20 text-muted-foreground opacity-60"
                                    : "border-border bg-background/40 text-foreground hover:border-border-strong")
                            }
                          >
                            <span>{opt}</span>
                            {isCorrectPick && <Check className="h-3.5 w-3.5" />}
                            {isWrongFlash && <X className="h-3.5 w-3.5" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 flex items-center justify-between">
              <Button variant="ghost" onClick={() => setStep("reveal")} className="mono uppercase tracking-wider">
                Back
              </Button>
              <p className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {Object.values(picks).filter((p) => p.correct).length}/{challenges.length} correct
              </p>
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
