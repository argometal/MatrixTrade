"use client";

import Link from "next/link";

export type V2HomeView = "intelligence" | "browse";

const BROWSE_LINKS = [
  { href: "/argus/v2/browse/organizations", label: "Organizations", icon: "🏢", hint: "Institutional context" },
  { href: "/argus/v2/browse/projects", label: "Projects", icon: "📁", hint: "Bounded engagements" },
  { href: "/argus/v2/browse/network", label: "Network", icon: "👥", hint: "People and relationships" },
  { href: "/argus/v2/browse/topics", label: "Topics", icon: "🏷", hint: "Long-term subjects" },
  { href: "/argus/v2/browse/events", label: "Events", icon: "📅", hint: "Case anchors" },
] as const;

export function parseV2HomeView(value: string | null | undefined): V2HomeView {
  if (value === "browse" || value === "entities") return "browse";
  return "intelligence";
}

export function BrowseQuickLinks() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-500">
        Full entity browsers live in the sidebar — pick where you want to retrieve evidence.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {BROWSE_LINKS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-3 transition hover:border-violet-500/30 hover:bg-zinc-900"
          >
            <span className="text-xl" aria-hidden>
              {item.icon}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-zinc-100">{item.label}</span>
              <span className="block text-xs text-zinc-500">{item.hint}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
