export type PreviewNavContext = {
  pendingInboxCount: number;
  cycleLabel: string;
  closedTrades: number;
  monthlyLossRoom: number;
  monthlyLossRoomLabel: string;
};

/**
 * Single source for desktop sidebar + mobile menu.
 * Pipeline order: Dashboard (today) → Scouting (decide) → Enter Trade (execute).
 * Book: Trades (positions) → Playbook (how) → Insights (learn).
 */
export const PREVIEW_NAV_SECTIONS = [
  {
    id: "pipeline",
    label: "Pipeline",
    items: [
      { href: "/home-preview", label: "Dashboard" },
      { href: "/planning", label: "Scouting Desk" },
      { href: "/trades-preview", label: "Enter Trade" },
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

/** Bottom tab bar — today + book + history (Enter Trade lives in Pipeline menu). */
export const PREVIEW_MOBILE_TABS = [
  { href: "/home-preview", label: "Dashboard" },
  { href: "/trades", label: "Trades" },
  { href: "/inbox", label: "History" },
] as const;

export function isPreviewNavActive(pathname: string, href: string): boolean {
  if (href === "/home-preview") return pathname === "/home-preview";
  if (href === "/trades-preview") return pathname === "/trades-preview";
  if (href === "/trades") return pathname === "/trades" || pathname.startsWith("/trades/");
  if (href === "/stats") return pathname === "/stats" || pathname.startsWith("/stats/");
  return pathname === href || pathname.startsWith(`${href}/`);
}
