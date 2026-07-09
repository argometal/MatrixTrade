"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { V2NavCounts } from "@/lib/argus/v2/loaders";
import {
  buildV2NavSections,
  isV2NavItemActive,
  type V2NavLinkItem,
} from "@/lib/argus/v2/nav-items";

const DEFAULT_SIGNALS: V2NavCounts = { inbox: 0, network: 0, topics: 0 };

export function V2Sidebar({
  counts = DEFAULT_SIGNALS,
  collapsed = false,
  onToggle,
}: {
  counts?: V2NavCounts;
  collapsed?: boolean;
  onToggle?: () => void;
}) {
  const pathname = usePathname();
  const sections = buildV2NavSections(counts);

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-zinc-800/80 bg-zinc-950 transition-[width] duration-200 ease-out lg:flex ${
        collapsed ? "w-[4.5rem]" : "w-56 xl:w-60"
      }`}
    >
      <div className={`shrink-0 border-b border-zinc-800/80 ${collapsed ? "px-2 py-4" : "px-5 py-5"}`}>
        <div className={`flex items-start ${collapsed ? "flex-col items-center gap-2" : "justify-between gap-2"}`}>
          <Link
            href="/argus/v2"
            className={collapsed ? "flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600/20 text-lg ring-1 ring-violet-500/30" : "block min-w-0 flex-1"}
            title="Argus Home"
          >
            {collapsed ? (
              <span aria-hidden>🌐</span>
            ) : (
              <>
                <span className="text-lg font-bold tracking-tight text-zinc-50">Argus</span>
                <span className="mt-0.5 block text-xs text-zinc-500">Evidence organization</span>
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

      <nav className={`argus-v2-scroll min-h-0 flex-1 overflow-y-auto py-4 ${collapsed ? "px-1.5" : "px-3"}`}>
        {sections.map((section, sectionIndex) => (
          <div key={section.title} className={sectionIndex > 0 ? "mt-3" : ""}>
            {!collapsed ? (
              <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-wider text-zinc-600">
                {section.title}
              </p>
            ) : sectionIndex > 0 ? (
              <div className="my-2 border-t border-zinc-800/60" role="separator" aria-hidden />
            ) : null}
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavItem
                  key={`${section.title}-${item.href}`}
                  item={item}
                  active={isV2NavItemActive(pathname, item)}
                  collapsed={collapsed}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}

function NavItem({
  item,
  active,
  collapsed,
}: {
  item: V2NavLinkItem;
  active: boolean;
  collapsed: boolean;
}) {
  const signal = item.signal && item.signal > 0 ? item.signal : undefined;

  if (collapsed) {
    return (
      <Link
        href={item.href}
        title={item.label}
        className={`relative mb-0.5 flex h-10 w-full items-center justify-center rounded-xl text-base transition ${
          active
            ? "bg-violet-500/15 text-violet-200 ring-1 ring-violet-500/30"
            : "text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-200"
        }`}
      >
        <span aria-hidden>{item.icon ?? "•"}</span>
        {signal ? <ActionSignalBadge signal={signal} collapsed /> : null}
        <span className="sr-only">{item.label}</span>
      </Link>
    );
  }

  return (
    <Link
      href={item.href}
      className={`mb-0.5 flex items-center justify-between rounded-xl px-3 py-2 text-sm transition ${
        active ? "bg-violet-500/15 text-violet-200" : "text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-200"
      }`}
    >
      <span className="flex items-center gap-2">
        {item.icon ? (
          <span className="text-base opacity-80" aria-hidden>
            {item.icon}
          </span>
        ) : null}
        <span>{item.label}</span>
      </span>
      {signal ? <ActionSignalBadge signal={signal} /> : null}
    </Link>
  );
}

function ActionSignalBadge({ signal, collapsed = false }: { signal: number; collapsed?: boolean }) {
  if (signal === 1 && !collapsed) {
    return <span className="h-2 w-2 shrink-0 rounded-full bg-violet-500" aria-label="Action required" />;
  }
  return (
    <span
      className={`shrink-0 rounded-full bg-violet-600 font-bold text-white ${
        collapsed
          ? "absolute -right-0.5 -top-0.5 min-w-[1rem] px-1 text-center text-[9px] leading-4"
          : "min-w-[1.25rem] px-1.5 py-0.5 text-center text-[10px]"
      }`}
    >
      {signal > 99 ? "99+" : signal}
    </span>
  );
}
