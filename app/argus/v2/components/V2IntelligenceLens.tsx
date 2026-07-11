"use client";

import Link from "next/link";
import {
  intelligenceEntityHref,
  INTELLIGENCE_FROM_LABELS,
  type IntelligenceFrom,
} from "@/lib/argus/v2/intelligence-nav";
import type { V2KnowledgeNode } from "@/lib/argus/v2/intelligence-viz";

const KIND_LABELS: Record<V2KnowledgeNode["kind"], string> = {
  organization: "Organization",
  project: "Project",
  topic: "Topic",
};

const KIND_COLORS: Record<V2KnowledgeNode["kind"], string> = {
  organization: "text-sky-300",
  project: "text-amber-300",
  topic: "text-violet-300",
};

export function V2IntelligenceLens({
  node,
  source,
  onClose,
}: {
  node: V2KnowledgeNode;
  source: IntelligenceFrom;
  onClose: () => void;
}) {
  const openHref = intelligenceEntityHref(node.kind, node.id, source);

  return (
    <div className="rounded-xl border border-violet-500/30 bg-zinc-950/80 p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-400/90">
            {INTELLIGENCE_FROM_LABELS[source]} lens
          </p>
          <h3 className="text-lg font-semibold text-zinc-50">{node.name}</h3>
          <p className={`mt-0.5 text-xs font-medium ${KIND_COLORS[node.kind]}`}>{KIND_LABELS[node.kind]}</p>
          {node.group && node.group !== "General" ? (
            <p className="mt-1 text-xs text-zinc-500">Group · {node.group}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-zinc-700 px-2.5 py-1 text-xs text-zinc-500 hover:text-zinc-300"
        >
          Close
        </button>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Metric label="Evidence" value={String(node.evidenceCount)} />
        <Metric label="30d activity" value={String(node.recurrence30d)} />
        <Metric label="Recency" value={`${Math.round(node.recencyScore * 100)}%`} />
        <Metric label="Patterns" value={String(node.tagPatternCount)} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href={openHref}
          className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-500"
        >
          Open focused view
        </Link>
        <Link
          href={openHref}
          className="rounded-xl border border-zinc-700 px-4 py-2.5 text-sm text-zinc-300 hover:border-zinc-600"
        >
          Work on {node.name}
        </Link>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-zinc-900/60 px-3 py-2 ring-1 ring-zinc-800/80">
      <p className="text-lg font-semibold tabular-nums text-zinc-100">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-zinc-600">{label}</p>
    </div>
  );
}
