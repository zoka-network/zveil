import { useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";

import { isDesktop } from "@/wallet/runtime";

/** The packaged shell's own version (Cargo.toml), not the wallet engine's. */
export function useAppVersion() {
  return useQuery({
    queryKey: ["shell-version"],
    queryFn: () => invoke<string>("shell_version"),
    enabled: isDesktop(),
    staleTime: Infinity,
  });
}
