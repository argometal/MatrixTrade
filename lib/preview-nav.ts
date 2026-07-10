export type PreviewNavContext = {
  pendingInboxCount: number;
  cycleLabel: string;
  closedTrades: number;
  monthlyLossRoom: number;
  monthlyLossRoomLabel: string;
};
/** Full MatrixTrade route audit — single source for desktop sidebar + mobile menu. */
export const PREVIEW_NAV_SECTIONS = [
  {
    id: "workspace",
    label: "Workspace",
    items: [
      { href: "/home-preview", label: "Dashboard" },
      { href: "/trades-preview", label: "New Trade" },
      { href: "/exchange", label: "Assistant" },
    ],
  },
  {
    id: "trading",
    label: "Trading",
    items: [
      { href: "/trades", label: "Trades" },
      { href: "/playbook", label: "Playbook" },
      { href: "/planning", label: "Scouting Desk" },
      { href: "/review", label: "Review" },
      { href: "/stats", label: "Statistics" },
      { href: "/journal", label: "Journal" },
      { href: "/mistakes", label: "Mistakes" },
    ],
  },
  {
    id: "system",
    label: "System",
    items: [
      { href: "/inbox", label: "Inbox", badge: "inbox" as const },
      { href: "/system", label: "System" },
      { href: "/connect", label: "Connect" },
    ],
  },
] as const;

/** Bottom tab bar — quick access on phone. */
export const PREVIEW_MOBILE_TABS = [
  { href: "/home-preview", label: "Dashboard" },
  { href: "/trades-preview", label: "New Trade" },
  { href: "/inbox", label: "Inbox" },
] as const;

export function isPreviewNavActive(pathname: string, href: string): boolean {
  if (href === "/home-preview") return pathname === "/home-preview";
  if (href === "/trades-preview") return pathname === "/trades-preview";
  if (href === "/trades") return pathname === "/trades";
  return pathname === href || pathname.startsWith(`${href}/`);
}
