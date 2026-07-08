"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { V2EntityRow, V2EntityTab } from "@/lib/argus/v2/loaders";
import type { V2KnowledgeNode } from "@/lib/argus/v2/intelligence-viz";
import { V2EntityTable } from "./V2EntityTable";
import { V2PortfolioBubbleMatrix } from "./V2PortfolioBubbleMatrix";
import { V2TabBar } from "./V2TabBar";

type EntityViewTab = "list" | "matrix";

const ENTITY_VIEW_TABS: { id: EntityViewTab; label: string }[] = [
  { id: "list", label: "List" },
  { id: "matrix", label: "Matrix" },
];

const ENTITY_BROWSE_HREFS: Record<V2EntityTab, string> = {
  organizations: "/argus/v2/browse/organizations",
  projects: "/argus/v2/browse/projects",
  people: "/argus/v2/browse/network",
  topics: "/argus/v2/browse/topics",
  events: "/argus/v2/browse/events",
};

export function V2RecentEntitiesShell({
  tab,
  rows,
  matrixNodes,
}: {
  tab: V2EntityTab;
  rows: V2EntityRow[];
  matrixNodes: V2KnowledgeNode[];
}) {
  const [view, setView] = useState<EntityViewTab>("list");

  const scopedNodes = useMemo(() => {
    const rowIds = new Set(rows.map((r) => r.id));
    const filtered = matrixNodes.filter((n) => rowIds.has(n.id));
    return filtered.length > 0 ? filtered : matrixNodes.filter((n) => n.kind !== "tag").slice(0, 12);
  }, [matrixNodes, rows]);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <V2TabBar tabs={ENTITY_VIEW_TABS} active={view} onChange={setView} size="sm" />
        <Link
          href={ENTITY_BROWSE_HREFS[tab]}
          className="text-xs font-medium text-violet-400 hover:text-violet-300"
        >
          Browse all
        </Link>
      </div>

      {view === "list" ? (
        <>
          <p className="mb-3 text-sm text-zinc-500">
            Open an organization, project, or person — your main entry points into Argus.
          </p>
          <V2EntityTable tab={tab} rows={rows} primary />
        </>
      ) : (
        <>
          <p className="mb-3 text-sm text-zinc-500">
            Portfolio view for recent entities — strategic value vs completion, sized by evidence.
          </p>
          <V2PortfolioBubbleMatrix nodes={scopedNodes} />
        </>
      )}
    </>
  );
}
