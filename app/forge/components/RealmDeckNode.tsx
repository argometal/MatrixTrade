"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { DeckNodeMetrics } from "@/lib/argusforge/af03-realm-map";
import { freshnessToBorder, freshnessToFill } from "@/lib/argusforge/af03-realm-map";

export type RealmDeckNodeData = {
  title: string;
  metrics: DeckNodeMetrics;
  selected: boolean;
  clusterLabel: string;
  hasAffinityHalo: boolean;
  reduceMotion: boolean;
};

/**
 * Chaos Deck molecular body — size=mass, color=use, pulse=activity, halo=affinity (24-17).
 */
export function RealmDeckNode({ data }: NodeProps & { data: RealmDeckNodeData }) {
  const { title, metrics, selected, clusterLabel, hasAffinityHalo, reduceMotion } = data;
  const size = Math.round(108 + Math.min(96, metrics.visualWeight * 22));
  const fill = freshnessToFill(metrics.freshness, false);
  const border = selected ? "#38bdf8" : freshnessToBorder(metrics.freshness);
  const motion =
    !reduceMotion && metrics.activityLevel !== "still"
      ? metrics.activityLevel === "active"
        ? "realmDeckPulse 2.6s ease-in-out infinite"
        : "realmDeckPulse 4.2s ease-in-out infinite"
      : undefined;

  return (
    <div className="relative" style={{ width: size + (hasAffinityHalo ? 16 : 0) }}>
      {hasAffinityHalo ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full border border-dashed border-amber-500/35"
          style={{
            margin: -8,
            boxShadow: "0 0 18px rgba(245, 158, 11, 0.12)",
          }}
          title="Detected affinity — not a confirmed relation"
        />
      ) : null}
      <div
        className={`relative rounded-full border-2 px-3 py-3 text-center shadow-md ${
          selected ? "ring-2 ring-sky-400/50" : ""
        }`}
        style={{
          width: size,
          minHeight: size,
          background: fill,
          borderColor: border,
          animation: motion,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Handle type="target" position={Position.Left} className="!h-2 !w-2 !bg-zinc-400" />
        <p className="text-[8px] uppercase tracking-wide text-zinc-400">{clusterLabel}</p>
        <p className="mt-0.5 line-clamp-2 text-[12px] font-semibold leading-snug text-zinc-50">
          {title}
        </p>
        <p className="mt-1 text-[9px] text-zinc-300">
          m{metrics.massScore.toFixed(1)} · {metrics.fragmentCount}f
        </p>
        <Handle type="source" position={Position.Right} className="!h-2 !w-2 !bg-zinc-400" />
      </div>
    </div>
  );
}
