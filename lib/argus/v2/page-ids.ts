/**
 * Argus v2 page identity codes — short stable IDs for bug reports (phone + web).
 * Format: A## · Label  (A = Argus). Prefer this over long hex for humans.
 */

export type V2PageId = {
  code: string;
  label: string;
};

const ROUTES: Array<{ match: (pathname: string) => boolean; id: V2PageId }> = [
  { match: (p) => p === "/argus/v2" || p === "/argus/v2/", id: { code: "A01", label: "Home" } },
  { match: (p) => p.startsWith("/argus/v2/inbox"), id: { code: "A02", label: "Inbox" } },
  { match: (p) => p.startsWith("/argus/v2/browse/organizations"), id: { code: "A03", label: "Organizations" } },
  { match: (p) => p.startsWith("/argus/v2/browse/projects"), id: { code: "A04", label: "Projects" } },
  { match: (p) => p.startsWith("/argus/v2/browse/network"), id: { code: "A05", label: "People" } },
  { match: (p) => p.startsWith("/argus/v2/browse/topics"), id: { code: "A06", label: "Topics" } },
  { match: (p) => p.startsWith("/argus/v2/browse/events"), id: { code: "A07", label: "Events" } },
  { match: (p) => p.startsWith("/argus/v2/organizations/"), id: { code: "A08", label: "Org detail" } },
  { match: (p) => p.startsWith("/argus/v2/projects/"), id: { code: "A09", label: "Project detail" } },
  { match: (p) => p.startsWith("/argus/v2/network/"), id: { code: "A10", label: "Person detail" } },
  { match: (p) => p.startsWith("/argus/v2/runbooks/"), id: { code: "A11", label: "Runbook" } },
  { match: (p) => p.startsWith("/argus/v2/deliver"), id: { code: "A12", label: "Export" } },
  { match: (p) => p.startsWith("/argus/v2/diagnostics"), id: { code: "A13", label: "Diagnostics" } },
  { match: (p) => p.startsWith("/argus/v2/help"), id: { code: "A14", label: "Help" } },
  { match: (p) => p.startsWith("/argus/search"), id: { code: "A15", label: "Search" } },
];

export function resolveV2PageId(pathname: string): V2PageId {
  for (const route of ROUTES) {
    if (route.match(pathname)) return route.id;
  }
  return { code: "A00", label: "Argus" };
}

export function formatV2PageId(id: V2PageId): string {
  return `${id.code} · ${id.label}`;
}

/** Full catalog for docs / MatrixTrade port. */
export function listV2PageIds(): V2PageId[] {
  const seen = new Set<string>();
  const out: V2PageId[] = [];
  for (const route of ROUTES) {
    if (seen.has(route.id.code)) continue;
    seen.add(route.id.code);
    out.push(route.id);
  }
  return out;
}
