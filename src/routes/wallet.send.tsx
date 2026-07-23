import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, Check, ClipboardPaste, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useWallet } from "@/wallet/WalletProvider";
import { errToString } from "@/wallet/errors";
import { atomsToZka } from "@/wallet/format";
import { isPositiveAmount } from "@/wallet/security/validation";

export const Route = createFileRoute("/wallet/send")({
  component: SendPage,
});

type Stage = "idle" | "working" | "success";

function SendPage() {
  const { engine, rpc, wallet, nodeState } = useWallet();
  const queryClient = useQueryClient();
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [stage, setStage] = useState<Stage>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [addrOk, setAddrOk] = useState<boolean | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const balance = useQuery({
    queryKey: ["balance", wallet?.primaryAddress.value],
    enabled: !!wallet,
    queryFn: () =>
      engine.scanWallet({ secretHandle: wallet!.secretHandle, fromHeight: 0, toHeight: 0 }),
  });
  const availableAtoms = balance.data?.balanceAvailable ?? null;

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  async function validateAddress(value?: string) {
    const ok = await engine.validateAddress((value ?? recipient).trim());
    setAddrOk(ok);
    return ok;
  }

  async function pasteRecipient() {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) return;
      setRecipient(text.trim());
      await validateAddress(text.trim());
    } catch {
      toast.error("Could not read clipboard");
    }
  }

  function setMax() {
    if (availableAtoms === null) return;
    setAmount(atomsToZka(availableAtoms));
  }

  async function openConfirm() {
    const ok = await validateAddress();
    if (!ok) {
      toast.error("Invalid Zoka address");
      return;
    }
    if (!isPositiveAmount(amount)) {
      toast.error("Amount must be a positive number");
      return;
    }
    setStage("idle");
    setElapsed(0);
    setConfirmOpen(true);
  }

  async function submit() {
    if (stage === "working") return;
    setStage("working");
    setElapsed(0);
    timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    try {
      const unsigned = await engine.buildTransaction({
        secretHandle: { __opaque: "zoka-opaque-key" } as never,
        recipient: { value: recipient.trim() },
        amount,
        feePreference: "normal",
      });
      const proved = await engine.proveTransaction(unsigned);
      const signed = await engine.signTransaction(proved);
      await rpc.broadcastTransaction(signed.raw);

      if (timerRef.current) clearInterval(timerRef.current);
      setStage("success");
      void queryClient.invalidateQueries({ queryKey: ["balance"] });
      void queryClient.invalidateQueries({ queryKey: ["wallet-history"] });
      toast.success("Transaction broadcast", {
        description: signed.txId ? `Tx id: ${signed.txId.slice(0, 12)}…` : undefined,
      });
      setTimeout(() => {
        setConfirmOpen(false);
        setStage("idle");
        setRecipient("");
        setAmount("");
        setNote("");
        setAddrOk(null);
      }, 1100);
    } catch (e) {
      if (timerRef.current) clearInterval(timerRef.current);
      setStage("idle");
      toast.error("Failed to send", { description: errToString(e) });
    }
  }

  const addrTrimmed = recipient.trim();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Send ZKA</h1>
        <p className="mono mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
          Transactions are private · Built and signed locally
        </p>
      </header>

      <section className="zk-panel-elevated p-6 md:p-8">
        <div className="space-y-5">
          <div>
            <Label className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Recipient address
            </Label>
            <div className="mt-1 flex gap-2">
              <Input
                value={recipient}
                onChange={(e) => {
                  setRecipient(e.target.value);
                  setAddrOk(null);
                }}
                onBlur={() => recipient && void validateAddress()}
                className="mono"
                autoComplete="off"
                spellCheck={false}
                placeholder="zka1…"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={pasteRecipient}
                title="Paste"
                aria-label="Paste address"
              >
                <ClipboardPaste className="h-3.5 w-3.5" />
              </Button>
            </div>
            {addrOk === false && (
              <p className="mono mt-1 text-[10px] uppercase tracking-widest text-destructive">
                Invalid address
              </p>
            )}
            {addrOk === true && (
              <div className="mono mt-1.5 flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-success">
                <Check className="h-3 w-3 shrink-0" />
                Starts with{" "}
                <span className="text-foreground">{addrTrimmed.slice(0, 6)}</span> · ends with{" "}
                <span className="text-foreground">{addrTrimmed.slice(-6)}</span>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Amount (ZKA)
              </Label>
              {availableAtoms !== null && (
                <button
                  type="button"
                  onClick={setMax}
                  className="mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
                >
                  Max: {atomsToZka(availableAtoms)}
                </button>
              )}
            </div>
            <div className="mt-1 flex gap-2">
              <Input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="decimal"
                className="mono"
                placeholder="0.000000"
              />
              <Button
                type="button"
                variant="outline"
                onClick={setMax}
                disabled={availableAtoms === null}
                className="mono shrink-0 uppercase tracking-wider"
              >
                Max
              </Button>
            </div>
          </div>

          <div>
            <Label className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Local note (optional · stored locally)
            </Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="mt-1"
              placeholder="Never leaves this device"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-border pt-5 text-sm">
            <div>
              <p className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Fee
              </p>
              <p className="mono mt-1">Set by the network</p>
            </div>
            <div>
              <p className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Total
              </p>
              <p className="mono mt-1">{isPositiveAmount(amount) ? `≥ ${amount}` : "—"} ZKA</p>
            </div>
          </div>

          <Button
            onClick={openConfirm}
            className="mono w-full uppercase tracking-wider"
            disabled={!recipient || !isPositiveAmount(amount)}
          >
            Review send
          </Button>
        </div>
      </section>

      <Dialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (stage === "working") return;
          setConfirmOpen(open);
        }}
      >
        <DialogContent className="max-w-md">
          {stage === "success" ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-success/30 bg-success/10 text-success">
                <Check className="h-7 w-7" />
              </div>
              <p className="text-sm font-medium">Sent</p>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Confirm transaction</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <Row label="Recipient" value={recipient} mono />
                <Row label="Amount" value={`${amount} ZKA`} mono />
                <Row label="Fee" value="Set by the network" mono />
                <Row label="Total" value={`≥ ${amount} ZKA`} mono />
                <Row label="Network" value="Zoka Mainnet" />
                <Row label="Connection" value={nodeState.ready ? "Connected" : "Syncing"} />
              </div>
              {!nodeState.ready && (
                <div className="rounded-md border border-warning/30 bg-warning/5 p-3 text-xs text-warning">
                  <AlertTriangle className="mr-1.5 inline h-3.5 w-3.5" />
                  The node is still syncing. Sending now may be slow or fail — waiting until it's
                  connected is recommended.
                </div>
              )}
              {stage === "working" ? (
                <div className="flex items-center gap-3 rounded-md border border-border bg-accent/40 p-3 text-xs text-muted-foreground">
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                  <span>
                    Generating a private proof and broadcasting — this can take up to a minute
                    ({elapsed}s)
                  </span>
                </div>
              ) : (
                <div className="rounded-md border border-warning/30 bg-warning/5 p-3 text-xs text-warning">
                  <AlertTriangle className="mr-1.5 inline h-3.5 w-3.5" />
                  Verify the full address. Zoka transactions cannot be reversed.
                </div>
              )}
              <DialogFooter>
                <Button
                  variant="ghost"
                  onClick={() => setConfirmOpen(false)}
                  disabled={stage === "working"}
                >
                  Cancel
                </Button>
                <Button
                  onClick={submit}
                  disabled={stage === "working"}
                  className="mono uppercase tracking-wider"
                >
                  {stage === "working" ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Signing…
                    </>
                  ) : (
                    "Sign & broadcast"
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border pb-2 last:border-none">
      <span className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <span className={"break-all text-right " + (mono ? "mono" : "")}>{value}</span>
    </div>
  );
}
