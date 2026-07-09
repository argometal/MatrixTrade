"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { V2NavCounts } from "@/lib/argus/v2/loaders";
import { isBrowseNavActive } from "@/lib/argus/v2/nav-items";

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

const NAV_ICONS: Record<string, string> = {
  Home: "⌂",
  Inbox: "✉",
  Organizations: "🏢",
  Projects: "📁",
  People: "👤",
  Topics: "🏷",
  Events: "📅",
  Network: "◉",
  "Follow Ups": "↩",
  Export: "↗",
  Tags: "#",
  Diagnostics: "⚙",
};

export function V2Sidebar({
  counts = DEFAULT_COUNTS,
  collapsed = false,
  onToggle,
}: {
  counts?: V2NavCounts;
  collapsed?: boolean;
  onToggle?: () => void;
}) {
  const pathname = usePathname();

  const browse = [
    { href: "/argus/v2/browse/organizations", label: "Organizations", count: counts.organizations },
    { href: "/argus/v2/browse/projects", label: "Projects", count: counts.projects },
    { href: "/argus/v2/browse/network", label: "People", count: counts.people },
    { href: "/argus/v2/browse/topics", label: "Topics", count: counts.topics },
    { href: "/argus/v2/browse/events", label: "Events", count: counts.events },
  ];

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-zinc-800/80 bg-zinc-950 transition-[width] duration-200 ease-out lg:flex ${
        collapsed ? "w-16" : "w-56 xl:w-60"
      }`}
    >
      <div className={`shrink-0 border-b border-zinc-800/80 ${collapsed ? "px-2 py-4" : "px-5 py-5"}`}>
        <div className={`flex items-start ${collapsed ? "flex-col items-center gap-2" : "justify-between gap-2"}`}>
          <Link href="/argus/v2" className={collapsed ? "flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600/20 text-lg ring-1 ring-violet-500/30" : "block min-w-0 flex-1"} title="Argus Home">
            {collapsed ? (
              <span aria-hidden>🌐</span>
            ) : (
              <>
                <span className="text-lg font-bold tracking-tight text-zinc-50">Argus</span>
                <span className="mt-0.5 block text-xs text-zinc-500">Your knowledge. Connected.</span>
              </>
            )}
          </Link>
          {onToggle ? (
            <button
              type="button"
              onClick={onToggle}
              className="shrink-0 rounded-lg border border-zinc-800 p-1.5 text-zinc-500 transition hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-300"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <span aria-hidden className="text-sm">
                {collapsed ? "»" : "«"}
              </span>
            </button>
          ) : null}
        </div>
      </div>

      <nav className={`argus-v2-scroll min-h-0 flex-1 space-y-0.5 overflow-y-auto py-4 ${collapsed ? "px-1.5" : "px-3"}`}>
        <NavItem href="/argus/v2" label="Home" icon={NAV_ICONS.Home} active={pathname === "/argus/v2"} collapsed={collapsed} />

        <NavDivider collapsed={collapsed} />

        <NavItem
          href="/argus/v2/inbox"
          label="Inbox"
          icon={NAV_ICONS.Inbox}
          count={counts.inbox}
          active={pathname.startsWith("/argus/v2/inbox")}
          collapsed={collapsed}
        />

        <NavDivider collapsed={collapsed} />

        {browse.map((item) => (
          <NavItem
            key={item.label}
            {...item}
            icon={NAV_ICONS[item.label]}
            active={isBrowseNavActive(pathname, item.href, item.label)}
            collapsed={collapsed}
          />
        ))}

        <NavDivider collapsed={collapsed} />

        <NavItem
          href="/argus/v2/browse/network"
          label="Network"
          icon={NAV_ICONS.Network}
          count={counts.network}
          active={pathname.startsWith("/argus/v2/browse/network") || pathname.startsWith("/argus/v2/network/")}
          collapsed={collapsed}
        />
        <NavItem
          href="/argus/v2#follow-ups"
          label="Follow Ups"
          icon={NAV_ICONS["Follow Ups"]}
          count={counts.followUps}
          active={false}
          collapsed={collapsed}
        />

        <NavDivider collapsed={collapsed} />

        <NavItem
          href="/argus/v2/deliver"
          label="Export"
          icon={NAV_ICONS.Export}
          badge="NEW"
          active={pathname.startsWith("/argus/v2/deliver")}
          collapsed={collapsed}
        />

        <NavDivider collapsed={collapsed} />

        <NavItem href="/argus/v2#tags" label="Tags" icon={NAV_ICONS.Tags} active={false} collapsed={collapsed} />
        <NavItem
          href="/argus/v2/diagnostics"
          label="Diagnostics"
          icon={NAV_ICONS.Diagnostics}
          active={pathname.startsWith("/argus/v2/diagnostics") || pathname.startsWith("/argus/diagnostics")}
          collapsed={collapsed}
        />
      </nav>

      <div className={`shrink-0 border-t border-zinc-800/80 ${collapsed ? "px-2 py-3" : "px-5 py-4"}`}>
        <div
          className={`flex items-center text-xs text-zinc-500 ${collapsed ? "justify-center" : "gap-2"}`}
          title="Live data · v2"
        >
          <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
          {collapsed ? null : <span>Live data · v2</span>}
        </div>
      </div>
    </aside>
  );
}

function NavItem({
  href,
  label,
  icon,
  count,
  badge,
  active,
  collapsed,
}: {
  href: string;
  label: string;
  icon?: string;
  count?: number;
  badge?: string;
  active: boolean;
  collapsed: boolean;
}) {
  if (collapsed) {
    return (
      <Link
        href={href}
        title={label}
        className={`relative mb-0.5 flex h-10 w-full items-center justify-center rounded-xl text-base transition ${
          active ? "bg-violet-500/15 text-violet-200 ring-1 ring-violet-500/30" : "text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-200"
        }`}
      >
        <span aria-hidden>{icon ?? "•"}</span>
        {count !== undefined && count > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 min-w-[1rem] rounded-full bg-violet-600 px-1 text-center text-[9px] font-bold leading-4 text-white">
            {count > 99 ? "99+" : count}
          </span>
        ) : null}
        {badge ? (
          <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-sky-400" aria-hidden />
        ) : null}
        <span className="sr-only">{label}</span>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={`mb-0.5 flex items-center justify-between rounded-xl px-3 py-2 text-sm transition ${
        active ? "bg-violet-500/15 text-violet-200" : "text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-200"
      }`}
    >
      <span className="flex items-center gap-2">
        {icon ? <span className="text-base opacity-80" aria-hidden>{icon}</span> : null}
        <span>{label}</span>
        {badge ? (
          <span className="rounded-full bg-sky-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-sky-300">
            {badge}
          </span>
        ) : null}
      </span>
      {count !== undefined ? (
        <span className={`text-xs tabular-nums ${active ? "text-violet-300/80" : "text-zinc-600"}`}>{count}</span>
      ) : null}
    </Link>
  );
}

function NavDivider({ collapsed }: { collapsed: boolean }) {
  return <div className={`border-t border-zinc-800/60 ${collapsed ? "my-2" : "my-3"}`} role="separator" aria-hidden />;
}
