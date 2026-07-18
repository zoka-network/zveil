/**
 * Best-effort memory hygiene helpers.
 *
 * JavaScript strings are immutable and garbage-collected — we CANNOT reliably
 * zero out a mnemonic or a private key held as a string. Prefer Uint8Array
 * for sensitive material and call `zero()` on it as soon as possible.
 */

export function zero(buf: Uint8Array): void {
  buf.fill(0);
}

/** Wraps sensitive text in a Uint8Array so it can be zeroed after use. */
export function textToSecretBytes(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

/** Immediately clears a field on an object (best-effort). */
export function clearField<T extends object, K extends keyof T>(obj: T, key: K): void {
  try {
    (obj as Record<string, unknown>)[key as string] = undefined;
  } catch {
    /* ignore frozen objects */
  }
}
