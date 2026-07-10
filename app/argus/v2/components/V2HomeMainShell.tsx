"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import type { V2TagCloudItem } from "./V2TagCloud";
import { V2HomeIntelligencePanel } from "./V2HomeIntelligencePanel";
import { V2TabBar } from "./V2TabBar";
import { type V2KnowledgeNode } from "@/lib/argus/v2/intelligence-viz";

export type V2HomeView = "intelligence" | "browse";

const HOME_VIEW_TABS: { id: V2HomeView; label: string }[] = [
  { id: "intelligence", label: "Intelligence" },
  { id: "browse", label: "Browse" },
];

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

function BrowseQuickLinks() {
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

export function V2HomeMainShell({
  nodes,
  tags,
  initialView,
}: {
  nodes: V2KnowledgeNode[];
  tags: V2TagCloudItem[];
  initialView?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = parseV2HomeView(searchParams.get("view") ?? initialView);

  const treemapNodes = useMemo(() => nodes, [nodes]);

  function setView(next: V2HomeView) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "intelligence") {
      params.delete("view");
      params.delete("tab");
    } else {
      params.set("view", "browse");
    }
    const query = params.toString();
    router.replace(query ? `/argus/v2?${query}` : "/argus/v2");
  }

  return (
    <div id="intelligence">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <V2TabBar tabs={HOME_VIEW_TABS} active={view} onChange={setView} size="md" />
      </div>

      {view === "browse" ? (
        <BrowseQuickLinks />
      ) : (
        <V2HomeIntelligencePanel nodes={treemapNodes} tags={tags} />
      )}
    </div>
  );
}
