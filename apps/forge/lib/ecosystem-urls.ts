/**
 * Cross-product URL boundaries for the independent Forge app (F3).
 * Defaults target the local monolith reference host (:3002).
 * Override via NEXT_PUBLIC_* for other environments — do not hardcode prod DNS in UI.
 */

function trimSlash(url: string): string {
  return url.replace(/\/$/, "");
}

export function matrixTradeBaseUrl(): string {
  return trimSlash(
    process.env.NEXT_PUBLIC_MATRIXTRADE_URL?.trim() || "http://localhost:3002"
  );
}

export function argusBaseUrl(): string {
  return trimSlash(process.env.NEXT_PUBLIC_ARGUS_URL?.trim() || "http://localhost:3002");
}

export function matrixTradeHref(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${matrixTradeBaseUrl()}${p}`;
}

export function argusHref(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${argusBaseUrl()}${p}`;
}
