import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { isDesktop } from "@/wallet/runtime";

/**
 * Shows a confirmation dialog before the app actually closes. The
 * interception itself lives in Rust (`on_window_event` in lib.rs) — this
 * component just listens for the "close-requested" event it emits and, on
 * confirm, calls the `force_close` command. Rust owns the interception
 * permanently for the app's whole lifetime; there's no per-mount JS listener
 * to keep alive here, which is what made an earlier, JS-only version of this
 * silently stop working after the first close attempt.
 */
export function CloseConfirmGate() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!isDesktop()) return;
    let unlisten: (() => void) | undefined;
    let cancelled = false;

    void import("@tauri-apps/api/event").then(({ listen }) => {
      if (cancelled) return;
      void listen("close-requested", () => setOpen(true)).then((fn) => {
        if (cancelled) fn();
        else unlisten = fn;
      });
    });

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);

  if (!isDesktop()) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Close Zveil?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Are you sure you want to close Zveil? The wallet will lock and the local node connection
          will stop.
        </p>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => void invoke("force_close")}
            className="mono uppercase tracking-wider"
          >
            Close Zveil
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
