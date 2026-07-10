import { fetchBridgeInbox } from "@/lib/bridge";
import { buildAttentionItems } from "@/lib/dashboard-attention";
import { getPlaybooks } from "@/lib/playbooks";
import { getUnreviewedTrades, isTradeReviewed } from "@/lib/review";
import { listAllPendingInboxItems } from "@/lib/trading-inbox-storage";
import { getTrades } from "@/lib/storage";

export async function loadReviewPageData() {
  const [trades, playbooks, workerInbox] = await Promise.all([
    getTrades(),
    getPlaybooks(),
    fetchBridgeInbox(),
  ]);

  const unreviewed = getUnreviewedTrades(trades);
  const pendingInbox = await listAllPendingInboxItems(workerInbox);
  const attentionItems = buildAttentionItems(trades, pendingInbox, playbooks);
  const needsPlaybook = trades.filter((t) => !t.playbookId && t.status !== "pending");
  const reviewedTrades = trades
    .filter((t) => t.status === "closed" && isTradeReviewed(t))
    .sort((a, b) => (b.reviewedAt ?? "").localeCompare(a.reviewedAt ?? ""));

  return {
    trades,
    attentionItems,
    unreviewed,
    pendingInbox,
    needsPlaybook,
    reviewedTrades,
  };
}
