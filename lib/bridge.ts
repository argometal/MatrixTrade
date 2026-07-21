import { calculateTradeResult } from "./calculate";
import { computeMonthlyRisk } from "./monthly-risk";
import { LOSS_CLASSIFICATIONS } from "./asymmetry-types";
import { validateOptionalInitialScoutContract } from "./scout-contract";
import {
  validateTechnicalAssessmentProposal,
  validateTechnicalCalibrationProposal,
} from "./mtae-validate";
import { validateAttributionProposal } from "./maf-validate";
import { validateScoutPlanCreateProposal } from "./scout-plan-create-validate";
import type { Experiment, ExperimentRules, MistakeType, Trade } from "./types";
import type { Setup } from "./setup-types";
import { getSetupName } from "./setup-types";

export interface BridgeConfig {
  url: string;
  writeToken?: string;
  readToken?: string;
  configured: boolean;
}

export function getBridgeConfig(): BridgeConfig {
  const url =
    process.env.BRIDGE_WORKER_URL?.replace(/\/$/, "") ??
    "https://matrixtrade-bridge.argometal.workers.dev";
  const writeToken = process.env.BRIDGE_WRITE_TOKEN?.trim();
  const readToken = process.env.BRIDGE_READ_TOKEN?.trim();

  return {
    url,
    writeToken,
    readToken,
    configured: Boolean(writeToken && readToken),
  };
}

export const BRIDGE_SCHEMA_VERSION = 1;

export function buildBridgeSnapshot(
  experiment: Experiment,
  trades: Trade[],
  rules: ExperimentRules,
  setups: Setup[] = [],
  snapshotRevision = 0
): Record<string, unknown> {
  const closed = trades.filter((t) => t.status === "closed");
  const monthly = computeMonthlyRisk(trades, rules.monthlyLossLimit, undefined, {
    carryoverEnabled: rules.carryoverEnabled,
  });

  return {
    schemaVersion: BRIDGE_SCHEMA_VERSION,
    snapshotRevision,
    updatedAt: new Date().toISOString(),
    rules: {
      monthlyLossLimit: rules.monthlyLossLimit,
      maxLossPerTicker: rules.maxLossPerTicker,
      carryoverEnabled: rules.carryoverEnabled !== false,
    },
    monthly: {
      monthKey: monthly.monthKey,
      baseLimit: monthly.monthlyLossLimit,
      baseCap: monthly.baseCap,
      carryoverIn: monthly.carryoverIn,
      carryoverEnabled: monthly.carryoverEnabled,
      monthlyAllowance: monthly.monthlyAllowance,
      monthlyRoomCap: monthly.monthlyRoomCap,
      lossUsedThisMonth: monthly.lossUsedThisMonth,
      effectiveCap: monthly.effectiveLossCap,
      previousMonthLossUsed: monthly.previousMonthLossUsed,
      realizedPnL: monthly.monthlyRealizedPnL,
      lossRoom: monthly.monthlyLossRoom,
      capBreached: monthly.monthlyCapBreached,
      closedTrades: monthly.closedTradesThisMonth,
    },
    experiment: {
      realizedPnL: experiment.realizedPnL,
      grossLoss: experiment.grossLoss,
      closedTrades: experiment.closedTrades,
      wins: experiment.wins,
      losses: experiment.losses,
    },
    trades: trades.map((trade) => {
      const result = calculateTradeResult(trade);
      const row: Record<string, unknown> = {
        id: trade.id,
        ticker: trade.ticker,
        status: trade.status,
        entry: trade.entry,
        stop: trade.stop,
        shares: trade.shares,
        target: trade.target,
        setup: getSetupName(setups, trade.setupId),
        exit: trade.exit,
        result,
        reviewedAt: trade.reviewedAt,
        mistakes: trade.mistakes,
        qualityEntry: trade.qualityEntry,
        qualityExit: trade.qualityExit,
        qualityMgmt: trade.qualityMgmt,
        lesson: trade.lesson,
        actionItem: trade.actionItem,
      };
      return row;
    }),
    summary: {
      pendingReview: closed.filter((t) => !t.reviewedAt).length,
    },
  };
}

export interface BridgeInboxItem {
  id: string;
  receivedAt: string;
  status: "pending" | "applied" | "rejected";
  payload: Record<string, unknown>;
  origin: "worker" | "local" | "supabase";
}

