/**
 * UI-side validators. Address / mnemonic validation for real must go through
 * the canonical Zoka engine (WasmZokaWalletEngine.validateAddress /
 * validateMnemonic). These helpers only do shape checks for form UX.
 */

export function looksLikeMnemonic(input: string): boolean {
  const words = input.trim().split(/\s+/).filter(Boolean);
  return words.length === 12 || words.length === 24;
}

export function isPositiveAmount(input: string): boolean {
  if (!/^\d+(\.\d+)?$/.test(input)) return false;
  return Number(input) > 0;
}

export function shortenAddress(addr: string, keep = 8): string {
  if (addr.length <= keep * 2 + 3) return addr;
  return `${addr.slice(0, keep)}…${addr.slice(-keep)}`;
}
