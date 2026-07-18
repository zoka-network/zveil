import { createFileRoute } from "@tanstack/react-router";
import { QRCodeSVG } from "qrcode.react";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/wallet/WalletProvider";

export const Route = createFileRoute("/wallet/receive")({
  component: ReceivePage,
});

function ReceivePage() {
  const { wallet } = useWallet();
  if (!wallet) return null;
  const addr = wallet.primaryAddress.value;

  async function copy() {
    await navigator.clipboard.writeText(addr);
    toast.success("Address copied");
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Receive ZKA</h1>
        <p className="mono mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
          Share your address · Verify the first and last characters
        </p>
      </header>

      <section className="zk-panel-elevated flex flex-col items-center p-8">
        <div className="rounded-lg bg-primary p-4">
          <QRCodeSVG value={addr} size={200} bgColor="transparent" fgColor="#000" level="M" />
        </div>
        <p className="mono mt-6 max-w-full break-all text-center text-sm">{addr}</p>
        <div className="mono mt-4 text-[10px] uppercase tracking-widest text-muted-foreground">
          Starts with{" "}
          <span className="text-foreground">{addr.slice(0, 6)}</span> · ends with{" "}
          <span className="text-foreground">{addr.slice(-6)}</span>
        </div>
        <Button onClick={copy} variant="outline" className="mono mt-6 uppercase tracking-wider">
          <Copy className="mr-1.5 h-3.5 w-3.5" />
          Copy address
        </Button>
      </section>

      <p className="mono px-2 text-[10px] uppercase tracking-widest text-muted-foreground">
        A Zoka payment URI is not implemented yet — waiting on the official spec.
      </p>
    </div>
  );
}
