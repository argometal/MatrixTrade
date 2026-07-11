import type { V2NavCounts } from "@/lib/argus/v2/loaders";

export type V2NavLinkItem = {
  href: string;
  label: string;
  icon?: string;
  /** Action signal — shown only when > 0. */
  signal?: number;
};

export type V2NavSection = {
  title: string;
  items: V2NavLinkItem[];
};

const NAV_ICONS: Record<string, string> = {
  Home: "⌂",
  Inbox: "✉",
  Organizations: "🏢",
  Projects: "📁",
  Network: "👥",
  Topics: "🏷",
  Events: "📅",
  Deliver: "↗",
  Diagnostics: "⚙",
  Help: "?",
};

export function navIcon(label: string): string {
  return NAV_ICONS[label] ?? "•";
}

export function isBrowseNavActive(pathname: string, href: string, label: string): boolean {
  if (label === "Projects") {
    return pathname.startsWith("/argus/v2/browse/projects") || pathname.startsWith("/argus/v2/projects/");
  }
  if (label === "Organizations") {
    return pathname.startsWith("/argus/v2/browse/organizations") || pathname.startsWith("/argus/v2/organizations/");
  }
  if (label === "Network") {
    return pathname.startsWith("/argus/v2/browse/network") || pathname.startsWith("/argus/v2/network/");
  }
  return pathname.startsWith(href);
}

export function isV2NavItemActive(pathname: string, item: V2NavLinkItem): boolean {
  if (item.label === "Home") return pathname === "/argus/v2";
  if (item.label === "Inbox") return pathname.startsWith("/argus/v2/inbox");
  if (item.label === "Deliver") return pathname.startsWith("/argus/v2/deliver");
  if (item.label === "Diagnostics") {
    return pathname.startsWith("/argus/v2/diagnostics") || pathname.startsWith("/argus/diagnostics");
  }
  if (item.label === "Help") return pathname.startsWith("/argus/v2/help");
  return isBrowseNavActive(pathname, item.href, item.label);
}

/** Sidebar + mobile drawer — navigation only, action signals on select items. */
export function buildV2NavSections(signals: V2NavCounts): V2NavSection[] {
  return [
    {
      title: "Main",
      items: [
        { href: "/argus/v2", label: "Home", icon: navIcon("Home") },
        { href: "/argus/v2/inbox", label: "Inbox", icon: navIcon("Inbox"), signal: signals.inbox },
      ],
    },
    {
      title: "Browse",
      items: [
        { href: "/argus/v2/browse/organizations", label: "Organizations", icon: navIcon("Organizations") },
        { href: "/argus/v2/browse/projects", label: "Projects", icon: navIcon("Projects") },
        { href: "/argus/v2/browse/network", label: "Network", icon: navIcon("Network"), signal: signals.network },
        { href: "/argus/v2/browse/topics", label: "Topics", icon: navIcon("Topics"), signal: signals.topics },
        { href: "/argus/v2/browse/events", label: "Events", icon: navIcon("Events") },
      ],
    },
    {
      title: "System",
      items: [
        { href: "/argus/v2/deliver", label: "Deliver", icon: navIcon("Deliver") },
        { href: "/argus/v2/help", label: "Help", icon: navIcon("Help") },
        { href: "/argus/v2/diagnostics", label: "Diagnostics", icon: navIcon("Diagnostics") },
      ],
    },
  ];
}

/** Short label for the mobile top-bar menu button (current section). */
export function getV2NavPageLabel(pathname: string): string {
  if (pathname === "/argus/v2") return "Home";
  if (pathname.startsWith("/argus/v2/inbox")) return "Inbox";
  if (pathname.startsWith("/argus/search")) return "Search";
  if (
    pathname.startsWith("/argus/v2/browse/organizations") ||
    pathname.startsWith("/argus/v2/organizations/")
  ) {
    return "Organizations";
  }
  if (pathname.startsWith("/argus/v2/browse/projects") || pathname.startsWith("/argus/v2/projects/")) {
    return "Projects";
  }
  if (pathname.startsWith("/argus/v2/browse/network") || pathname.startsWith("/argus/v2/network/")) {
    return "Network";
  }
  if (pathname.startsWith("/argus/v2/browse/topics")) return "Topics";
  if (pathname.startsWith("/argus/v2/browse/events")) return "Events";
  if (pathname.startsWith("/argus/v2/deliver")) return "Deliver";
  if (pathname.startsWith("/argus/v2/diagnostics") || pathname.startsWith("/argus/diagnostics")) {
    return "Diagnostics";
  }
  if (pathname.startsWith("/argus/v2/help")) return "Help";
  if (pathname.startsWith("/argus/v2/runbooks")) return "Runbooks";
  return "Navigate";
}
