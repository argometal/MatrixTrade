/**
 * Legacy reconstructed date correction via trade-update (Prompt 25-10F).
 * Does not invent broker timestamps — human-supplied evidence only.
 */
import { POST_STOP_STUDY_DAYS, type PostStopStudy } from "./asymmetry-types";
import {
  hasSatisfiedPlanLink,
  hasSatisfiedPlaybookLink,
} from "./legacy-trade-completion";
import type { Trade } from "./types";

export type DateCorrectionAuditEntry = {
  correctedAt: string;
  previousCreatedAt: string;
  previousClosedAt?: string;
  previousPostStopStartedAt?: string;
  previousPostStopEndsAt?: string;
  note: string;
};

export function isIsoTimestamp(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(value)) {
    return false;
  }
  return Number.isFinite(Date.parse(value));
}

export function addCalendarDaysIso(iso: string, days: number): string {
  return new Date(Date.parse(iso) + days * 24 * 60 * 60 * 1000).toISOString();
}

/**
 * Trade is closed and qualifies as legacy / reconstructed chronology.
 * Mirrors assessTradeLegacy gaps without importing trade-forensic-snapshot
 * (keeps Apply schema contract client-safe — no fs/playbooks-store).
 */
export function isClosedLegacyTradeForDateCorrection(trade: Trade): boolean {
  if (trade.status !== "closed") return false;
  if (trade.datesReconstructed) return true;
  if (trade.playbookHistoricallyAbsent || trade.planHistoricallyAbsent) return true;
  let missing = 0;
  if (!hasSatisfiedPlaybookLink(trade)) missing += 1;
  if (!hasSatisfiedPlanLink(trade)) missing += 1;
  if (!trade.thesis?.trim()) missing += 1;
  if (trade.riskRewardPlanned === undefined) missing += 1;
  if (!trade.lossClassification) missing += 1;
  if (!trade.postStopStudy) missing += 1;
  return missing > 0;
}

export function buildPostStopWindowFromClose(
  closedAt: string,
  trade: Pick<Trade, "id" | "entry" | "stop" | "target" | "postStopStudy">,
  durationDays = POST_STOP_STUDY_DAYS
): PostStopStudy {
  const startedAt = closedAt;
  const endsAt = addCalendarDaysIso(startedAt, durationDays);
  const prior = trade.postStopStudy;
  return {
    enabled: prior?.enabled ?? true,
    durationDays,
    startedAt,
    endsAt,
    originalTradeId: prior?.originalTradeId ?? trade.id,
    originalEntry: prior?.originalEntry ?? trade.entry,
    originalStop: prior?.originalStop ?? trade.stop,
    originalTargets:
      prior?.originalTargets ??
      (trade.target !== undefined ? [trade.target] : undefined),
    originalThesisInvalidation: prior?.originalThesisInvalidation,
    maxPriceAfterStop: prior?.maxPriceAfterStop,
    minPriceAfterStop: prior?.minPriceAfterStop,
    targetReached: prior?.targetReached,
    targetReachedAt: prior?.targetReachedAt,
    thesisInvalidated: prior?.thesisInvalidated,
    invalidationReachedAt: prior?.invalidationReachedAt,
    firstTerminalEvent: prior?.firstTerminalEvent,
    mfe: prior?.mfe,
    mae: prior?.mae,
    mfeMaeUnit: prior?.mfeMaeUnit,
    classifiedAt: prior?.classifiedAt,
    notes: prior?.notes,
  };
}

export type LegacyDateCorrectionProposal = {
  createdAt?: string;
  closedAt?: string;
  datesReconstructed: true;
  dateCorrectionNote: string;
  /** When true (default), rebuild postStopStudy window from corrected closedAt. */
  realignPostStopStudy?: boolean;
  postStopStudy?: PostStopStudy;
};

export function validateLegacyDateCorrectionProposal(
  trade: Trade,
  proposal: Record<string, unknown>
):
  | { ok: true; value: LegacyDateCorrectionProposal }
  | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const datesReconstructed = proposal.datesReconstructed === true;
  if (!datesReconstructed) {
    return { ok: false, errors: ["datesReconstructed must be true for legacy date correction"] };
  }

  if (trade.status !== "closed") {
    errors.push("legacy date correction only allowed on closed trades");
  } else if (!isClosedLegacyTradeForDateCorrection(trade)) {
    errors.push(
      "legacy date correction only allowed on closed legacy / reconstructed trades"
    );
  }

  const note = String(proposal.dateCorrectionNote ?? "").trim();
  if (!note) {
    errors.push("dateCorrectionNote required when datesReconstructed is true");
  }

  const createdAt =
    proposal.createdAt !== undefined
      ? String(proposal.createdAt).trim()
      : undefined;
  const closedAt =
    proposal.closedAt !== undefined
      ? String(proposal.closedAt).trim()
      : undefined;

  if (!createdAt && !closedAt && proposal.postStopStudy === undefined) {
    errors.push("Provide createdAt and/or closedAt (and optional postStopStudy) to correct");
  }
  if (createdAt !== undefined && !isIsoTimestamp(createdAt)) {
    errors.push("createdAt must be ISO-8601 UTC (e.g. 2026-06-25T00:00:00.000Z)");
  }
  if (closedAt !== undefined && !isIsoTimestamp(closedAt)) {
    errors.push("closedAt must be ISO-8601 UTC (e.g. 2026-06-25T00:00:00.000Z)");
  }

  let postStopStudy: PostStopStudy | undefined;
  if (proposal.postStopStudy !== undefined) {
    if (
      !proposal.postStopStudy ||
      typeof proposal.postStopStudy !== "object" ||
      Array.isArray(proposal.postStopStudy)
    ) {
      errors.push("postStopStudy must be an object");
    } else {
      postStopStudy = proposal.postStopStudy as PostStopStudy;
      if (postStopStudy.startedAt && !isIsoTimestamp(postStopStudy.startedAt)) {
        errors.push("postStopStudy.startedAt must be ISO-8601 UTC");
      }
      if (postStopStudy.endsAt && !isIsoTimestamp(postStopStudy.endsAt)) {
        errors.push("postStopStudy.endsAt must be ISO-8601 UTC");
      }
    }
  }

  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    value: {
      createdAt,
      closedAt,
      datesReconstructed: true,
      dateCorrectionNote: note,
      realignPostStopStudy: proposal.realignPostStopStudy !== false,
      postStopStudy,
    },
  };
}

