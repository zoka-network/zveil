import { useEffect, useRef, useState } from "react";
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
 * Intercepts the window's close request (the titlebar X) and asks for
 * confirmation before actually exiting. Desktop-only: in the browser preview
 * there is no native window to intercept.
 */
export function CloseConfirmGate() {
  const [open, setOpen] = useState(false);
  const confirmedRef = useRef(false);
  const windowRef = useRef<import("@tauri-apps/api/window").Window | null>(null);

  useEffect(() => {
    if (!isDesktop()) return;
    let unlisten: (() => void) | undefined;
    let cancelled = false;

    void import("@tauri-apps/api/window").then(({ getCurrentWindow }) => {
      if (cancelled) return;
      const win = getCurrentWindow();
      windowRef.current = win;
      void win
        .onCloseRequested((event) => {
          if (confirmedRef.current) return;
          event.preventDefault();
          setOpen(true);
        })
        .then((fn) => {
          if (cancelled) fn();
          else unlisten = fn;
        });
    });

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);

  async function confirmClose() {
    confirmedRef.current = true;
    await windowRef.current?.close();
  }

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
            onClick={() => void confirmClose()}
            className="mono uppercase tracking-wider"
          >
            Close Zveil
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
