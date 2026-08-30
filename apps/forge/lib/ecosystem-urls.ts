/**
 * Cross-product URL boundaries for the independent Forge app (F3).
 * Defaults target the local monolith reference host (:3002).
 * Override via NEXT_PUBLIC_* for other environments — do not hardcode prod DNS in UI.
 */

function trimSlash(url: string): string {
  return url.replace(/\/$/, "");
}

/** MXT product path prefix on the monolith. */
const MXT_BASE = "/mta";

function withMxtBase(path: string): string {
  const raw = (path.split("?")[0] || path).trim() || "/";
  const q = path.includes("?") ? path.slice(path.indexOf("?")) : "";
  let p = raw.startsWith("/") ? raw : `/${raw}`;
  if (p === "/") return `${MXT_BASE}/home-preview${q}`;
  if (p === MXT_BASE || p.startsWith(`${MXT_BASE}/`)) return `${p}${q}`;
  return `${MXT_BASE}${p}${q}`;
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
  return `${matrixTradeBaseUrl()}${withMxtBase(path)}`;
}

export function argusHref(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${argusBaseUrl()}${p}`;
}
