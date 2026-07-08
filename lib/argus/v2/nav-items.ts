import type { V2NavCounts } from "@/lib/argus/v2/loaders";

export type V2NavLinkItem = {
  href: string;
  label: string;
  count?: number;
  badge?: string;
};

export type V2NavSection = {
  title: string;
  items: V2NavLinkItem[];
};

export function isBrowseNavActive(pathname: string, href: string, label: string): boolean {
  if (label === "Projects") {
    return pathname.startsWith("/argus/v2/browse/projects") || pathname.startsWith("/argus/v2/projects/");
  }
  if (label === "Organizations") {
    return pathname.startsWith("/argus/v2/browse/organizations") || pathname.startsWith("/argus/v2/organizations/");
  }
  if (label === "People" || label === "Network") {
    return pathname.startsWith("/argus/v2/browse/network") || pathname.startsWith("/argus/v2/network/");
  }
  return pathname.startsWith(href);
}

/** Short label for the current v2 route — shown under the Argus button on mobile. */
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
    return "People";
  }
  if (pathname.startsWith("/argus/v2/browse/topics")) return "Topics";
  if (pathname.startsWith("/argus/v2/browse/events")) return "Events";
  if (pathname.startsWith("/argus/v2/deliver")) return "Export";
  if (pathname.startsWith("/argus/v2/diagnostics") || pathname.startsWith("/argus/diagnostics")) {
    return "Diagnostics";
  }
  if (pathname.startsWith("/argus/v2/runbooks")) return "Runbooks";
  return "Navigate";
}

export function isV2NavItemActive(pathname: string, item: V2NavLinkItem): boolean {
  if (item.label === "Home") return pathname === "/argus/v2";
  if (item.label === "Inbox") return pathname.startsWith("/argus/v2/inbox");
  if (item.label === "Search") return pathname.startsWith("/argus/search");
  if (item.label === "Export") return pathname.startsWith("/argus/v2/deliver");
  if (item.label === "Diagnostics") {
    return pathname.startsWith("/argus/v2/diagnostics") || pathname.startsWith("/argus/diagnostics");
  }
  return isBrowseNavActive(pathname, item.href, item.label);
}

export function buildV2NavSections(counts: V2NavCounts): V2NavSection[] {
  return [
    {
      title: "Main",
      items: [
        { href: "/argus/v2", label: "Home" },
        { href: "/argus/v2/inbox", label: "Inbox", count: counts.inbox },
        { href: "/argus/search", label: "Search" },
      ],
    },
    {
      title: "Browse",
      items: [
        { href: "/argus/v2/browse/organizations", label: "Organizations", count: counts.organizations },
        { href: "/argus/v2/browse/projects", label: "Projects", count: counts.projects },
        { href: "/argus/v2/browse/network", label: "People", count: counts.people },
        { href: "/argus/v2/browse/topics", label: "Topics", count: counts.topics },
        { href: "/argus/v2/browse/events", label: "Events", count: counts.events },
      ],
    },
    {
      title: "More",
      items: [
        { href: "/argus/v2/browse/network", label: "Network", count: counts.network },
        { href: "/argus/v2#follow-ups", label: "Follow Ups", count: counts.followUps },
        { href: "/argus/v2/deliver", label: "Export", badge: "NEW" },
        { href: "/argus/v2/diagnostics", label: "Diagnostics" },
      ],
    },
  ];
}
