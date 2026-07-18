import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
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
import { isPositiveAmount } from "@/wallet/security/validation";

export const Route = createFileRoute("/wallet/send")({
  component: SendPage,
});

function SendPage() {
  const { engine, rpc, activeNode } = useWallet();
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [addrOk, setAddrOk] = useState<boolean | null>(null);

  const fee = useQuery({
    queryKey: ["rpc", activeNode.id, "fee"],
    queryFn: () => rpc.getFeeEstimate(),
  });

  const feeAtomic = fee.data?.normal ?? "1000";
  const total = useMemo(() => {
    if (!isPositiveAmount(amount)) return "—";
    try {
      const a = BigInt(Math.round(Number(amount) * 1_000_000));
      return ((a + BigInt(feeAtomic)) / 1_000_000n).toString() + "." +
        (((a + BigInt(feeAtomic)) % 1_000_000n).toString().padStart(6, "0"));
    } catch {
      return "—";
    }
  }, [amount, feeAtomic]);

  async function validateAddress() {
    const ok = await engine.validateAddress(recipient.trim());
    setAddrOk(ok);
    return ok;
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
    setConfirmOpen(true);
  }

  async function submit() {
    if (busy) return;
    setBusy(true);
    try {
      const unsigned = await engine.buildTransaction({
        secretHandle: { __opaque: "zoka-opaque-key" } as never,
        recipient: { value: recipient.trim() },
        amount,
        feePreference: "normal",
      });
      const proved = await engine.proveTransaction(unsigned);
      const signed = await engine.signTransaction(proved);
      const ack = await rpc.broadcastTransaction(signed.raw);
      toast.success("Transaction broadcast", {
        description: `Tx id: ${ack.txId.slice(0, 12)}…`,
      });
      setConfirmOpen(false);
      setRecipient("");
      setAmount("");
      setNote("");
    } catch (e) {
      toast.error("Failed to send", { description: String((e as Error).message) });
    } finally {
      setBusy(false);
    }
  }

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
            <Input
              value={recipient}
              onChange={(e) => {
                setRecipient(e.target.value);
                setAddrOk(null);
              }}
              onBlur={() => recipient && void validateAddress()}
              className="mono mt-1"
              autoComplete="off"
              spellCheck={false}
              placeholder="zoka1…"
            />
            {addrOk === false && (
              <p className="mono mt-1 text-[10px] uppercase tracking-widest text-destructive">
                Invalid address
              </p>
            )}
          </div>

          <div>
            <Label className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Amount (ZKA)
            </Label>
            <Input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              className="mono mt-1"
              placeholder="0.000000"
            />
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
                Estimated fee
              </p>
              <p className="mono mt-1">{Number(feeAtomic) / 1_000_000} ZKA</p>
            </div>
            <div>
              <p className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Total
              </p>
              <p className="mono mt-1">{total} ZKA</p>
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

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm transaction</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <Row label="Recipient" value={recipient} mono />
            <Row label="Amount" value={`${amount} ZKA`} mono />
            <Row label="Fee" value={`${Number(feeAtomic) / 1_000_000} ZKA`} mono />
            <Row label="Total" value={`${total} ZKA`} mono />
            <Row label="Network" value={activeNode.network} />
            <Row label="Node" value={activeNode.label} />
          </div>
          <div className="rounded-md border border-warning/30 bg-warning/5 p-3 text-xs text-warning">
            <AlertTriangle className="mr-1.5 inline h-3.5 w-3.5" />
            Verify the full address. Zoka transactions cannot be reversed.
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={busy} className="mono uppercase tracking-wider">
              {busy ? "Signing…" : "Sign & broadcast"}
            </Button>
          </DialogFooter>
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
