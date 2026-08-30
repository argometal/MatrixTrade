"use client";

import { type NodeProps } from "@xyflow/react";
import type { ArgusGroup } from "@/lib/argusforge/argus-graph-types";

export type ArgusGroupNodeData = {
  group: ArgusGroup;
  memberCount: number;
};

export function ArgusGroupNode({ data }: NodeProps & { data: ArgusGroupNodeData }) {
  const { group, memberCount } = data;
  return (
    <div className="min-w-[150px] rounded-xl border border-dashed border-amber-700/70 bg-amber-950/30 px-3 py-2.5 shadow-sm">
      <p className="truncate text-[11px] font-semibold text-amber-100">{group.label}</p>
      <p className="mt-0.5 text-[9px] uppercase tracking-wide text-amber-500/90">
        Group · {memberCount} · {group.collapsed ? "collapsed" : "open"}
      </p>
    </div>
  );
}
