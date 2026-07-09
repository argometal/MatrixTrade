"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import type { V2EntityRow, V2EntityTab } from "@/lib/argus/v2/loaders";
import type { V2TagCloudItem } from "./V2TagCloud";
import { V2EntityViewer } from "./V2EntityViewer";
import { V2HomeIntelligencePanel } from "./V2HomeIntelligencePanel";
import { V2TabBar } from "./V2TabBar";
import {
  type V2GraphEdge,
  type V2GraphNode,
  type V2KnowledgeNode,
} from "@/lib/argus/v2/intelligence-viz";

export type V2HomeView = "entities" | "intelligence";

const HOME_VIEW_TABS: { id: V2HomeView; label: string }[] = [
  { id: "entities", label: "Entities" },
  { id: "intelligence", label: "Intelligence" },
];

const ENTITY_BROWSE_HREFS: Record<V2EntityTab, string> = {
  organizations: "/argus/v2/browse/organizations",
  projects: "/argus/v2/browse/projects",
  people: "/argus/v2/browse/network",
  topics: "/argus/v2/browse/topics",
  events: "/argus/v2/browse/events",
};

export function parseV2HomeView(value: string | null | undefined): V2HomeView {
  return value === "intelligence" ? "intelligence" : "entities";
}

export function V2HomeMainShell({
  tab,
  rows,
  nodes,
  graphNodes,
  graphEdges,
  tags,
  initialView,
}: {
  tab: V2EntityTab;
  rows: V2EntityRow[];
  nodes: V2KnowledgeNode[];
  graphNodes: V2GraphNode[];
  graphEdges: V2GraphEdge[];
  tags: V2TagCloudItem[];
  initialView?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = parseV2HomeView(searchParams.get("view") ?? initialView);

  const treemapNodes = useMemo(() => nodes, [nodes]);

  function setView(next: V2HomeView) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "entities") params.delete("view");
    else params.set("view", next);
    const query = params.toString();
    router.replace(query ? `/argus/v2?${query}` : "/argus/v2");
  }

  return (
    <div id="entities">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <V2TabBar tabs={HOME_VIEW_TABS} active={view} onChange={setView} size="md" />
        {view === "entities" ? (
          <Link
            href={ENTITY_BROWSE_HREFS[tab]}
            className="text-xs font-medium text-violet-400 hover:text-violet-300"
          >
            Browse all
          </Link>
        ) : null}
      </div>

      {view === "entities" ? (
        <>
          <p className="mb-4 text-sm text-zinc-500">
            Open an organization, project, or person — your main entry points into Argus.
          </p>
          <V2EntityViewer tab={tab} rows={rows} primary />
        </>
      ) : (
        <V2HomeIntelligencePanel
          nodes={treemapNodes}
          graphNodes={graphNodes}
          graphEdges={graphEdges}
          tags={tags}
        />
      )}
    </div>
  );
}
