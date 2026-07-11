import { calculateTradeResult } from "./calculate";
import { MISTAKE_LABELS, computeRMultiple } from "./review";
import type { Playbook } from "./playbook-types";
import { getPlaybookName } from "./playbooks";
import type { Setup } from "./setup-types";
import { getSetupName } from "./setups";
import type { Trade } from "./types";

function formatSigned(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${Math.abs(value).toFixed(2)}`;
}

/** Single trade block for AI snapshots. */
export function formatTradeForSnapshot(
  trade: Trade,
  setups: Setup[] = [],
  playbooks: Playbook[] = []
): string {
  const lines: string[] = [];
  lines.push(`id:${trade.id} ticker:${trade.ticker} status:${trade.status}`);
  lines.push(`entry:${trade.entry} stop:${trade.stop} shares:${trade.shares}`);
  if (trade.target !== undefined) lines.push(`target:${trade.target}`);
  if (trade.exit !== undefined) lines.push(`exit:${trade.exit}`);
  const pnl = calculateTradeResult(trade);
  if (pnl !== null) lines.push(`pnl:${formatSigned(pnl)}`);
  const r = computeRMultiple(trade);
  if (r !== null) lines.push(`r_multiple:${r.toFixed(2)}`);
  const playbookName = getPlaybookName(playbooks, trade.playbookId);
  if (playbookName) lines.push(`playbook:${playbookName}`);
  const setupName = getSetupName(setups, trade.setupId);
  if (setupName) lines.push(`setup:${setupName}`);
  if (trade.thesis) lines.push(`thesis:${trade.thesis.replace(/\s+/g, " ").slice(0, 300)}`);
  if (trade.mistakes?.length) {
    lines.push(
      `mistakes:${trade.mistakes.map((m) => MISTAKE_LABELS[m] ?? m).join(", ")}`
    );
  }
  if (trade.reviewedAt) {
    lines.push(
      `review: E${trade.qualityEntry ?? "—"} X${trade.qualityExit ?? "—"} M${trade.qualityMgmt ?? "—"}`
    );
    if (trade.lesson) lines.push(`lesson:${trade.lesson}`);
  } else if (trade.status === "closed") {
    lines.push("review:pending");
  }
  return lines.join("\n");
}
