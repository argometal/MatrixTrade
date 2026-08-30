"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { ArgusUnit } from "@/lib/argusforge/argus-graph-types";

export type ArgusNodeData = {
  unit: ArgusUnit;
  selected: boolean;
};

export function ArgusUnitNode({ data }: NodeProps & { data: ArgusNodeData }) {
  const { unit, selected } = data;
  return (
    <div
      className={`min-w-[140px] max-w-[168px] rounded-lg border px-2.5 py-2 shadow-sm ${
        selected
          ? "border-emerald-400 bg-zinc-900 ring-1 ring-emerald-400/40"
          : unit.confirmed
            ? "border-emerald-700/80 bg-zinc-950"
            : "border-zinc-700 bg-zinc-950"
      }`}
    >
      <Handle type="target" position={Position.Left} className="!h-2 !w-2 !bg-emerald-400" />
      <p className="truncate text-[11px] font-semibold text-zinc-100">{unit.label}</p>
      <p className="mt-0.5 truncate text-[9px] font-medium uppercase tracking-wide text-emerald-300/90">
        {unit.evidenceType}
        {unit.confirmed ? " · ✓" : ""}
      </p>
      {unit.tags.length > 0 ? (
        <p className="mt-0.5 truncate text-[9px] text-zinc-500">{unit.tags.slice(0, 3).join(" · ")}</p>
      ) : null}
      <Handle type="source" position={Position.Right} className="!h-2 !w-2 !bg-emerald-400" />
    </div>
  );
}
