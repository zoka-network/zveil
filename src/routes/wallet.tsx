import { createFileRoute } from "@tanstack/react-router";
import { WalletLayout } from "@/layouts/WalletLayout";
import { LockedScreen } from "@/components/zoka/LockedScreen";
import { useWallet } from "@/wallet/WalletProvider";

export const Route = createFileRoute("/wallet")({
  component: WalletRoot,
});

function WalletRoot() {
  const { status } = useWallet();
  if (status === "locked") return <LockedScreen />;
  return <WalletLayout />;
}

