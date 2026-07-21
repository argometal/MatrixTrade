export type PreviewNavContext = {
  pendingInboxCount: number;
  cycleLabel: string;
  closedTrades: number;
  monthlyLossRoom: number;
  monthlyLossRoomLabel: string;
};

/**
 * Scout = war room (case). Trades = histórico filtrable. Playbook = policies.
 * Enter Trade removed — execute via Scout + Control.
 */
export const PREVIEW_NAV_SECTIONS = [
  {
    id: "pipeline",
    label: "Pipeline",
    items: [
      { href: "/home-preview", label: "Dashboard" },
      { href: "/planning", label: "Scout" },
    ],
  },
  {
    id: "book",
    label: "Book",
    items: [
      { href: "/trades", label: "Trades" },
      { href: "/playbook", label: "Playbook" },
      { href: "/stats", label: "Insights" },
    ],
  },
  {
    id: "system",
    label: "System",
    items: [
      { href: "/inbox", label: "History", badge: "inbox" as const },
      { href: "/system", label: "System" },
      { href: "/connect", label: "Connect" },
    ],
  },
] as const;

export const PREVIEW_MOBILE_TABS = [
  { href: "/home-preview", label: "Dashboard" },
  { href: "/planning", label: "Scout" },
  { href: "/trades", label: "Trades" },
] as const;

export function isPreviewNavActive(pathname: string, href: string): boolean {
  if (href === "/home-preview") return pathname === "/home-preview";
  if (href === "/trades-preview") return pathname === "/trades-preview" || pathname === "/planning";
  if (href === "/planning") return pathname === "/planning" || pathname.startsWith("/planning/");
  if (href === "/trades") return pathname === "/trades" || pathname.startsWith("/trades/");
  if (href === "/stats") return pathname === "/stats" || pathname.startsWith("/stats/");
  return pathname === href || pathname.startsWith(`${href}/`);
}
