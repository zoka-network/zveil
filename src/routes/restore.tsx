import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ZokaLogo } from "@/components/zoka/ZokaLogo";
import { DevEngineBanner } from "@/components/zoka/DevEngineBanner";
import { useWallet } from "@/wallet/WalletProvider";
import { errToString } from "@/wallet/errors";
import { isDesktop } from "@/wallet/runtime";
import { hasStoredWalletSync } from "@/wallet/storage/localWallet";

export const Route = createFileRoute("/restore")({
  beforeLoad: () => {
    if (hasStoredWalletSync()) throw redirect({ to: "/wallet" });
  },
  component: RestorePage,
});

type WordCount = 12 | 24;

// Mirror the mock wordlist available to the mock engine. In production this
// list comes from the official Zoka WASM bundle (engine.getWordlist()).
const WORDLIST = [
  "abandon", "ability", "able", "about", "above", "absent", "absorb", "abstract",
  "absurd", "abuse", "access", "accident", "account", "accuse", "achieve", "acid",
  "acoustic", "acquire", "across", "action", "actor", "actress", "actual", "adapt",
];

function normalize(w: string): string {
  return w.trim().toLowerCase();
}

function RestorePage() {
  const { engine, unlockWithWallet, hasStoredWallet } = useWallet();
  const navigate = useNavigate();

  // Never overwrite an existing device wallet from the restore flow.
  useEffect(() => {
    if (hasStoredWallet) void navigate({ to: "/wallet" });
  }, [hasStoredWallet, navigate]);

  const [wordCount, setWordCount] = useState<WordCount>(12);
  const [words, setWords] = useState<string[]>(() => Array.from({ length: 12 }, () => ""));
  const [focused, setFocused] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const desktop = isDesktop();

  function changeCount(n: WordCount) {
    setWordCount(n);
    setWords(Array.from({ length: n }, () => ""));
    setFocused(null);
  }

  function setWordAt(i: number, value: string) {
    // If pasting the full mnemonic, distribute across slots.
    const tokens = value.trim().split(/\s+/).filter(Boolean);
    if (tokens.length > 1) {
      const next = Array.from({ length: wordCount }, (_, j) => words[j] ?? "");
      for (let k = 0; k < tokens.length && i + k < wordCount; k++) {
        next[i + k] = normalize(tokens[k]);
      }
      setWords(next);
      const nextFocus = Math.min(i + tokens.length, wordCount - 1);
      inputsRef.current[nextFocus]?.focus();
      return;
    }
    setWords((w) => {
      const next = w.slice();
      next[i] = normalize(value);
      return next;
    });
  }

  function onKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === " " || e.key === "Enter" || e.key === "Tab") {
      if (words[i]?.length && i < wordCount - 1) {
        e.preventDefault();
        inputsRef.current[i + 1]?.focus();
      }
    } else if (e.key === "Backspace" && !words[i] && i > 0) {
      e.preventDefault();
      inputsRef.current[i - 1]?.focus();
    }
  }

  const validity = useMemo(
    () =>
      words.map((w) => {
        if (!w) return "empty" as const;
        // The real 2048-word list lives inside `zoka` and is checked on restore;
        // the mock's tiny list would flag real seed words as invalid.
        if (desktop) return "valid" as const;
        return WORDLIST.includes(w) ? "valid" as const : "invalid" as const;
      }),
    [words, desktop],
  );

  const allValid = validity.every((v) => v === "valid") && words.length === wordCount;
  const passwordValid = password.length >= 8 && password === passwordConfirm;

  async function tryRestore() {
    if (busy || !allValid || !passwordValid) return;
    const phrase = words.join(" ");
    setBusy(true);
    setError(null);
    try {
      const ok = await engine.validateMnemonic(phrase);
      if (!ok) {
        toast.error("Invalid seed phrase", {
          description: "The words are individually valid but the checksum does not match.",
        });
        return;
      }
      const wallet = await engine.restoreWallet(phrase, password);
      setWords(Array.from({ length: wordCount }, () => ""));
      setPassword("");
      setPasswordConfirm("");
      unlockWithWallet(wallet);
      void navigate({ to: "/wallet" });
    } catch (e) {
      setError(errToString(e));
    } finally {
      setBusy(false);
    }
  }

  const currentFragment = focused !== null ? words[focused] ?? "" : "";
  const suggestions = useMemo(() => {
    if (desktop || focused === null || !currentFragment || validity[focused] === "valid") return [];
    return WORDLIST.filter((w) => w.startsWith(currentFragment)).slice(0, 8);
  }, [focused, currentFragment, validity, desktop]);

  const validCount = validity.filter((v) => v === "valid").length;

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
            Enter each word of your seed phrase. Valid words turn green, unknown words turn red.
            Nothing is sent anywhere — validation happens entirely in this browser.
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
                  onClick={() => changeCount(n)}
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

          <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {words.map((w, i) => {
              const state = validity[i];
              const borderClass =
                state === "valid"
                  ? "border-success bg-success/10 text-success focus-within:border-success"
                  : state === "invalid"
                    ? "border-destructive bg-destructive/10 text-destructive focus-within:border-destructive"
                    : "border-border bg-background/40 focus-within:border-border-strong";
              return (
                <div
                  key={i}
                  className={
                    "mono flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm transition-colors " +
                    borderClass
                  }
                >
                  <span className="w-5 shrink-0 text-[10px] text-muted-foreground">{i + 1}</span>
                  <Input
                    ref={(el) => {
                      inputsRef.current[i] = el;
                    }}
                    value={w}
                    onChange={(e) => setWordAt(i, e.target.value)}
                    onKeyDown={(e) => onKeyDown(i, e)}
                    onFocus={() => setFocused(i)}
                    onBlur={() => setTimeout(() => setFocused((f) => (f === i ? null : f)), 120)}
                    autoComplete="off"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    className="mono h-7 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
                  />
                  {state === "valid" && <Check className="h-3.5 w-3.5 shrink-0" />}
                  {state === "invalid" && <X className="h-3.5 w-3.5 shrink-0" />}
                </div>
              );
            })}
          </div>

          {focused !== null && suggestions.length > 0 && (
            <div className="mt-4">
              <p className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Suggestions for word #{focused + 1}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    // onMouseDown fires before onBlur so the click registers
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setWordAt(focused, s);
                      if (focused < wordCount - 1) {
                        inputsRef.current[focused + 1]?.focus();
                      }
                    }}
                    className="mono rounded-md border border-border bg-background/40 px-3 py-1.5 text-sm text-foreground hover:border-border-strong"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 border-t border-border pt-6">
            <p className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Set a password
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Encrypts the restored keys on this device. You'll use it to unlock and to sign.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password (min 8 chars)"
              />
              <Input
                type="password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                placeholder="Confirm password"
              />
            </div>
            {passwordConfirm.length > 0 && password !== passwordConfirm && (
              <p className="mono mt-2 text-[11px] uppercase tracking-wider text-destructive">
                Passwords do not match
              </p>
            )}
            {error && (
              <p className="mono mt-2 text-[11px] uppercase tracking-wider text-destructive">
                {error}
              </p>
            )}
          </div>

          <div className="mt-6 flex items-center justify-between">
            <p className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {validCount}/{wordCount} valid
            </p>
            <Button
              className="mono uppercase tracking-wider"
              disabled={!allValid || !passwordValid || busy}
              onClick={tryRestore}
            >
              {busy ? "Restoring…" : "Restore wallet"}
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
