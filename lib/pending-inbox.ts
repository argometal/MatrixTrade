/**
 * Live pending Inbox projection for Needs Attention / badges (Prompt 25-127).
 * Always recompute from current items — never trust historical inboxProposalIds.
 */
import type { BridgeInboxItem } from "./bridge";

/** True only for currently pending proposals (missing status treated as pending for legacy worker rows). */
export function isPendingInboxStatus(
  status: BridgeInboxItem["status"] | undefined
): boolean {
  return status === undefined || status === "pending";
}

/**
 * Keep only pending rows; dedupe by id (newest receivedAt wins).
 * Count / ATTN-INBOX-PROPOSALS must use this unique set.
 */
export function normalizePendingInboxItems(
  items: BridgeInboxItem[]
): BridgeInboxItem[] {
  const byId = new Map<string, BridgeInboxItem>();
  for (const item of items) {
    if (!item?.id) continue;
    if (!isPendingInboxStatus(item.status)) continue;
    const id = String(item.id);
    const prev = byId.get(id);
    if (!prev) {
      byId.set(id, item);
      continue;
    }
    const prevAt = prev.receivedAt ?? "";
    const nextAt = item.receivedAt ?? "";
    if (nextAt.localeCompare(prevAt) >= 0) {
      byId.set(id, item);
    }
  }
  return [...byId.values()].sort((a, b) =>
    (b.receivedAt ?? "").localeCompare(a.receivedAt ?? "")
  );
}

export function pendingInboxCount(items: BridgeInboxItem[]): number {
  return normalizePendingInboxItems(items).length;
}

export function pendingInboxProposalIds(
  items: BridgeInboxItem[],
  limit = 20
): string[] {
  return normalizePendingInboxItems(items)
    .map((row) => row.id)
    .slice(0, limit);
}

export function inboxAttentionLabel(count: number): string {
  if (count <= 0) return "";
  if (count === 1) return "Apply inbox proposal";
  return `Apply ${count} inbox proposals`;
}
