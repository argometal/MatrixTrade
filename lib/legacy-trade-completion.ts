/**
 * Legacy closed-trade completion (ATTN-INCOMPLETE-CLOSED) — Apply contract helpers.
 * No architecture change: uses existing trade-update / trade-review fields + sentinels.
 */
import { LOSS_CLASSIFICATIONS, POST_STOP_STUDY_DAYS, type PostStopStudy } from "./asymmetry-types";
import type { Trade } from "./types";

/** Persisted sentinel: playbook was historically absent — do not invent a real playbook id. */
export const LEGACY_ABSENT_PLAYBOOK_ID = "__legacy_none__";

/** Persisted sentinel: Scout PLAN was historically absent — do not invent PLAN-xxx. */
export const LEGACY_ABSENT_PLAN_ID = "__LEGACY_NONE__";

/** Visible Control / window labels the AI may ask the human to copy. */
export const VISIBLE_SNAPSHOT_MENU_LABELS = [
  "MTA Mechanics",
  "Apply schema contract",
  "Stock Files",
  "Apply",
  "Technical Analysis",
  "Playbook",
  "Scout Desk",
  "Learning",
  "Dashboard snapshot",
  "Trades snapshot",
  "{ID} trade snapshot",
  "{ID} forensic snapshot",
] as const;

/** Paths that must never appear as current instructions in Mechanics / schema text. */
export const FORBIDDEN_SNAPSHOT_PATH_PATTERNS: RegExp[] = [
  /Control\s*→\s*Train AI/i,
  /Control\s*->\s*Train AI/i,
  /Train AI\s*→/i,
  /Control\s*→\s*Update\b/i,
  /Control\s*->\s*Update\b/i,
  /Control\s*→\s*Closed trade/i,
  /Control\s*->\s*Closed trade/i,
];

export function isLegacyAbsentPlaybookId(value: string | undefined | null): boolean {
  return String(value ?? "").trim() === LEGACY_ABSENT_PLAYBOOK_ID;
}

export function isLegacyAbsentPlanId(value: string | undefined | null): boolean {
  return String(value ?? "").trim().toUpperCase() === LEGACY_ABSENT_PLAN_ID;
}

/** True when playbook link is either a real id or an explicit historical-absent sentinel. */
export function hasSatisfiedPlaybookLink(trade: Pick<Trade, "playbookId">): boolean {
  const id = trade.playbookId?.trim();
  return Boolean(id);
}

/** True when plan link is either a real PLAN id or an explicit historical-absent sentinel. */
export function hasSatisfiedPlanLink(trade: Pick<Trade, "planId">): boolean {
  const id = trade.planId?.trim();
  return Boolean(id);
}

/**
 * trade-update fields that clear ATTN-INCOMPLETE-CLOSED learning gaps
 * (review is separate via trade-review → reviewedAt).
 */
export const LEGACY_TRADE_UPDATE_FIELDS = {
  playbookId: {
    purpose: "Assign real playbook OR record historical absence",
    allowed: ["<existing-playbook-id>", LEGACY_ABSENT_PLAYBOOK_ID],
    forbidden: ["invented playbook ids", "null/omit (gap remains)", "__none__ (clears; gap remains)"],
  },
  planId: {
    purpose: "Link real Scout PLAN OR record historical absence",
    allowed: ["PLAN-xxx (existing)", LEGACY_ABSENT_PLAN_ID],
    forbidden: ["invented PLAN ids", "null/omit (gap remains)", "__none__ (clears; gap remains)"],
  },
  thesis: {
    purpose: "Thesis as known at entry (may be reconstructed; label it)",
    notes: "Prefix with [reconstructed] when not from original Scout",
  },
  riskRewardPlanned: {
    purpose: "Planned R at entry (strategy stop)",
    type: "number",
    notes: "Only from human-stated math — never invent",
  },
  lossClassification: {
    purpose: "Loss class after study (or pending_study while window open)",
    allowed: [...LOSS_CLASSIFICATIONS],
  },
  postStopStudy: {
    purpose: "90-day shadow study object",
    requiredKeys: [
      "enabled",
      "durationDays",
      "startedAt",
      "endsAt",
      "originalTradeId",
      "originalEntry",
    ],
  },
  notes: {
    purpose: "Optional — document historical absence / reconstruction rationale",
  },
} as const;