export async function publishSnapshotToBridge(
  body: Record<string, unknown>
): Promise<
  | { ok: true; updatedAt: string; snapshotRevision: number; httpStatus: number }
  | { error: string; httpStatus?: number }
> {
  const { url, writeToken, configured } = getBridgeConfig();
  if (!configured || !writeToken) {
    return { error: "Bridge not configured. Set BRIDGE_WRITE_TOKEN and BRIDGE_READ_TOKEN in .env.local" };
  }

  const response = await fetch(`${url}/snapshot`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${writeToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    return {
      error: `Bridge POST /snapshot failed (${response.status}): ${text}`,
      httpStatus: response.status,
    };
  }

  const data = (await response.json()) as { updatedAt?: string };
  const snapshotRevision =
    typeof body.snapshotRevision === "number" ? body.snapshotRevision : 0;
  return {
    ok: true,
    updatedAt: data.updatedAt ?? String(body.updatedAt ?? new Date().toISOString()),
    snapshotRevision,
    httpStatus: response.status,
  };
}

export async function fetchBridgeInbox(): Promise<BridgeInboxItem[]> {
  const { url, readToken, configured } = getBridgeConfig();
  if (!configured || !readToken) return [];

  try {
    const response = await fetch(`${url}/inbox?token=${encodeURIComponent(readToken)}`, {
      cache: "no-store",
    });

    if (!response.ok) return [];

    const data = (await response.json()) as { items?: BridgeInboxItem[] };
    return (data.items ?? []).map((item) => ({ ...item, origin: "worker" as const }));
  } catch {
    return [];
  }
}

export async function ackBridgeInboxItem(
  id: string,
  status: "applied" | "rejected"
): Promise<{ ok: boolean; httpStatus?: number; error?: string }> {
  const { url, writeToken, configured } = getBridgeConfig();
  if (!configured || !writeToken) {
    return { ok: false, error: "Bridge not configured" };
  }

  const response = await fetch(`${url}/inbox/${encodeURIComponent(id)}/ack`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${writeToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status }),
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    return {
      ok: false,
      httpStatus: response.status,
      error: `Worker ack failed (${response.status}): ${text}`,
    };
  }

  return { ok: true, httpStatus: response.status };
}

export function getSnapshotReadUrl(): string | null {
  const { url, readToken, configured } = getBridgeConfig();
  if (!configured || !readToken) return null;
  return `${url}/snapshot?token=${encodeURIComponent(readToken)}`;
}

export type TradingProposalType =
  | "stock-case-create"
  | "stock-case-delete"
  | "evidence-add"
  | "scout-assessment"
  | "decision-update"
  | "layered-entry-update"
  | "file-update"
  | "scout-plan-create"
  | "technical-assessment"
  | "technical-calibration"
  | "trade-proposal"
  | "trade-close"
  | "trade-review"
  | "analysis"
  | "trade-update"
  | "attribution"
  | "playbook-create"
  | "playbook-update";

export interface TradingInboxPayload {
  type: TradingProposalType;
  source?: string;
  proposal: Record<string, unknown>;
}

export function parseTradingInboxPayload(
  payload: Record<string, unknown>
): TradingInboxPayload | null {
  const type = payload.type;
  const proposal = payload.proposal;
  if (
    type !== "stock-case-create" &&
    type !== "stock-case-delete" &&
    type !== "evidence-add" &&
    type !== "scout-assessment" &&
    type !== "decision-update" &&
    type !== "layered-entry-update" &&
    type !== "file-update" &&
    type !== "scout-plan-create" &&
    type !== "technical-assessment" &&
    type !== "technical-calibration" &&
    type !== "trade-proposal" &&
    type !== "trade-close" &&
    type !== "trade-review" &&
    type !== "analysis" &&
    type !== "trade-update" &&
    type !== "attribution" &&
    type !== "playbook-create" &&
    type !== "playbook-update"
  ) {
    return null;
  }
  if (!proposal || typeof proposal !== "object" || Array.isArray(proposal)) {
    return null;
  }
  return {
    type,
    source: typeof payload.source === "string" ? payload.source : undefined,
    proposal: proposal as Record<string, unknown>,
  };
}

