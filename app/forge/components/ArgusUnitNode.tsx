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
      className={`min-w-[140px] max-w-[160px] rounded-lg border px-2.5 py-2 shadow-sm ${
        selected
          ? "border-sky-500 bg-zinc-900 ring-1 ring-sky-500/40"
          : "border-zinc-700 bg-zinc-950"
      }`}
    >
      <Handle type="target" position={Position.Left} className="!bg-zinc-500 !w-2 !h-2" />
      <p className="truncate text-[11px] font-semibold text-zinc-100">{unit.label}</p>
      <p className="mt-0.5 truncate text-[9px] uppercase tracking-wide text-zinc-500">
        {unit.source === "chaos" ? unit.kind : "demo"}
      </p>
      <Handle type="source" position={Position.Right} className="!bg-zinc-500 !w-2 !h-2" />
    </div>
  );
}
