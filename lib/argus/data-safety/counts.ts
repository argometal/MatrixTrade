import type { ArgusData } from "../types";

export interface ArgusDataCounts {
  entities: number;
  logs: number;
  inboxItems: number;
  attachments: number;
}

export function countArgusData(data: ArgusData): ArgusDataCounts {
  return {
    entities: data.entities.length,
    logs: data.logs.length,
    inboxItems: data.inboxItems.length,
    attachments: data.attachments.length,
  };
}

export function totalCount(counts: ArgusDataCounts): number {
  return counts.entities + counts.logs + counts.inboxItems + counts.attachments;
}

/** True when after-count dropped without a declared destructive intent. */
export function isUnexpectedDrop(
  before: ArgusDataCounts,
  after: ArgusDataCounts,
  intent: WriteIntent
): boolean {
  if (intent === "destructive" || intent === "bootstrap") return false;
  return totalCount(after) < totalCount(before);
}

export type WriteIntent = "mutation" | "destructive" | "bootstrap";
