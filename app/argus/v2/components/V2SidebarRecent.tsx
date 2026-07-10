"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  readRecentEntities,
  V2_RECENT_ENTITIES_EVENT,
  V2_RECENT_ENTITY_ICONS,
  type V2RecentEntity,
} from "@/lib/argus/v2/recent-entities";

function isRecentActive(pathname: string, href: string): boolean {
  try {
    const url = new URL(href, "http://local");
    if (url.pathname !== pathname) return false;
    const selected = url.searchParams.get("selected");
    if (!selected) return url.search === "";
    if (typeof window === "undefined") return false;
    const current = new URLSearchParams(window.location.search).get("selected");
    return current === selected;
  } catch {
    return pathname === href;
  }
}

export function V2SidebarRecent({ show }: { show: boolean }) {
  const pathname = usePathname();
  const [items, setItems] = useState<V2RecentEntity[]>([]);

  useEffect(() => {
    const refresh = () => setItems(readRecentEntities());
    refresh();
    window.addEventListener(V2_RECENT_ENTITIES_EVENT, refresh);
    return () => window.removeEventListener(V2_RECENT_ENTITIES_EVENT, refresh);
  }, []);

  if (!show || items.length === 0) return null;

  return (
    <div className="mt-3 border-t border-zinc-800/60 pt-3">
      <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-wider text-zinc-600">Recent</p>
      <div className="space-y-0.5">
        {items.map((item) => {
          const active = isRecentActive(pathname, item.href);
          return (
            <Link
              key={`${item.kind}-${item.id}`}
              href={item.href}
              title={item.label}
              className={`mb-0.5 flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition ${
                active ? "bg-violet-500/15 text-violet-200" : "text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-200"
              }`}
            >
              <span className="shrink-0 text-base opacity-80" aria-hidden>
                {V2_RECENT_ENTITY_ICONS[item.kind]}
              </span>
              <span className="min-w-0 truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
