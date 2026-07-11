"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import type { V2NavCounts } from "@/lib/argus/v2/loaders";
import type { V2TagCloudItem } from "./V2TagCloud";
import { V2HomeIntelligencePanel, type IntelligenceTab } from "./V2HomeIntelligencePanel";
import { V2HomePulse } from "./V2HomePulse";
import { V2IntelligenceLens, V2IntelligenceLensEmpty } from "./V2IntelligenceLens";
import { V2TabBar } from "./V2TabBar";
import { type V2KnowledgeNode } from "@/lib/argus/v2/intelligence-viz";
import type { IntelligenceFrom } from "@/lib/argus/v2/intelligence-nav";

export type V2HomeView = "intelligence" | "browse";

const HOME_VIEW_TABS: { id: V2HomeView; label: string }[] = [
  { id: "intelligence", label: "Intelligence" },
  { id: "browse", label: "Browse" },
];

const INTELLIGENCE_TABS: { id: IntelligenceTab; label: string }[] = [
  { id: "treemap", label: "Treemap" },
  { id: "portfolio", label: "Portfolio" },
  { id: "tags", label: "Tags" },
];

const TAB_SOURCE: Record<IntelligenceTab, IntelligenceFrom> = {
  treemap: "treemap",
  portfolio: "portfolio",
  tags: "tags",
};

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
  signals,
  initialView,
}: {
  nodes: V2KnowledgeNode[];
  tags: V2TagCloudItem[];
  signals: V2NavCounts;
  initialView?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = parseV2HomeView(searchParams.get("view") ?? initialView);
  const [intelTab, setIntelTab] = useState<IntelligenceTab>("treemap");
  const [lensId, setLensId] = useState<string | null>(null);

  const treemapNodes = useMemo(() => nodes, [nodes]);
  const lensNode = lensId ? nodes.find((node) => node.id === lensId) : undefined;
  const showLensDock = view === "intelligence" && intelTab !== "tags";

  function setView(next: V2HomeView) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "intelligence") {
      params.delete("view");
      params.delete("tab");
    } else {
      params.set("view", "browse");
      setLensId(null);
    }
    const query = params.toString();
    router.replace(query ? `/argus/v2?${query}` : "/argus/v2");
  }

  function changeIntelTab(next: IntelligenceTab) {
    setIntelTab(next);
    if (next === "tags") setLensId(null);
  }

  return (
    <div id="intelligence">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-stretch">
        <div className="min-w-0 flex-1">
          <V2HomePulse signals={signals} />
        </div>
        {showLensDock ? (
          <div className="w-full shrink-0 lg:w-[min(19rem,34%)]">
            {lensNode ? (
              <V2IntelligenceLens
                node={lensNode}
                source={TAB_SOURCE[intelTab]}
                onClose={() => setLensId(null)}
                variant="dock"
              />
            ) : (
              <V2IntelligenceLensEmpty />
            )}
          </div>
        ) : null}
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <V2TabBar tabs={HOME_VIEW_TABS} active={view} onChange={setView} size="md" />
        {view === "intelligence" ? (
          <V2TabBar tabs={INTELLIGENCE_TABS} active={intelTab} onChange={changeIntelTab} />
        ) : null}
      </div>

      {view === "browse" ? (
        <BrowseQuickLinks />
      ) : (
        <V2HomeIntelligencePanel
          nodes={treemapNodes}
          tags={tags}
          tab={intelTab}
          onLensChange={setLensId}
        />
      )}
    </div>
  );
}
