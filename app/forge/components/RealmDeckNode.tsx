"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { DeckNodeMetrics } from "@/lib/argusforge/af03-realm-map";
import { freshnessToBorder, freshnessToFill } from "@/lib/argusforge/af03-realm-map";

export type RealmDeckNodeData = {
  title: string;
  metrics: DeckNodeMetrics;
  selected: boolean;
  clusterLabel: string;
  reduceMotion: boolean;
};

/**
 * Chaos Deck node — size/color/pulse are provisional visual variables (24-0F).
 */
export function RealmDeckNode({ data }: NodeProps & { data: RealmDeckNodeData }) {
  const { title, metrics, selected, clusterLabel, reduceMotion } = data;
  const size = Math.round(120 + Math.min(80, metrics.visualWeight * 14));
  const active = metrics.freshness >= 0.55;
  const fill = freshnessToFill(metrics.freshness, false);
  const border = selected ? "#38bdf8" : freshnessToBorder(metrics.freshness);

  return (
    <div
      className={`relative rounded-xl border-2 px-3 py-2 shadow-md ${
        selected ? "ring-2 ring-sky-400/50" : ""
      }`}
      style={{
        width: size,
        minHeight: Math.round(size * 0.72),
        background: fill,
        borderColor: border,
        animation: active && !reduceMotion ? "realmDeckPulse 3.2s ease-in-out infinite" : undefined,
      }}
    >
      <Handle type="target" position={Position.Left} className="!h-2 !w-2 !bg-zinc-400" />
      <p className="text-[9px] uppercase tracking-wide text-zinc-400">{clusterLabel}</p>
      <p className="mt-0.5 line-clamp-2 text-sm font-semibold leading-snug text-zinc-50">{title}</p>
      <p className="mt-1 text-[10px] text-zinc-300">
        {metrics.fragmentCount} fragments
        {metrics.relationCount > 0 ? ` · ${metrics.relationCount} rel` : ""}
      </p>
      <Handle type="source" position={Position.Right} className="!h-2 !w-2 !bg-zinc-400" />
    </div>
  );
}