export function buildLegacyAbsentPostStopStudy(
  trade: Pick<Trade, "id" | "entry" | "stop" | "target" | "closedAt">,
  startedAt?: string
): PostStopStudy {
  const start = startedAt ?? trade.closedAt ?? new Date().toISOString();
  const endsAt = new Date(
    Date.parse(start) + POST_STOP_STUDY_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();
  return {
    enabled: true,
    durationDays: POST_STOP_STUDY_DAYS,
    startedAt: start,
    endsAt,
    originalTradeId: trade.id,
    originalEntry: trade.entry,
    originalStop: trade.stop,
    originalTargets: trade.target !== undefined ? [trade.target] : undefined,
  };
}

/** Example trade-update proposal that clears learning gaps without inventing Scout/Playbook links. */
export function buildLegacyTradeUpdateExample(tradeId = "H002"): Record<string, unknown> {
  return {
    type: "trade-update",
    source: "ai-block",
    proposal: {
      id: tradeId,
      playbookId: LEGACY_ABSENT_PLAYBOOK_ID,
      planId: LEGACY_ABSENT_PLAN_ID,
      thesis: "[reconstructed] Entry thesis as recalled at fill — not from a Scout PLAN.",
      riskRewardPlanned: 2.5,
      lossClassification: "pending_study",
      postStopStudy: {
        enabled: true,
        durationDays: POST_STOP_STUDY_DAYS,
        startedAt: "2026-07-10T00:00:00.000Z",
        endsAt: "2026-10-08T00:00:00.000Z",
        originalTradeId: tradeId,
        originalEntry: 100,
        originalStop: 90,
      },
      notes:
        "Legacy fill: no Playbook and no Scout PLAN existed in MTA at entry. Sentinels record absence — not fictional links.",
    },
  };
}

export function buildLegacyTradeCompletionContractText(): string {
  return [
    "=== LEGACY TRADE COMPLETION (ATTN-INCOMPLETE-CLOSED) ===",
    "Write path: Control → Apply only (Validate → Accept).",
    "Evidence: copy {ID} forensic snapshot from /trades/{ID} — never ask for Control → Closed trade.",
    "",
    "Gaps → Apply blocks:",
    "- needs_review → trade-review (sets reviewedAt)",
    "- missing_playbook | missing_plan | missing_thesis | missing_planned_rr | missing_loss_classification | missing_post_stop_study → trade-update",
    "",
    "Historical absence (do NOT invent links):",
    `- playbookId: "${LEGACY_ABSENT_PLAYBOOK_ID}" when no playbook existed historically`,
    `- planId: "${LEGACY_ABSENT_PLAN_ID}" when no Scout PLAN existed historically`,
    "- null / omit / \"\" / \"__none__\" leave the gap open (unassigned ≠ documented absence)",
    "- Never invent a real playbook id or PLAN-xxx to silence the alert",
    "",
    "Reconstructed fields (human-stated only):",
    "- thesis: string; prefix [reconstructed] when not from original Scout",
    "- riskRewardPlanned: number (strategy-stop R at entry)",
    "",
    "lossClassification enums:",
    ...LOSS_CLASSIFICATIONS.map((c) => `- ${c}`),
    "",
    "postStopStudy minimum keys:",
    LEGACY_TRADE_UPDATE_FIELDS.postStopStudy.requiredKeys.map((k) => `- ${k}`).join("\n"),
    "",
    "EXAMPLE trade-update (legacy H002-style):",
    JSON.stringify(buildLegacyTradeUpdateExample("H002"), null, 2),
  ].join("\n");
}

/** Apply legacy trade-update fields onto an in-memory trade (test / dry-run helper). */
export function applyLegacyTradeUpdateLocally(
  trade: Trade,
  proposal: Record<string, unknown>
): Trade {
  const next: Trade = { ...trade };
  if (proposal.playbookId !== undefined) next.playbookId = String(proposal.playbookId);
  if (proposal.planId !== undefined) next.planId = String(proposal.planId).toUpperCase();
  if (proposal.thesis !== undefined) next.thesis = String(proposal.thesis);
  if (proposal.riskRewardPlanned !== undefined) {
    next.riskRewardPlanned = Number(proposal.riskRewardPlanned);
  }
  if (proposal.lossClassification !== undefined) {
    next.lossClassification = String(
      proposal.lossClassification
    ) as Trade["lossClassification"];
  }
  if (proposal.postStopStudy !== undefined && typeof proposal.postStopStudy === "object") {
    next.postStopStudy = proposal.postStopStudy as PostStopStudy;
  }
  if (proposal.notes !== undefined) next.notes = String(proposal.notes);
  return next;
}

export function assertNoForbiddenSnapshotPaths(text: string, label: string): string[] {
  const hits: string[] = [];
  for (const re of FORBIDDEN_SNAPSHOT_PATH_PATTERNS) {
    // Allow educational anti-pattern lines that name retired paths.
    const lines = text.split("\n");
    for (const line of lines) {
      if (/^\s*FORBIDDEN:/i.test(line)) continue;
      if (/^\s*\*\*Retired:\*\*/i.test(line)) continue;
      if (/retired/i.test(line) && re.test(line)) continue;
      if (/\b(never ask|do not ask|don't ask|not ask)\b/i.test(line) && re.test(line)) {
        continue;
      }
      if (re.test(line)) {
        hits.push(`${label}: forbidden path in line: ${line.trim()}`);
      }
    }
  }
  return hits;
}
