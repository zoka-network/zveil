/**
 * Turn any thrown/rejected value into a readable message. Tauri commands reject
 * with a plain string (the Rust `Err(String)`), not an `Error`, so reading
 * `.message` on it yields `undefined`. This handles strings, Errors and objects
 * alike.
 */
export function errToString(e: unknown): string {
  if (e == null) return "Unknown error";
  if (typeof e === "string") return e;
  if (e instanceof Error) return e.message;
  if (typeof e === "object" && "message" in e && typeof (e as { message: unknown }).message === "string") {
    return (e as { message: string }).message;
  }
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}
