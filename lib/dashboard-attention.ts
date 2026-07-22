import type { BridgeInboxItem } from "./bridge";
import {
  formatIncompleteClosedSummary,
  listIncompleteClosedTrades,
} from "./incomplete-closed-trades";
import type { MonthlyRisk } from "./monthly-risk";
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
}

const MIN_PLAYBOOK_SAMPLES = 3;

export function buildAttentionItems(
  trades: Trade[],
  pendingInbox: BridgeInboxItem[],
  playbooks: Playbook[],
  monthly?: MonthlyRisk
): AttentionItem[] {
  const items: AttentionItem[] = [];

  if (monthly?.monthlyCapBreached) {
    items.push({
      id: "monthly-loss-limit",
      label: `Monthly loss limit reached (${monthly.monthKey})`,
      href: "/stats",
      priority: 0,
    });
  } else if (
    monthly &&
    monthly.monthlyLossRoom <= monthly.monthlyAllowance * 0.25
  ) {
    items.push({
      id: "monthly-loss-warning",
      label: "Monthly loss room running low",
      href: "/stats",
      priority: 0,
    });
  }

  const incompleteClosed = listIncompleteClosedTrades(trades);
  if (incompleteClosed.length > 0) {
    items.push({
      id: "incomplete-closed",
      label:
        incompleteClosed.length === 1
          ? `Closed incomplete · ${incompleteClosed[0].trade.id} ${incompleteClosed[0].trade.ticker} (${formatIncompleteClosedSummary(incompleteClosed[0])})`
          : `Closed ≠ complete · ${incompleteClosed.length} trades need finishing`,
      href: "/trades",
      priority: 1,
    });
  }

  for (const row of incompleteClosed) {
    if (!row.gaps.includes("needs_review")) continue;
    items.push({
      id: `review-${row.trade.id}`,
      label: `Review ${row.trade.id} · ${row.trade.ticker}`,
      href: `/trades/${row.trade.id}/review`,
      priority: 1,
    });
  }

  if (pendingInbox.length > 0) {
    items.push({
      id: "inbox",
      label:
        pendingInbox.length === 1
          ? "Apply inbox proposal"
          : `Apply ${pendingInbox.length} inbox proposals`,
      href: "/inbox",
      priority: 2,
    });
  }

  for (const trade of trades.filter((t) => !t.playbookId && t.status !== "pending")) {
    items.push({
      id: `playbook-${trade.id}`,
      label: `Assign playbook · ${trade.id} ${trade.ticker}`,
      href: `/trades/${trade.id}`,
      priority: 3,
    });
  }

  for (const pb of playbooks.filter((p) => p.status === "TESTING")) {
    const count = trades.filter((t) => t.playbookId === pb.id && t.status === "closed").length;
    if (count > 0 && count < MIN_PLAYBOOK_SAMPLES) {
      items.push({
        id: `samples-${pb.id}`,
        label: `${pb.name} requires more samples (${count}/${MIN_PLAYBOOK_SAMPLES})`,
        href: "/playbook",
        priority: 4,
      });
    }
  }

  return items.sort((a, b) => a.priority - b.priority);
}