/** Apply validated correction — never mutates prices, P/L, shares, review, thesis, or links. */
export function applyLegacyDateCorrection(
  trade: Trade,
  correction: LegacyDateCorrectionProposal,
  now = new Date().toISOString()
): Trade {
  const nextClosedAt = correction.closedAt ?? trade.closedAt;
  const nextCreatedAt = correction.createdAt ?? trade.createdAt;

  let nextStudy = trade.postStopStudy;
  if (correction.postStopStudy) {
    nextStudy = correction.postStopStudy;
  } else if (correction.realignPostStopStudy !== false && nextClosedAt) {
    nextStudy = buildPostStopWindowFromClose(nextClosedAt, trade);
  }

  const entry: DateCorrectionAuditEntry = {
    correctedAt: now,
    previousCreatedAt: trade.createdAt,
    previousClosedAt: trade.closedAt,
    previousPostStopStartedAt: trade.postStopStudy?.startedAt,
    previousPostStopEndsAt: trade.postStopStudy?.endsAt,
    note: correction.dateCorrectionNote,
  };
  const priorAudit = trade.dateCorrectionAudit ?? [];

  return {
    ...trade,
    createdAt: nextCreatedAt,
    closedAt: nextClosedAt,
    status: "closed",
    datesReconstructed: true,
    dateCorrectionNote: correction.dateCorrectionNote,
    dateCorrectionAudit: [...priorAudit, entry],
    postStopStudy: nextStudy,
  };
}

export function buildLegacyDateCorrectionExample(tradeId = "H001"): Record<string, unknown> {
  const closedAt = "2026-06-25T00:00:00.000Z";
  const endsAt = addCalendarDaysIso(closedAt, POST_STOP_STUDY_DAYS);
  return {
    type: "trade-update",
    source: "ai-block",
    proposal: {
      id: tradeId,
      createdAt: closedAt,
      closedAt,
      datesReconstructed: true,
      dateCorrectionNote:
        "Legacy dates corrected from human-reconstructed trade chronology. Exact broker timestamps unavailable.",
      postStopStudy: {
        enabled: true,
        durationDays: POST_STOP_STUDY_DAYS,
        startedAt: closedAt,
        endsAt,
        originalTradeId: tradeId,
        originalEntry: 240,
        originalStop: 230,
      },
    },
  };
}

export function buildLegacyDateCorrectionContractText(): string {
  const example = buildLegacyDateCorrectionExample("H001");
  const endsAt = String(
    (example.proposal as { postStopStudy: { endsAt: string } }).postStopStudy.endsAt
  );
  return [
    "=== LEGACY DATE CORRECTION (trade-update) ===",
    "Correct reconstructed chronology on CLOSED legacy trades only.",
    "Reconstructed dates are human-supplied evidence — not broker-verified.",
    "Do not silently overwrite dates without datesReconstructed + dateCorrectionNote.",
    "",
    "Allowed proposal keys (in addition to other trade-update fields):",
    "id, createdAt, closedAt, datesReconstructed, dateCorrectionNote, postStopStudy",
    "",
    "Required when correcting dates:",
    "- id",
    "- datesReconstructed: true",
    "- dateCorrectionNote: non-empty string",
    "- createdAt and/or closedAt (ISO-8601 UTC …Z)",
    "",
    "Rules:",
    "- Trade must be status=closed and legacy/reconstructed (historically absent links or incomplete legacy tier).",
    "- Does NOT reopen the trade.",
    "- Does NOT change entry, exit, stop, target, shares, P/L, review, thesis, playbookId, planId.",
    "- Prior createdAt/closedAt/postStop window preserved in dateCorrectionAudit[].",
    "- When closedAt is corrected, postStopStudy.startedAt/endsAt realign to closedAt + 90 calendar days",
    "  unless an explicit postStopStudy object is supplied in the same block.",
    `- Programmatic 90d check: 2026-06-25T00:00:00.000Z + 90d → ${endsAt}`,
    "",
    "EXAMPLE:",
    JSON.stringify(example, null, 2),
  ].join("\n");
}
