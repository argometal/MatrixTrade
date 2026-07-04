import type { ArgusData } from "../types";
import { isActiveRecord } from "../supabase-protection/protected-counts";

export interface ArgusDataCounts {
  entities: number;
  logs: number;
  inboxItems: number;
  attachments: number;
}

/** Count active (non-soft-deleted) records only. */
export function countArgusData(data: ArgusData): ArgusDataCounts {
  return {
    entities: data.entities.filter(isActiveRecord).length,
    logs: data.logs.filter(isActiveRecord).length,
    inboxItems: data.inboxItems.filter(isActiveRecord).length,
    attachments: data.attachments.filter(isActiveRecord).length,
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
