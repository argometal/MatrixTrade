import { LOSS_CLASSIFICATION_LABELS } from "./asymmetry-types";
import { calculateTradeResult } from "./calculate";
import type { Playbook } from "./playbook-types";
import { getPlaybookName } from "./playbooks";
import type { TradePlan } from "./plan-types";
import {
  computeHoldDays,
  computeRMultiple,
  computeRiskAmount,
  MISTAKE_LABELS,
} from "./review";
import type { StockThesis } from "./stock-thesis-types";
import type { Trade } from "./types";

export type TradeLegacyTier = "legacy" | "partial" | "linked";

export interface TradeLegacyAssessment {
  tier: TradeLegacyTier;
  missing: string[];
}

export function assessTradeLegacy(trade: Trade): TradeLegacyAssessment {
  const missing: string[] = [];
  if (!trade.playbookId) missing.push("playbookId");
  if (!trade.planId) missing.push("planId (scout PLAN link)");
  if (!trade.thesis?.trim()) missing.push("thesis snapshot at entry");
  if (trade.riskRewardPlanned === undefined) missing.push("riskRewardPlanned (strategy R at entry)");
  if (trade.status === "closed" && !trade.lossClassification) {
    missing.push("lossClassification (post-stop study)");
  }
  if (trade.status === "closed" && !trade.postStopStudy) {
    missing.push("postStopStudy (90-day shadow)");
  }

  let tier: TradeLegacyTier = "linked";
  if (missing.length >= 5) tier = "legacy";
  else if (missing.length > 0) tier = "partial";

  return { tier, missing };
}

