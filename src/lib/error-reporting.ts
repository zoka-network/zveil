// Local-only error reporter. A wallet must never phone home: captured errors
// are logged to the console on the user's own device and transmitted nowhere.
export function reportAppError(error: unknown, context: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  const message =
    error instanceof Response
      ? `Response ${error.status}${error.url ? ` at ${error.url}` : ""}`
      : error instanceof Error
        ? error.message
        : String(error);
  console.error("[wallet] captured error:", message, {
    route: window.location.pathname,
    ...context,
  });
}
