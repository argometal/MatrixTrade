export type PreviewNavContext = {
  pendingInboxCount: number;
  cycleLabel: string;
  tradesUsed: number;
  tradesMax: number;
  lossBudgetRemaining: number;
  lossBudgetLabel: string;
};

export const PREVIEW_NAV_MAIN = [
  { href: "/", label: "Dashboard" },
  { href: "/home-preview", label: "Home preview" },
  { href: "/trades-preview", label: "Trades preview" },
  { href: "/playbook", label: "Playbook" },
  { href: "/review", label: "Review" },
  { href: "/stats", label: "Statistics" },
  { href: "/journal", label: "Journal" },
] as const;

export const PREVIEW_NAV_SYSTEM = [
  { href: "/exchange", label: "Assistant" },
  { href: "/inbox", label: "Inbox" },
  { href: "/system", label: "System" },
] as const;

export function isPreviewNavActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  if (href === "/home-preview") return pathname === "/home-preview";
  if (href === "/trades-preview") return pathname === "/trades-preview";
  return pathname === href || pathname.startsWith(`${href}/`);
}
