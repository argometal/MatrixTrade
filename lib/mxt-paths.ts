/**
 * MXT product path namespace (/mxt) — display/routing boundary only.
 * Does not rename packages, APIs, or MTAE identifiers.
 *
 * Temporary compatibility: /mta/* still recognized and redirected to /mxt/*.
 */

export const MXT_BASE = "/mxt";

/** Temporary Prompt #6 namespace — redirect to /mxt. */
export const MXT_COMPAT_BASE = "/mta";

/** Trading page prefixes that live under /mxt (filesystem routes remain unprefixed). */
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

function stripBase(pathname: string, base: string): string | null {
  if (pathname === base) return "/";
  if (pathname.startsWith(`${base}/`)) {
    const rest = pathname.slice(base.length);
    return rest.length > 0 ? rest : "/";
  }
  return null;
}

/** Strip /mxt or temporary /mta prefix for matching against filesystem route paths. */
export function stripMxtPrefix(pathname: string): string {
  return (
    stripBase(pathname, MXT_BASE) ??
    stripBase(pathname, MXT_COMPAT_BASE) ??
    pathname
  );
}

/**
 * Canonical in-app MXT href. Idempotent if already under /mxt.
 * Maps temporary /mta/* → /mxt/*. Bare "/" maps to the MXT dashboard.
 */
export function mxtPath(path: string): string {
  const raw = (path.split("?")[0] || path).trim() || "/";
  const q = path.includes("?") ? path.slice(path.indexOf("?")) : "";
  let p = raw.startsWith("/") ? raw : `/${raw}`;
  if (p === "/") {
    return `${MXT_BASE}/home-preview${q}`;
  }
  const stripped = stripMxtPrefix(p);
  if (p === MXT_BASE || p.startsWith(`${MXT_BASE}/`)) {
    return `${p}${q}`;
  }
  if (p === MXT_COMPAT_BASE || p.startsWith(`${MXT_COMPAT_BASE}/`)) {
    return `${MXT_BASE}${stripped === "/" ? "" : stripped}${q}`;
  }
  return `${MXT_BASE}${p}${q}`;
}

/** True when already on canonical /mxt (no redirect needed). */
export function isUnderMxtBase(pathname: string): boolean {
  return pathname === MXT_BASE || pathname.startsWith(`${MXT_BASE}/`);
}

/** Temporary /mta namespace — should redirect to /mxt. */
export function isUnderMtaCompatBase(pathname: string): boolean {
  return pathname === MXT_COMPAT_BASE || pathname.startsWith(`${MXT_COMPAT_BASE}/`);
}

/** True when pathname is an MXT trading surface (with or without /mxt|/mta prefix). */
export function isMxtTradingPath(pathname: string): boolean {
  const p = stripMxtPrefix(pathname);
  if (p === "/") return false;
  return MXT_LEGACY_PREFIXES.some(
    (prefix) => p === prefix || p.startsWith(`${prefix}/`)
  );
}
