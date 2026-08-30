/**
 * MXT product path namespace (/mta) — display/routing boundary only.
 * Does not rename packages, APIs, or MTAE identifiers.
 */

export const MXT_BASE = "/mta";

/** Trading page prefixes that live under /mta (filesystem routes remain unprefixed). */
export const MXT_LEGACY_PREFIXES = [
  "/home-preview",
  "/trades-preview",
  "/trades",
  "/connect",
  "/inbox",
  "/exchange",
  "/ai-bridge",
  "/ai-workspace",
  "/planning",
  "/playbook",
  "/review",
  "/journal",
  "/system",
  "/stats",
  "/mistakes",
  "/stock-theses",
  "/scout-access",
  "/settings",
] as const;

/** Strip /mta prefix for matching against filesystem route paths. */
export function stripMxtPrefix(pathname: string): string {
  if (pathname === MXT_BASE) return "/";
  if (pathname.startsWith(`${MXT_BASE}/`)) {
    const rest = pathname.slice(MXT_BASE.length);
    return rest.length > 0 ? rest : "/";
  }
  return pathname;
}

/**
 * Canonical in-app MXT href. Idempotent if already under /mta.
 * Bare "/" maps to the MXT dashboard (not product root).
 */
export function mxtPath(path: string): string {
  const raw = (path.split("?")[0] || path).trim() || "/";
  const q = path.includes("?") ? path.slice(path.indexOf("?")) : "";
  let p = raw.startsWith("/") ? raw : `/${raw}`;
  if (p === "/") {
    return `${MXT_BASE}/home-preview${q}`;
  }
  if (p === MXT_BASE || p.startsWith(`${MXT_BASE}/`)) {
    return `${p}${q}`;
  }
  return `${MXT_BASE}${p}${q}`;
}

export function isUnderMxtBase(pathname: string): boolean {
  return pathname === MXT_BASE || pathname.startsWith(`${MXT_BASE}/`);
}

/** True when pathname is an MXT trading surface (with or without /mta prefix). */
export function isMxtTradingPath(pathname: string): boolean {
  const p = stripMxtPrefix(pathname);
  if (p === "/") return false;
  return MXT_LEGACY_PREFIXES.some(
    (prefix) => p === prefix || p.startsWith(`${prefix}/`)
  );
}
