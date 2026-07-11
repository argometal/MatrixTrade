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

export function V2IntelligenceLensEmpty({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex min-h-[4.25rem] flex-col justify-center rounded-xl border border-dashed border-zinc-800/90 bg-zinc-950/40 px-4 py-3 ${className}`}
    >
      <p className="text-[11px] font-medium text-zinc-500">Lens</p>
      <p className="mt-0.5 text-xs text-zinc-600">Click a tile or bubble to inspect and open.</p>
    </div>
  );
}

export function V2IntelligenceLens({
  node,
  source,
  onClose,
  variant = "inline",
}: {
  node: V2KnowledgeNode;
  source: IntelligenceFrom;
  onClose: () => void;
  variant?: "inline" | "dock";
}) {
  const openHref = intelligenceEntityHref(node.kind, node.id, source);
  const docked = variant === "dock";

  return (
    <div
      className={`rounded-xl border border-violet-500/30 bg-zinc-950/80 ${
        docked ? "p-3.5" : "p-4 sm:p-5"
      }`}
    >
      <div className={`mb-2.5 flex items-start justify-between gap-2 ${docked ? "" : "flex-wrap gap-3"}`}>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-400/90">
            {INTELLIGENCE_FROM_LABELS[source]} lens
          </p>
          <h3 className={`font-semibold text-zinc-50 ${docked ? "text-base leading-snug" : "text-lg"}`}>
            {node.name}
          </h3>
          <p className={`mt-0.5 text-xs font-medium ${KIND_COLORS[node.kind]}`}>{KIND_LABELS[node.kind]}</p>
          {node.group && node.group !== "General" ? (
            <p className="mt-0.5 truncate text-[11px] text-zinc-500">Group · {node.group}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg border border-zinc-700 px-2 py-0.5 text-[11px] text-zinc-500 hover:text-zinc-300"
        >
          Close
        </button>
      </div>

      <div className={`mb-3 grid gap-1.5 ${docked ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4"}`}>
        <Metric label="Evidence" value={String(node.evidenceCount)} compact={docked} />
        <Metric label="30d activity" value={String(node.recurrence30d)} compact={docked} />
        <Metric label="Recency" value={`${Math.round(node.recencyScore * 100)}%`} compact={docked} />
        <Metric label="Patterns" value={String(node.tagPatternCount)} compact={docked} />
      </div>

      <Link
        href={openHref}
        className={`inline-flex w-full items-center justify-center rounded-xl bg-violet-600 font-semibold text-white hover:bg-violet-500 ${
          docked ? "px-3 py-2 text-xs" : "px-4 py-2.5 text-sm"
        }`}
      >
        Open focused view
      </Link>
    </div>
  );
}

function Metric({ label, value, compact }: { label: string; value: string; compact?: boolean }) {
  return (
    <div className="rounded-lg bg-zinc-900/60 px-2.5 py-1.5 ring-1 ring-zinc-800/80">
      <p className={`font-semibold tabular-nums text-zinc-100 ${compact ? "text-sm" : "text-lg"}`}>{value}</p>
      <p className="text-[9px] uppercase tracking-wide text-zinc-600">{label}</p>
    </div>
  );
}
