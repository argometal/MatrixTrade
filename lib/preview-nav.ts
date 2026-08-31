import { mxtPath, stripMxtPrefix } from "./mxt-paths";

export type PreviewNavContext = {
  pendingInboxCount: number;
  cycleLabel: string;
  closedTrades: number;
  monthlyLossRoom: number;
  monthlyLossRoomLabel: string;
};

/**
 * Scout = war room (case). Trades = filterable history. Playbook = policies.
 * Enter Trade removed — execute via Scout + Control.
 * Hrefs are canonical /mxt/* product paths.
 */
export const PREVIEW_NAV_SECTIONS = [
  {
    id: "pipeline",
    label: "Pipeline",
    items: [
      { href: mxtPath("/home-preview"), label: "Dashboard" },
      { href: mxtPath("/scout"), label: "Scout" },
      { href: mxtPath("/scout/capital"), label: "Capital" },
    ],
  },
  {
    id: "book",
    label: "Book",
    items: [
      { href: mxtPath("/trades"), label: "Trades" },
      { href: mxtPath("/playbook"), label: "Playbook" },
      { href: mxtPath("/stats"), label: "Insights" },
    ],
  },
  {
    id: "system",
    label: "System",
    items: [
      { href: mxtPath("/inbox"), label: "Proposals", badge: "inbox" as const },
      { href: mxtPath("/settings/capital"), label: "Capital Settings" },
      { href: mxtPath("/settings/security"), label: "Security" },
      { href: mxtPath("/system"), label: "System" },
    ],
  },
] as const;

export const PREVIEW_MOBILE_TABS = [
  { href: mxtPath("/home-preview"), label: "Dashboard" },
  { href: mxtPath("/scout"), label: "Scout" },
  { href: mxtPath("/trades"), label: "Trades" },
] as const;

export function isPreviewNavActive(pathname: string, href: string): boolean {
  const path = stripMxtPrefix(pathname);
  const target = stripMxtPrefix(href);

  if (target === "/home-preview") return path === "/home-preview";
  if (target === "/trades-preview") return path === "/trades-preview" || path === "/scout" || path === "/planning";
  if (target === "/scout/capital" || target === "/planning/capital") {
    return path === "/scout/capital" || path.startsWith("/scout/capital/") ||
      path === "/planning/capital" || path.startsWith("/planning/capital/");
  }
  if (target === "/settings/capital") {
    return path === "/settings/capital" || path.startsWith("/settings/capital/");
  }
  if (target === "/settings/security") {
    return path === "/settings/security" || path.startsWith("/settings/security/");
  }
  if (target === "/scout" || target === "/planning") {
    return (
      path === "/scout" ||
      path === "/planning" ||
      (path.startsWith("/scout/") && !path.startsWith("/scout/capital")) ||
      (path.startsWith("/planning/") && !path.startsWith("/planning/capital"))
    );
  }
  if (target === "/trades") return path === "/trades" || path.startsWith("/trades/");
  if (target === "/stats") return path === "/stats" || path.startsWith("/stats/");
  return path === target || path.startsWith(`${target}/`);
}
