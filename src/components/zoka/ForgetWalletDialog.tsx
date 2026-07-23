import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ForgetWalletDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

/**
 * Confirmation gate for an irreversible, no-undo action: forgetting a wallet
 * wipes it from this device. Without a written-down seed, that permanently
 * loses access to the funds — this must never fire from a single click.
 */
export function ForgetWalletDialog({ open, onOpenChange, onConfirm }: ForgetWalletDialogProps) {
  const [acknowledged, setAcknowledged] = useState(false);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setAcknowledged(false);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Forget this wallet?</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            This removes the wallet from this device. Your funds are not affected — they still
            exist on the network — but you will need your seed phrase to access them again here.
          </p>
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
            <AlertTriangle className="mr-1.5 inline h-3.5 w-3.5 shrink-0" />
            If you have not written down your seed phrase, you will permanently lose access to
            these funds.
          </div>
        </div>
        <label className="mt-2 flex items-start gap-3 text-sm">
          <Checkbox
            checked={acknowledged}
            onCheckedChange={(v) => setAcknowledged(Boolean(v))}
            className="mt-0.5"
          />
          <span className="text-muted-foreground">I have my seed phrase backed up offline.</span>
        </label>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={!acknowledged}
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
            className="mono uppercase tracking-wider"
          >
            Forget wallet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