export function describeProposal(payload: TradingInboxPayload): string {
  const p = payload.proposal;
  switch (payload.type) {
    case "stock-case-create":
      return `New Stock Profile ${p.ticker} · ${p.currentHypothesis ?? p.thesis ?? ""}`;
    case "stock-case-delete":
      return `Delete Stock Profile ${p.id}${p.reason ? ` · ${p.reason}` : ""}`;
    case "evidence-add":
      return `Evidence ${p.ticker} ${p.stockProfileId} · ${p.category}`;
    case "scout-assessment":
      return `Scout ${p.ticker} ${p.stockFileId} · verdict ${p.verdict}`;
    case "decision-update":
      return `Decision ${p.planId} · verdict ${p.verdict} · confidence ${p.decisionConfidence}`;
    case "layered-entry-update":
      return `Layered entry ${p.planId} · fill ${p.filledThroughIndex ?? p.status ?? "update"}`;
    case "file-update":
      return p.initialScout
        ? `Backfill scout on ${p.id}`
        : `Update Stock File ${p.id}`;
    case "scout-plan-create":
      return `New Scout Plan ${p.ticker ?? ""} · ${p.stockFileId ?? p.stockThesisId ?? ""}`;
    case "technical-assessment":
      return `MTAE ${p.ticker ?? ""} ${p.stockProfileId ?? p.id ?? ""} · technical assessment`;
    case "technical-calibration":
      return `MTAE calibration ${p.assessmentId ?? ""} · ${p.errorType ?? "correction"}`;
    case "trade-proposal": {
      const status =
        p.status !== undefined ? String(p.status).toLowerCase() : "pending";
      return `New trade ${p.id} ${p.ticker} · ${status} · entry ${p.entry} · stop ${p.stop} · ${p.shares} sh`;
    }
    case "trade-close": {
      const external =
        p.confirmExternalClose === true ? " · external confirm" : "";
      return `Close ${p.id} at exit ${p.exit}${external}`;
    }
    case "trade-review":
      return `Review ${p.id} · mistakes ${(p.mistakes as string[] | undefined)?.join(", ") ?? "—"}`;
    case "analysis":
      return `Analysis for ${p.id} · notes on trade`;
    case "trade-update":
      return `Update trade ${p.id}`;
    case "attribution":
      return `MAF attribution ${p.tradeId ?? p.planId ?? p.experimentId ?? ""} · ${(p.components as unknown[] | undefined)?.length ?? 0} components`;
    case "playbook-create":
      return `New playbook · ${p.name ?? "unnamed"}`;
    case "playbook-update":
      return `Update playbook ${p.id ?? p.name ?? "—"}`;
    default:
      return payload.type;
  }
}

