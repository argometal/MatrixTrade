import { computePlannedRR } from "./plan-risk";
import { savePlan } from "./plans";
import type { DecisionVerdict } from "./scout-decision-types";
import {
  PLAN_TIMEFRAMES,
  type PlanStatus,
  type PlanTimeframe,
  type SavePlanInput,
} from "./plan-types";

export type InitialScoutInput = {
  plannedEntry?: number;
  supportLevel?: number;
  stopPrice?: number;
  targetPrice?: number;
  validFrom?: string;
  validUntil?: string;
  thesis?: string;
  playbookId?: string;
  analysisTimeframes?: PlanTimeframe[];
  entryTimeframe?: PlanTimeframe;
  verdict?: DecisionVerdict;
  minimumRR?: number;
  notes?: string;
  status?: PlanStatus;
};

const DEFAULT_ANALYSIS: PlanTimeframe[] = ["1W", "1D", "1H", "15m", "5m"];
const DEFAULT_ENTRY: PlanTimeframe = "5m";

function parseOptionalNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function parseOptionalIso(value: unknown): string | undefined {
  const raw = String(value ?? "").trim();
  if (!raw) return undefined;
  const parsed = Date.parse(raw);
  if (!Number.isFinite(parsed)) return undefined;
  return new Date(parsed).toISOString();
}

export function parseInitialScout(raw: unknown): InitialScoutInput | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const s = raw as Record<string, unknown>;

  const analysisTimeframes = Array.isArray(s.analysisTimeframes)
    ? s.analysisTimeframes
        .map((t) => String(t).trim())
        .filter((t): t is PlanTimeframe => (PLAN_TIMEFRAMES as readonly string[]).includes(t))
    : undefined;

  const entryRaw = s.entryTimeframe !== undefined ? String(s.entryTimeframe).trim() : undefined;
  const entryTimeframe =
    entryRaw && (PLAN_TIMEFRAMES as readonly string[]).includes(entryRaw)
      ? (entryRaw as PlanTimeframe)
      : undefined;

  return {
    plannedEntry: parseOptionalNumber(s.plannedEntry),
    supportLevel: parseOptionalNumber(s.supportLevel),
    stopPrice: parseOptionalNumber(s.stopPrice),
    targetPrice: parseOptionalNumber(s.targetPrice),
    validFrom: parseOptionalIso(s.validFrom),
    validUntil: parseOptionalIso(s.validUntil),
    thesis: s.thesis !== undefined ? String(s.thesis).trim() || undefined : undefined,
    playbookId: s.playbookId !== undefined ? String(s.playbookId).trim() || undefined : undefined,
    analysisTimeframes: analysisTimeframes?.length ? analysisTimeframes : undefined,
    entryTimeframe,
  };
}

export function validateInitialScout(
  scout: InitialScoutInput
): { ok: true } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (scout.stopPrice === undefined) {
    errors.push("initialScout.stopPrice required when initialScout is provided");
  }
  if (scout.targetPrice === undefined) {
    errors.push("initialScout.targetPrice required when initialScout is provided");
  }
  if (scout.plannedEntry === undefined && scout.supportLevel === undefined) {
    errors.push("initialScout needs plannedEntry or supportLevel");
  }
  return errors.length ? { ok: false, errors } : { ok: true };
}

export async function createInitialScoutPlan(
  stockThesisId: string,
  ticker: string,
  scout: InitialScoutInput,
  profileHypothesis?: string
): Promise<{ planId?: string; errors?: string[]; warnings?: string[] }> {
  const validation = validateInitialScout(scout);
  if (!validation.ok) return { errors: validation.errors };

  const analysisTimeframes = scout.analysisTimeframes ?? DEFAULT_ANALYSIS;
  const entryTimeframe = scout.entryTimeframe ?? DEFAULT_ENTRY;

  const input: SavePlanInput = {
    ticker,
    stockThesisId,
    playbookId: scout.playbookId,
    status: scout.status,
    analysisTimeframes,
    entryTimeframe,
    plannedEntry: scout.plannedEntry,
    supportLevel: scout.supportLevel,
    stopPrice: scout.stopPrice,
    targetPrice: scout.targetPrice,
    validFrom: scout.validFrom,
    validUntil: scout.validUntil,
    thesis: scout.thesis ?? profileHypothesis,
    chatNotes: scout.notes,
  };

  if (
    input.plannedEntry !== undefined &&
    input.stopPrice !== undefined &&
    input.targetPrice !== undefined
  ) {
    const rr = computePlannedRR(input.plannedEntry, input.stopPrice, input.targetPrice);
    if (rr) input.plannedRR = rr.rr;
  }

  const result = await savePlan(input);
  if (result.errors?.length) return { errors: result.errors };
  return {
    planId: result.plan?.id,
    warnings: result.warnings,
  };
}
