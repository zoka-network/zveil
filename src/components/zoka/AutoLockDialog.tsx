import { Lock, ShieldAlert } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useWallet } from "@/wallet/WalletProvider";

/**
 * Shown when inactivity is about to auto-lock the wallet. Requires the user
 * to explicitly confirm they want to keep the session open — while this
 * dialog is up, ambient mouse/keyboard activity does NOT reset the timer.
 */
export function AutoLockDialog() {
  const { lockWarningVisible, secondsUntilLock, stayUnlocked, lock } = useWallet();

  return (
    <AlertDialog open={lockWarningVisible}>
      <AlertDialogContent className="pointer-events-auto">
        <AlertDialogHeader>
          <div className="mb-2 flex items-center gap-2 text-warning">
            <ShieldAlert className="h-4 w-4" />
            <span className="mono text-[10px] uppercase tracking-widest">
              Inactivity detected
            </span>
          </div>
          <AlertDialogTitle>Lock this wallet?</AlertDialogTitle>
          <AlertDialogDescription>
            For your safety, the session will be locked automatically in{" "}
            <span className="mono font-semibold text-foreground">
              {secondsUntilLock}s
            </span>
            . Locking wipes decrypted keys from memory — your funds stay safe
            and you can unlock again with your password.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={() => lock()}
            className="mono text-[11px] uppercase tracking-wider"
          >
            <Lock className="mr-1.5 h-3.5 w-3.5" />
            Lock now
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => stayUnlocked()}
            className="mono text-[11px] uppercase tracking-wider"
          >
            Stay signed in
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
