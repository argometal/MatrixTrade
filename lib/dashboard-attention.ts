import type { BridgeInboxItem } from "./bridge";
import {
  formatIncompleteClosedSummary,
  listIncompleteClosedTrades,
} from "./incomplete-closed-trades";
import type { MonthlyRisk } from "./monthly-risk";
import {
  inboxAttentionLabel,
  normalizePendingInboxItems,
} from "./pending-inbox";
import type { Playbook } from "./playbook-types";
import type { Trade } from "./types";
import type { NeedsAttentionTaskType } from "./needs-attention-types";

export interface AttentionItem {
  id: string;
  label: string;
  href: string;
  priority: number;
  /** Stable derived AI task id (ATTN-…). */
  taskId?: string;
  taskType?: NeedsAttentionTaskType;
  /** Prebuilt Needs Attention task snapshot for Copy for AI. */
  taskSnapshotText?: string;
  /**
   * Apply block types this row can actually use (PROMPT 16-01).
   * Empty / omitted → UI must not show an Apply button.
   */
  allowedApplyBlockTypes?: string[];
  /** Prefill Control → Apply when opening from this row (optional). */
  suggestedApplyJson?: string;
}

/**
 * Needs Attention builders — human intervention only (PROMPT 16-01).
 * Removed from this queue: playbook samples, monthly risk nags, plan window closing,
 * Enter-plan ready (ops live in Scout), first-pass learning sync noise.
 */
export function buildAttentionItems(
  trades: Trade[],
  pendingInbox: BridgeInboxItem[],
  _playbooks?: Playbook[],
  _monthly?: MonthlyRisk
): AttentionItem[] {
  const items: AttentionItem[] = [];

  const incompleteClosed = listIncompleteClosedTrades(trades);
  if (incompleteClosed.length > 0) {
    items.push({
      id: "incomplete-closed",
      label:
        incompleteClosed.length === 1
          ? `Closed incomplete · ${incompleteClosed[0].trade.id} ${incompleteClosed[0].trade.ticker} (${formatIncompleteClosedSummary(incompleteClosed[0])})`
          : `Closed ≠ complete · ${incompleteClosed.length} trades need finishing`,
      href: "/mxt/trades",
      priority: 1,
    });
  }

  for (const row of incompleteClosed) {
    if (!row.gaps.includes("needs_review")) continue;
    items.push({
      id: `review-${row.trade.id}`,
      label: `Review ${row.trade.id} · ${row.trade.ticker}`,
      href: `/mxt/trades/${row.trade.id}/review`,
      priority: 1,
    });
  }

  // Always recompute from the live unique pending set — never trust historical IDs.
  const livePending = normalizePendingInboxItems(pendingInbox);
  if (livePending.length > 0) {
    items.push({
      id: "inbox",
      label: inboxAttentionLabel(livePending.length),
      href: "/mxt/inbox",
      priority: 2,
    });
  }

  // Assign playbook only when it blocks completing a closed trade record.
  for (const trade of trades.filter(
    (t) => t.status === "closed" && !t.playbookId && !t.playbookHistoricallyAbsent
  )) {
    items.push({
      id: `playbook-${trade.id}`,
      label: `Assign playbook · ${trade.id} ${trade.ticker}`,
      href: `/mxt/trades/${trade.id}`,
      priority: 3,
    });
  }

  return items.sort((a, b) => a.priority - b.priority);
}