export function validateProposalPayload(
  parsed: TradingInboxPayload
): { ok: true } | { ok: false; errors: string[] } {
  const p = parsed.proposal;
  const errors: string[] = [];

  if (parsed.type === "stock-case-create") {
    if (!p.ticker) errors.push("proposal.ticker required");
    if (!p.currentHypothesis || !String(p.currentHypothesis).trim()) {
      errors.push("proposal.currentHypothesis required");
    }
    if (!p.riskRules || typeof p.riskRules !== "object" || Array.isArray(p.riskRules)) {
      errors.push("proposal.riskRules required");
    } else {
      const r = p.riskRules as Record<string, unknown>;
      const minimumRR = Number(r.minimumRR);
      if (!Number.isFinite(minimumRR) || minimumRR <= 0) {
        errors.push("proposal.riskRules.minimumRR required (positive number)");
      }
      if (!r.invalidation || !String(r.invalidation).trim()) {
        errors.push("proposal.riskRules.invalidation required");
      }
    }
    const levels = p.levels;
    const hasLevels =
      levels &&
      typeof levels === "object" &&
      !Array.isArray(levels) &&
      (Boolean((levels as Record<string, unknown>).primaryZone) ||
        Boolean((levels as Record<string, unknown>).secondaryZone) ||
        (levels as Record<string, unknown>).majorSupport !== undefined ||
        (Array.isArray((levels as Record<string, unknown>).targets) &&
          ((levels as Record<string, unknown>).targets as unknown[]).length > 0));
    if (!hasLevels) {
      errors.push("proposal.levels required (primaryZone, majorSupport, or targets)");
    }
    if (p.initialScout !== undefined) {
      const scout = p.initialScout;
      if (!scout || typeof scout !== "object" || Array.isArray(scout)) {
        errors.push("proposal.initialScout must be an object");
      } else {
        const scoutCheck = validateOptionalInitialScoutContract(scout as Record<string, unknown>);
        if (!scoutCheck.ok) errors.push(...scoutCheck.errors);
      }
    }
  }

  if (parsed.type === "stock-case-delete") {
    if (!p.id || !String(p.id).trim()) {
      errors.push("proposal.id required");
    }
    if (p.confirmDelete !== true) {
      errors.push("proposal.confirmDelete must be true");
    }
  }

  if (parsed.type === "evidence-add") {
    if (!p.stockProfileId) errors.push("proposal.stockProfileId required");
    if (!p.ticker) errors.push("proposal.ticker required");
    if (!p.timeframe || !String(p.timeframe).trim()) errors.push("proposal.timeframe required");
    if (!p.value || !String(p.value).trim()) errors.push("proposal.value required");
    if (p.confidence === undefined) errors.push("proposal.confidence required (0-100)");
  }

  if (parsed.type === "scout-assessment") {
    if (!p.stockFileId) errors.push("proposal.stockFileId required");
    if (!p.ticker) errors.push("proposal.ticker required");
    const verdict = p.verdict;
    if (verdict !== "go" && verdict !== "wait" && verdict !== "no" && verdict !== "probe") {
      errors.push("proposal.verdict must be go, wait, probe, or no");
    }
    if (!Array.isArray(p.reasons) || p.reasons.length === 0) {
      errors.push("proposal.reasons[] required (min 1)");
    }
    if (!Array.isArray(p.challengesToThesis) || p.challengesToThesis.length === 0) {
      errors.push("proposal.challengesToThesis[] required (min 1) — AI must challenge thesis");
    }
  }

  if (parsed.type === "decision-update") {
    if (!p.planId) errors.push("proposal.planId required");

    const tacticalFields = [
      "plannedEntry",
      "stopPrice",
      "targetPrice",
      "minimumRR",
      "thesis",
      "notes",
      "validUntil",
      "status",
      "layeredEntry",
    ];
    const hasTactical = tacticalFields.some((field) => p[field] !== undefined);
    const hasDecisionMutation =
      p.verdict !== undefined &&
      p.decisionConfidence !== undefined &&
      Array.isArray(p.challenges) &&
      p.challenges.length > 0;

    if (!hasTactical && !hasDecisionMutation) {
      errors.push(
        "decision-update requires either decision fields (verdict, decisionConfidence, challenges) or at least one tactical field (plannedEntry, stopPrice, targetPrice, minimumRR, thesis, notes, validUntil, status, layeredEntry)"
      );
    }

    if (hasDecisionMutation) {
      const verdict = p.verdict;
      if (verdict !== "go" && verdict !== "wait" && verdict !== "no" && verdict !== "probe") {
        errors.push("proposal.verdict must be go, wait, probe, or no");
      }
      const confidence = Number(p.decisionConfidence);
      if (!Number.isFinite(confidence) || confidence < 0 || confidence > 100) {
        errors.push("proposal.decisionConfidence required (0-100)");
      }
      if (verdict === "probe") {
        const probe = p.probe;
        if (!probe || typeof probe !== "object" || Array.isArray(probe)) {
          errors.push("proposal.probe required when verdict is probe");
        } else {
          const probeObj = probe as Record<string, unknown>;
          if (!probeObj.trigger || !String(probeObj.trigger).trim()) {
            errors.push("proposal.probe.trigger required when verdict is probe");
          }
          if (!probeObj.expires) {
            errors.push("proposal.probe.expires required when verdict is probe");
          }
        }
      }
    }

    if (hasTactical) {
      for (const field of ["plannedEntry", "stopPrice", "targetPrice", "minimumRR"] as const) {
        if (p[field] !== undefined && !Number.isFinite(Number(p[field]))) {
          errors.push(`proposal.${field} must be a finite number`);
        }
      }
      if (p.status !== undefined) {
        const allowed = ["watching", "ready", "entered", "skipped", "failed", "expired"];
        if (!allowed.includes(String(p.status))) {
          errors.push(`proposal.status must be one of: ${allowed.join(", ")}`);
        }
      }
      if (p.layeredEntry !== undefined) {
        if (!p.layeredEntry || typeof p.layeredEntry !== "object" || Array.isArray(p.layeredEntry)) {
          errors.push("proposal.layeredEntry must be an object");
        }
      }
    }
  }

  if (parsed.type === "layered-entry-update") {
    if (!p.planId) errors.push("proposal.planId required");
    const hasUpdate =
      p.filledThroughIndex !== undefined ||
      (p.status &&
        ["missed", "partial", "full", "active", "planned", "cancelled"].includes(
          String(p.status)
        ));
    if (!hasUpdate) {
      errors.push("proposal.filledThroughIndex or proposal.status required");
    }
    if (p.filledThroughIndex !== undefined) {
      const idx = Number(p.filledThroughIndex);
      if (!Number.isFinite(idx) || idx < -1) {
        errors.push("proposal.filledThroughIndex must be >= -1");
      }
    }
  }

  if (parsed.type === "file-update") {
    if (!p.id) errors.push("proposal.id required");
    const hasField =
      p.status !== undefined ||
      p.currentHypothesis !== undefined ||
      p.notes !== undefined ||
      p.thesis !== undefined ||
      p.levels !== undefined ||
      p.riskRules !== undefined ||
      p.initialScout !== undefined;
    if (!hasField) {
      errors.push(
        "At least one of status, currentHypothesis, notes, thesis, levels, riskRules, initialScout required"
      );
    }
    if (p.status !== undefined) {
      const allowed = ["draft", "watching", "actionable", "invalidated", "archived"];
      if (!allowed.includes(String(p.status))) {
        errors.push(`proposal.status must be one of: ${allowed.join(", ")}`);
      }
    }
    if (p.initialScout !== undefined) {
      const scout = p.initialScout;
      if (!scout || typeof scout !== "object" || Array.isArray(scout)) {
        errors.push("proposal.initialScout must be an object");
      } else {
        const s = scout as Record<string, unknown>;
        const scoutCheck = validateOptionalInitialScoutContract(s);
        if (!scoutCheck.ok) errors.push(...scoutCheck.errors);
        if (s.verdict !== undefined) {
          const verdict = String(s.verdict);
          if (verdict !== "go" && verdict !== "wait" && verdict !== "probe" && verdict !== "no") {
            errors.push("initialScout.verdict must be go, wait, probe, or no");
          }
        }
        if (s.minimumRR !== undefined && (!Number.isFinite(Number(s.minimumRR)) || Number(s.minimumRR) <= 0)) {
          errors.push("initialScout.minimumRR must be a positive number");
        }
        if (s.status !== undefined) {
          const allowed = ["watching", "ready", "entered", "skipped", "failed", "expired"];
          if (!allowed.includes(String(s.status))) {
            errors.push(`initialScout.status must be one of: ${allowed.join(", ")}`);
          }
        }
      }
    }
  }

  if (parsed.type === "scout-plan-create") {
    const check = validateScoutPlanCreateProposal(p);
    if (!check.ok) errors.push(...check.errors);
  }

  if (parsed.type === "technical-assessment") {
    const check = validateTechnicalAssessmentProposal(p);
    if (!check.ok) errors.push(...check.errors);
  }

  if (parsed.type === "technical-calibration") {
    const check = validateTechnicalCalibrationProposal(p);
    if (!check.ok) errors.push(...check.errors);
  }

  if (parsed.type === "attribution") {
    const check = validateAttributionProposal(p);
    if (!check.ok) errors.push(...check.errors);
  }

  if (parsed.type === "trade-proposal") {
    if (!p.id) errors.push("proposal.id required");
    if (!p.ticker) errors.push("proposal.ticker required");
    if (!p.entry) errors.push("proposal.entry required");
    if (!p.stop) errors.push("proposal.stop required");
    if (!p.shares) errors.push("proposal.shares required");
    if (p.status !== undefined) {
      const status = String(p.status).toLowerCase();
      if (status !== "pending" && status !== "open") {
        errors.push('proposal.status must be "pending" or "open"');
      }
    }
  }

  if (parsed.type === "trade-close") {
    if (!p.id) errors.push("proposal.id required");
    if (!p.exit) errors.push("proposal.exit required");
    if (
      p.confirmExternalClose !== undefined &&
      typeof p.confirmExternalClose !== "boolean"
    ) {
      errors.push("proposal.confirmExternalClose must be true or false");
    }
  }

  if (parsed.type === "trade-review") {
    if (!p.id) errors.push("proposal.id required");
    if (!p.qualityEntry || !p.qualityExit || !p.qualityMgmt) {
      errors.push("qualityEntry, qualityExit, qualityMgmt required (1-5)");
    }
  }

  if (parsed.type === "analysis") {
    if (!p.id) errors.push("proposal.id required");
    if (!p.thesis && !p.psychology && !p.lessons && !p.notes) {
      errors.push("At least one of thesis, psychology, lessons, notes required");
    }
  }

  if (parsed.type === "trade-update") {
    if (!p.id) errors.push("proposal.id required");
    const hasField =
      p.entry !== undefined ||
      p.exit !== undefined ||
      p.stop !== undefined ||
      p.target !== undefined ||
      p.shares !== undefined ||
      p.ticker !== undefined ||
      p.thesis !== undefined ||
      p.psychology !== undefined ||
      p.lessons !== undefined ||
      p.notes !== undefined ||
      p.playbookId !== undefined ||
      p.setupId !== undefined ||
      p.status !== undefined ||
      p.closedAt !== undefined ||
      p.planId !== undefined ||
      p.plannedRisk !== undefined ||
      p.actualRisk !== undefined ||
      p.riskRewardPlanned !== undefined ||
      p.riskRewardActual !== undefined ||
      p.lossClassification !== undefined ||
      p.postStopStudy !== undefined ||
      p.exitReason !== undefined;
    if (!hasField) {
      errors.push(
        "At least one field to update required (entry, stop, target, shares, ticker, thesis, notes, playbookId, setupId, status, closedAt, planId, plannedRisk, actualRisk, riskRewardPlanned, riskRewardActual, lossClassification, postStopStudy, exitReason)"
      );
    }
    if (p.lossClassification !== undefined) {
      const classification = String(p.lossClassification).trim();
      if (!LOSS_CLASSIFICATIONS.includes(classification as (typeof LOSS_CLASSIFICATIONS)[number])) {
        errors.push("proposal.lossClassification is not a valid classification");
      }
    }
    if (p.exitReason !== undefined) {
      const exitReason = String(p.exitReason).trim().toLowerCase();
      const allowed = ["target", "stop", "manual", "time", "discipline", "other"] as const;
      if (!allowed.includes(exitReason as (typeof allowed)[number])) {
        errors.push("proposal.exitReason must be target, stop, manual, time, discipline, or other");
      }
    }
    for (const field of ["entry", "exit", "stop", "target", "shares", "plannedRisk", "actualRisk", "riskRewardPlanned", "riskRewardActual"] as const) {
      if (p[field] !== undefined && !Number.isFinite(Number(p[field]))) {
        errors.push(`proposal.${field} must be a finite number`);
      }
    }
    if (p.postStopStudy !== undefined) {
      if (!p.postStopStudy || typeof p.postStopStudy !== "object" || Array.isArray(p.postStopStudy)) {
        errors.push("proposal.postStopStudy must be an object");
      }
    }
  }

  if (parsed.type === "playbook-create") {
    if (!p.name || !String(p.name).trim()) errors.push("proposal.name required");
  }

  if (parsed.type === "playbook-update") {
    if (!p.id) errors.push("proposal.id required");
    const hasField =
      p.name !== undefined ||
      p.description !== undefined ||
      p.status !== undefined ||
      p.checklist !== undefined;
    if (!hasField) {
      errors.push("At least one of name, description, status, checklist required");
    }
  }

  return errors.length ? { ok: false, errors } : { ok: true };
}

export function proposalToPreviewJson(parsed: TradingInboxPayload): string {
  return JSON.stringify(parsed, null, 2);
}

export function parseMistakes(value: unknown): MistakeType[] {
  if (!Array.isArray(value)) return ["none"];
  const allowed: MistakeType[] = [
    "fomo",
    "chased",
    "oversized",
    "ignored_stop",
    "ignored_htf",
    "revenge",
    "none",
  ];
  const filtered = value.filter((v): v is MistakeType =>
    typeof v === "string" && allowed.includes(v as MistakeType)
  );
  return filtered.length ? filtered.slice(0, 3) : ["none"];
}
