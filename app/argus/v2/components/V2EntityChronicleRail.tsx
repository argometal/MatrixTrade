"use client";

import type { V2TimelineEntry } from "@/lib/argus/v2/mock-data";
import { V2TimelineRail } from "./V2Timeline";
import { V2PanelCard, V2PanelHeader } from "./V2RightPanel";

export function V2EntityChronicleRail({
  entries,
  onOpenChronicle,
}: {
  entries: V2TimelineEntry[];
  onOpenChronicle?: () => void;
}) {
  return (
    <V2PanelCard>
      <V2PanelHeader
        title="Timeline"
        action={
          onOpenChronicle ? (
            <button
              type="button"
              onClick={onOpenChronicle}
              className="text-xs font-medium text-violet-400 hover:text-violet-300"
            >
              Open →
            </button>
          ) : undefined
        }
      />
      {entries.length === 0 ? (
        <p className="text-sm text-zinc-500">No activity yet.</p>
      ) : (
        <V2TimelineRail entries={entries} />
      )}
    </V2PanelCard>
  );
}
