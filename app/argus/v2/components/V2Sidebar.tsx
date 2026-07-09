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

export function V2Sidebar({ counts = DEFAULT_COUNTS }: { counts?: V2NavCounts }) {
  const pathname = usePathname();

  const browse = [
    { href: "/argus/v2/browse/organizations", label: "Organizations", count: counts.organizations },
    { href: "/argus/v2/browse/projects", label: "Projects", count: counts.projects },
    { href: "/argus/v2/browse/network", label: "People", count: counts.people },
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

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        <NavItem href="/argus/v2" label="Home" active={pathname === "/argus/v2"} />

        <NavDivider />

        <NavItem href="/argus/v2/inbox" label="Inbox" count={counts.inbox} active={pathname.startsWith("/argus/v2/inbox")} />

        <NavDivider />

        {browse.map((item) => (
          <NavItem
            key={item.label}
            {...item}
            active={isBrowseNavActive(pathname, item.href, item.label)}
          />
        ))}

        <NavDivider />

        <NavItem
          href="/argus/v2/browse/network"
          label="Network"
          count={counts.network}
          active={pathname.startsWith("/argus/v2/browse/network") || pathname.startsWith("/argus/v2/network/")}
        />
        <NavItem href="/argus/v2#follow-ups" label="Follow Ups" count={counts.followUps} active={false} />

        <NavDivider />

        <NavItem
          href="/argus/v2/deliver"
          label="Export"
          badge="NEW"
          active={pathname.startsWith("/argus/v2/deliver")}
        />

        <NavDivider />

        <NavItem href="/argus/v2#tags" label="Tags" active={false} />
        <NavItem
          href="/argus/v2/diagnostics"
          label="Diagnostics"
          active={pathname.startsWith("/argus/v2/diagnostics") || pathname.startsWith("/argus/diagnostics")}
        />
      </nav>

      <div className="border-t border-zinc-800/80 px-5 py-4">
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Live data · v2
        </div>
      </div>
    </aside>
  );
}

function NavItem({
  href,
  label,
  count,
  badge,
  active,
}: {
  href: string;
  label: string;
  count?: number;
  badge?: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`mb-0.5 flex items-center justify-between rounded-xl px-3 py-2 text-sm transition ${
        active ? "bg-violet-500/15 text-violet-200" : "text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-200"
      }`}
    >
      <span className="flex items-center gap-2">
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

function NavDivider() {
  return <div className="my-3 border-t border-zinc-800/60" role="separator" aria-hidden />;
}