function formatSignedUsd(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}$${Math.abs(value).toFixed(2)}`;
}

export const TRADE_FORENSIC_AI_REQUEST = [
  "Analysis Mode default — forensic discussion only, no JSON until explicit Apply.",
  "Study this closed trade as one statistical observation. Do not invent prices or fills.",
  "When human requests Apply, allowed blocks:",
  "- analysis — qualitative forensic notes (psychology, lessons, post-stop observations)",
  "- trade-update — attach planId, playbookId, lossClassification, postStopStudy, riskRewardPlanned",
  "- trade-review — supplement review fields if incomplete",
  "- attribution — MAF component attribution (evidence → which pipeline component dragged expectancy)",
  "Flag legacy gaps explicitly; suggest manual links only when human confirms.",
].join("\n");

export function formatTradeForensicSnapshot(input: {
  trade: Trade;
  playbooks?: Playbook[];
  linkedPlan?: TradePlan;
  linkedThesis?: StockThesis;
}): string {
  const { trade, playbooks = [], linkedPlan, linkedThesis } = input;
  const legacy = assessTradeLegacy(trade);
  const pnl = calculateTradeResult(trade);
  const rMultiple = computeRMultiple(trade);
  const riskUsd = computeRiskAmount(trade);
  const holdDays = computeHoldDays(trade);
  const riskPerShare = trade.entry - trade.stop;

  const lines: string[] = [
    "=== TRADE FORENSIC ===",
    `trade_id:${trade.id}`,
    `ticker:${trade.ticker}`,
    `status:${trade.status}`,
    `legacy_tier:${legacy.tier}`,
    `legacy_missing:${legacy.missing.length ? legacy.missing.join(", ") : "none"}`,
    "",
    "=== EXECUTION (facts) ===",
    `entry:${trade.entry}`,
    `strategy_stop:${trade.stop}`,
    `exit:${trade.exit ?? "na"}`,
    `target:${trade.target ?? "na"}`,
    `shares:${trade.shares}`,
    `direction:${trade.direction ?? "long"}`,
    `exit_reason:${trade.exitReason ?? "na"}`,
    `created:${trade.createdAt}`,
    `closed:${trade.closedAt ?? "na"}`,
    holdDays !== null ? `hold_days:${holdDays}` : null,
    "",
    "=== RISK / R (strategy stop) ===",
    `risk_per_share:${Number.isFinite(riskPerShare) ? riskPerShare.toFixed(2) : "na"}`,
    riskUsd !== null ? `risk_usd:${riskUsd.toFixed(2)}` : null,
    pnl !== null ? `realized_pnl:${formatSignedUsd(pnl)}` : null,
    rMultiple !== null ? `realized_r:${rMultiple.toFixed(2)}` : null,
    trade.riskRewardPlanned !== undefined
      ? `planned_rr_at_entry:${trade.riskRewardPlanned}`
      : "planned_rr_at_entry:na",
    trade.riskRewardActual !== undefined
      ? `actual_rr:${trade.riskRewardActual}`
      : null,
    "",
    "=== PIPELINE LINKS ===",
    `playbook:${getPlaybookName(playbooks, trade.playbookId) ?? trade.playbookId ?? "unassigned"}`,
    `plan_id:${trade.planId ?? linkedPlan?.id ?? "none"}`,
    `stock_thesis:${linkedThesis?.id ?? "none"}`,
    trade.setupId ? `setup_id:${trade.setupId}` : null,
    trade.setup ? `setup_note:${trade.setup.replace(/\s+/g, " ").slice(0, 200)}` : null,
    "",
    "=== REVIEW ===",
  ].filter((line): line is string => line !== null);

  if (trade.reviewedAt) {
    lines.push(
      `reviewed_at:${trade.reviewedAt}`,
      `quality_entry:${trade.qualityEntry ?? "—"}`,
      `quality_exit:${trade.qualityExit ?? "—"}`,
      `quality_mgmt:${trade.qualityMgmt ?? "—"}`,
      trade.mistakes?.length
        ? `mistakes:${trade.mistakes.map((m) => MISTAKE_LABELS[m] ?? m).join(", ")}`
        : "mistakes:none"
    );
    if (trade.lesson) lines.push(`lesson:${trade.lesson}`);
    if (trade.actionItem) lines.push(`action_item:${trade.actionItem}`);
    if (trade.lessons) lines.push(`lessons:${trade.lessons.replace(/\s+/g, " ").slice(0, 300)}`);
  } else {
    lines.push("review:pending");
  }

  if (trade.lossClassification) {
    lines.push(
      "",
      "=== POST-STOP STUDY ===",
      `loss_classification:${LOSS_CLASSIFICATION_LABELS[trade.lossClassification] ?? trade.lossClassification}`
    );
  } else if (trade.status === "closed" && pnl !== null && pnl < 0) {
    lines.push("", "=== POST-STOP STUDY ===", "loss_classification:pending_study");
  }

  if (trade.postStopStudy) {
    const study = trade.postStopStudy;
    lines.push(`study_started:${study.startedAt}`, `study_ends:${study.endsAt}`);
    if (study.targetReached !== undefined) {
      lines.push(`target_reached_after_stop:${study.targetReached ? "yes" : "no"}`);
    }
    if (study.thesisInvalidated !== undefined) {
      lines.push(`thesis_invalidated_after_stop:${study.thesisInvalidated ? "yes" : "no"}`);
    }
    if (study.maxPriceAfterStop !== undefined) {
      lines.push(`max_price_after_stop:${study.maxPriceAfterStop}`);
    }
    if (study.minPriceAfterStop !== undefined) {
      lines.push(`min_price_after_stop:${study.minPriceAfterStop}`);
    }
    if (study.notes) lines.push(`study_notes:${study.notes.replace(/\s+/g, " ").slice(0, 300)}`);
    if (study.classifiedAt) lines.push(`study_classified:${study.classifiedAt}`);
  }

  if (trade.thesis) {
    lines.push("", "=== THESIS AT TRADE ===", trade.thesis);
  }
  if (trade.psychology) {
    lines.push("", "=== PSYCHOLOGY ===", trade.psychology);
  }
  if (trade.notes) {
    lines.push("", "=== NOTES ===", trade.notes);
  }

  if (linkedPlan) {
    const planLines = [
      "",
      "=== LINKED SCOUT PLAN (if same ticker) ===",
      `plan_id:${linkedPlan.id}`,
      `plan_stop:${linkedPlan.stopPrice ?? "na"}`,
      `plan_entry:${linkedPlan.plannedEntry ?? "na"}`,
      `plan_target:${linkedPlan.targetPrice ?? "na"}`,
      linkedPlan.decision
        ? `decision:${linkedPlan.decision.verdict} confidence:${linkedPlan.decision.decisionConfidence}`
        : "decision:none",
    ];
    if (linkedPlan.executionMethod || linkedPlan.layeredEntry?.executionMethod) {
      planLines.push(
        `execution_method:${linkedPlan.executionMethod ?? linkedPlan.layeredEntry?.executionMethod}`
      );
    }
    lines.push(...planLines);
  }

  lines.push(
    "",
    "=== FORENSIC GUIDANCE FOR AI ===",
    "This export is for continued analysis of a closed observation.",
    "legacy_tier=legacy means pre-pipeline trade: no playbook/plan/thesis links — infer cautiously.",
    "R math uses trade.stop (strategy stop at execution), never Stock File structural invalidation.",
    "Suggest lossClassification and postStopStudy only after human discussion — Apply Mode only."
  );

  return lines.filter((line): line is string => line !== null).join("\n");
}
