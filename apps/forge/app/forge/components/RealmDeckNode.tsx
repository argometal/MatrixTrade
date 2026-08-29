"use client";

/**
 * CHANGE 24-27 — Molecular Chaos Deck node (clamped size, clean face labels).
 */

import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import type { DeckNodeMetrics } from "@/lib/argusforge/af03-realm-map";
import {
  formatUsedLabel,
  freshnessToBorder,
  freshnessToFill,
} from "@/lib/argusforge/af03-realm-map";

export type RealmDeckNodeData = {
  title: string;
  metrics: DeckNodeMetrics;
  selected: boolean;
  /** Dimmed when Focus mode isolates another node's neighborhood. */
  dimmed: boolean;
  hasAffinityHalo: boolean;
  /** Reserved — pulse removed in 24-27 (no decorative motion). */
  reduceMotion: boolean;
};

export type RealmDeckFlowNode = Node<RealmDeckNodeData, "realmDeck">;

const MIN_DIAMETER = 96;
const MAX_DIAMETER = 180;

/** Clamp rendered diameter from mass visualWeight (24-27). */
export function clampDeckNodeDiameter(visualWeight: number): number {
  const raw = 112 + Math.min(48, Math.max(0, visualWeight) * 14);
  return Math.round(Math.min(MAX_DIAMETER, Math.max(MIN_DIAMETER, raw)));
}

/**
 * Chaos Deck molecular body — size=mass, color=recent use, ring=selected, halo=affinity.
 * No m1.0 / 0f / pulse on the face.
 */
export function RealmDeckNode({ data }: NodeProps<RealmDeckFlowNode>) {
  const { title, metrics, selected, dimmed, hasAffinityHalo } = data;
  const size = clampDeckNodeDiameter(metrics.visualWeight);
  const fill = freshnessToFill(metrics.freshness, false, 1);
  const border = selected ? "#fafafa" : freshnessToBorder(metrics.freshness, 1);
  const usedLabel = formatUsedLabel(metrics.lastUsedAt ?? metrics.lastActivityAt);
  const fragmentLabel =
    metrics.fragmentCount === 1
      ? "1 Fragment"
      : `${metrics.fragmentCount} Fragments`;

  return (
    <div
      className="relative"
      style={{
        width: size + (hasAffinityHalo ? 14 : 0),
        opacity: dimmed ? 0.22 : 1,
        transition: "opacity 160ms ease",
      }}
    >
      {hasAffinityHalo ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full border border-dashed border-emerald-400/35"
          style={{ margin: -7 }}
          title="Detected affinity — not a confirmed relation"
        />
      ) : null}
      <div
        className={`relative rounded-full border-2 px-2.5 py-2.5 text-center shadow-md ${
          selected ? "ring-2 ring-white/90" : ""
        }`}
        style={{
          width: size,
          minHeight: size,
          background: fill,
          borderColor: border,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Handle
          type="target"
          position={Position.Left}
          className="!h-2 !w-2 !border-0 !bg-violet-400"
        />
        <p className="line-clamp-2 px-0.5 text-[11px] font-semibold leading-snug text-zinc-50">
          {title}
        </p>
        <p className="mt-0.5 text-[9px] font-medium text-emerald-100/85">{fragmentLabel}</p>
        {usedLabel && usedLabel !== "Unused" ? (
          <p className="mt-0.5 text-[8px] text-emerald-200/65">{usedLabel}</p>
        ) : null}
        <Handle
          type="source"
          position={Position.Right}
          className="!h-2 !w-2 !border-0 !bg-violet-400"
        />
      </div>
    </div>
  );
}
