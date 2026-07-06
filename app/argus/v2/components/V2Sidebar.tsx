"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { V2NavCounts } from "@/lib/argus/v2/loaders";

const DEFAULT_COUNTS: V2NavCounts = {
  inbox: 0,
  organizations: 0,
  projects: 0,
  people: 0,
  topics: 0,
  events: 0,
  network: 0,
  followUps: 0,
  reminders: 0,
};

function isBrowseNavActive(pathname: string, href: string, label: string): boolean {
  if (label === "Projects") {
    return pathname.startsWith("/argus/v2/browse/projects") || pathname.startsWith("/argus/v2/projects/");
  }
  if (label === "Organizations") {
    return pathname.startsWith("/argus/v2/browse/organizations") || pathname.startsWith("/argus/v2/organizations/");
  }
  return pathname.startsWith(href);
}

export function V2Sidebar({ counts = DEFAULT_COUNTS }: { counts?: V2NavCounts }) {
  const pathname = usePathname();

  const browse = [
    { href: "/argus/v2/browse/organizations", label: "Organizations", count: counts.organizations },
    { href: "/argus/v2/browse/projects", label: "Projects", count: counts.projects },
    { href: "/argus/network", label: "People", count: counts.people },
    { href: "/argus/v2/browse/topics", label: "Topics", count: counts.topics },
    { href: "/argus/v2/browse/events", label: "Events", count: counts.events },
  ];

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col border-r border-zinc-800/80 bg-zinc-950 lg:flex xl:w-60">
      <div className="border-b border-zinc-800/80 px-5 py-5">
        <Link href="/argus/v2" className="block">
          <span className="text-lg font-bold tracking-tight text-zinc-50">Argus</span>
          <span className="mt-0.5 block text-xs text-zinc-500">Your knowledge. Connected.</span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <NavItem href="/argus/v2" label="Home" active={pathname === "/argus/v2"} />

        <NavGroup title="Capture">
          <NavItem href="/argus/v2/inbox" label="Inbox" count={counts.inbox} active={pathname.startsWith("/argus/v2/inbox")} />
        </NavGroup>

        <NavGroup title="Browse">
          {browse.map((item) => (
            <NavItem
              key={item.label}
              {...item}
              active={isBrowseNavActive(pathname, item.href, item.label)}
            />
          ))}
        </NavGroup>

        <NavGroup title="Intelligence">
          <NavItem href="/argus/network" label="Network" count={counts.network} active={pathname.startsWith("/argus/network")} />
          <NavItem href="/argus/journal" label="Follow Ups" count={counts.followUps} active={false} />
          <NavItem href="/argus/journal" label="Reminders" count={counts.reminders} active={false} />
        </NavGroup>

        <NavGroup title="Settings">
          <NavItem href="/argus/journal" label="Tags" active={false} />
          <NavItem href="/argus/journal" label="Protected" active={false} />
          <NavItem href="/argus/diagnostics" label="Settings" active={pathname.startsWith("/argus/diagnostics")} />
        </NavGroup>
      </nav>

      <div className="border-t border-zinc-800/80 px-5 py-4">
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Live data · v2 preview
        </div>
        <Link href="/argus/journal" className="mt-2 block text-[10px] text-zinc-600 hover:text-zinc-400">
          Production UI → /argus/journal
        </Link>
      </div>
    </aside>
  );
}

export function V2MobileNav({ inboxCount = 0 }: { inboxCount?: number }) {
  const pathname = usePathname();
  const items = [
    { href: "/argus/v2", label: "Home", icon: "⌂" },
    { href: "/argus/network", label: "Network", icon: "◉" },
    { href: "/argus/v2/inbox", label: "Inbox", icon: "✉", badge: inboxCount },
    { href: "/argus/search", label: "Search", icon: "⌕" },
  ];

  return (
    <nav className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full border border-zinc-700/80 bg-zinc-900/95 px-2 py-2 shadow-2xl backdrop-blur-md lg:hidden">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`relative flex h-11 w-11 items-center justify-center rounded-full text-lg ${
            pathname === item.href || pathname.startsWith(item.href)
              ? "text-violet-400"
              : "text-zinc-500"
          }`}
          aria-label={item.label}
        >
          {item.icon}
          {item.badge ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
              {item.badge}
            </span>
          ) : null}
        </Link>
      ))}
    </nav>
  );
}

function NavItem({
  href,
  label,
  count,
  active,
}: {
  href: string;
  label: string;
  count?: number;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm transition ${
        active ? "bg-violet-500/15 text-violet-200" : "text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-200"
      }`}
    >
      <span>{label}</span>
      {count !== undefined ? (
        <span className={`text-xs tabular-nums ${active ? "text-violet-300/80" : "text-zinc-600"}`}>{count}</span>
      ) : null}
    </Link>
  );
}

function NavGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">{title}</p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}
