/** Atomic units (integer string) → a 6-decimal ZKA string. 1 ZKA = 1e6 atoms. */
export function atomsToZka(atoms: string): string {
  if (!atoms) return "0.000000";
  try {
    const a = BigInt(atoms);
    return `${a / 1_000_000n}.${(a % 1_000_000n).toString().padStart(6, "0")}`;
  } catch {
    return "0.000000";
  }
}
