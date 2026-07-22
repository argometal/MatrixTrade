import {
  createInitialScoutPlan,
  parseInitialScout,
  validateInitialScout,
} from "./stock-case-initial-scout";
import { seedEvidenceFromHistoricalAnalysis } from "./seed-evidence-from-analysis";
import { rollbackStockCaseCreate } from "./stock-case-rollback";
import { validateScoutContract } from "./scout-contract";
import { listUnknownStockCaseCreateKeys } from "./stock-case-schema";
import { saveStockThesis } from "./stock-theses";
import type { SaveStockThesisInput, StockThesis } from "./stock-thesis-types";

function parseZone(raw: unknown): { low: number; high: number } | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const z = raw as Record<string, unknown>;
  const low = Number(z.low);
  const high = Number(z.high);
  if (!Number.isFinite(low) || !Number.isFinite(high)) return undefined;
  return { low, high };
}

function parseLevels(raw: unknown): SaveStockThesisInput["levels"] {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const l = raw as Record<string, unknown>;
  const targets = Array.isArray(l.targets)
    ? l.targets.map((t) => Number(t)).filter((n) => Number.isFinite(n))
    : undefined;

  return {
    majorSupport: Number.isFinite(Number(l.majorSupport)) ? Number(l.majorSupport) : undefined,
    majorResistance: Number.isFinite(Number(l.majorResistance))
      ? Number(l.majorResistance)
      : undefined,
    primaryZone: parseZone(l.primaryZone),
    secondaryZone: parseZone(l.secondaryZone),
    targets: targets?.length ? targets : undefined,
  };
}

function parseRiskRules(
  raw: unknown
): { ok: true; value: SaveStockThesisInput["riskRules"] } | { ok: false; errors: string[] } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, errors: ["proposal.riskRules required"] };
  }
  const r = raw as Record<string, unknown>;
  const errors: string[] = [];
  const minimumRR = Number(r.minimumRR);
  if (!Number.isFinite(minimumRR) || minimumRR <= 0) {
    errors.push("proposal.riskRules.minimumRR required (positive number)");
  }
  const invalidation = String(r.invalidation ?? "").trim();
  if (!invalidation) errors.push("proposal.riskRules.invalidation required");
  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    value: {
      minimumRR,
      invalidation,
      notes: r.notes !== undefined ? String(r.notes).trim() || undefined : undefined,
    },
  };
}

function parseHistoricalAnalysis(raw: unknown): SaveStockThesisInput["historicalAnalysis"] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const row = item as Record<string, unknown>;
      const timeframe = String(row.timeframe ?? "").trim();
      const summary = String(row.summary ?? "").trim();
      if (!timeframe || !summary) return null;
      return { timeframe, summary };
    })
    .filter((row): row is { timeframe: string; summary: string } => row !== null);
}

function hasLevels(levels: SaveStockThesisInput["levels"]): boolean {
  if (!levels) return false;
  return Boolean(
    levels.primaryZone ||
      levels.secondaryZone ||
      levels.majorSupport !== undefined ||
      levels.targets?.length
  );
}

export function proposalToStockCaseInput(
  proposal: Record<string, unknown>
): { input?: SaveStockThesisInput; initialScout?: ReturnType<typeof parseInitialScout>; errors?: string[] } {
  const errors: string[] = [];
  const ticker = String(proposal.ticker ?? "").trim().toUpperCase();
  if (!ticker) errors.push("proposal.ticker required");

  const currentHypothesis = String(proposal.currentHypothesis ?? "").trim();
  if (!currentHypothesis) errors.push("proposal.currentHypothesis required");

  const thesisRaw = String(proposal.thesis ?? "").trim();
  const notesRaw = String(proposal.notes ?? "").trim();
  const thesis = thesisRaw || currentHypothesis;

  const riskParsed = parseRiskRules(proposal.riskRules);
  if (!riskParsed.ok) return { errors: riskParsed.errors };

  const levels = parseLevels(proposal.levels);
  if (!hasLevels(levels)) {
    errors.push("proposal.levels required (primaryZone, secondaryZone, majorSupport, or targets)");
  }

  const unknown = listUnknownStockCaseCreateKeys(proposal);
  if (unknown.length) {
    errors.push(
      `proposal has unknown keys (schema-first): ${unknown.join(", ")}`
    );
  }

  if (proposal.initialScout === undefined || proposal.initialScout === null) {
    errors.push(
      "proposal.initialScout required — plannedEntry, stopPrice, and targetPrice are mandatory on stock-case-create"
    );
  }

  const initialScout = parseInitialScout(proposal.initialScout);
  if (!initialScout) {
    errors.push(
      "proposal.initialScout must include plannedEntry, stopPrice, and targetPrice"
    );
  } else {
    const scoutCheck = validateScoutContract(initialScout, {
      prefix: "initialScout",
      requirePresent: true,
    });
    if (!scoutCheck.ok) errors.push(...scoutCheck.errors);
  }

  // Bare-price invalidation rejected
  const inv = String(
    (proposal.riskRules as Record<string, unknown> | undefined)?.invalidation ?? ""
  ).trim();
  if (inv && /^\d+(\.\d+)?$/.test(inv)) {
    errors.push(
      'proposal.riskRules.invalidation must be an observable event (e.g. "Weekly close below 130"), not a bare price'
    );
  }

  if (errors.length) return { errors };

  const statusRaw = proposal.status;
  const status =
    statusRaw !== undefined &&
    ["draft", "watching", "actionable", "invalidated", "archived"].includes(String(statusRaw))
      ? (String(statusRaw) as SaveStockThesisInput["status"])
      : "watching";

  return {
    input: {
      ticker,
      style: String(proposal.style ?? "swing").trim() || "swing",
      thesis,
      currentHypothesis,
      status,
      levels,
      riskRules: riskParsed.value,
      historicalAnalysis: parseHistoricalAnalysis(proposal.historicalAnalysis),
      notes: notesRaw || undefined,
    },
    initialScout,
  };
}

export type StockCaseCreateResult = {
  thesis?: StockThesis;
  planId?: string;
  evidenceSeeded?: number;
  errors?: string[];
  warnings?: string[];
};

export async function createStockCaseFromProposal(
  proposal: Record<string, unknown>
): Promise<StockCaseCreateResult> {
  const parsed = proposalToStockCaseInput(proposal);
  if (parsed.errors?.length) return { errors: parsed.errors };

  if (!parsed.initialScout) {
    return {
      errors: [
        "proposal.initialScout required — plannedEntry, stopPrice, and targetPrice are mandatory on stock-case-create",
      ],
    };
  }
  const scoutCheck = validateInitialScout(parsed.initialScout);
  if (!scoutCheck.ok) return { errors: scoutCheck.errors };

  const saveResult = await saveStockThesis(parsed.input!);
  if (saveResult.errors?.length) return { errors: saveResult.errors };

  const thesis = saveResult.thesis!;
  const warnings: string[] = [];

  let evidenceSeeded = 0;
  const historical = parsed.input!.historicalAnalysis ?? [];
  if (historical.length > 0) {
    const seed = await seedEvidenceFromHistoricalAnalysis(thesis.id, thesis.ticker, historical);
    evidenceSeeded = seed.count;
    if (seed.errors.length) {
      await rollbackStockCaseCreate(thesis.id);
      return { errors: seed.errors };
    }
  }

  let planId: string | undefined;
  if (parsed.initialScout) {
    const planResult = await createInitialScoutPlan(
      thesis.id,
      thesis.ticker,
      parsed.initialScout,
      thesis.currentHypothesis
    );
    if (planResult.errors?.length) {
      await rollbackStockCaseCreate(thesis.id);
      return { errors: planResult.errors };
    }
    planId = planResult.planId;
    if (planResult.warnings?.length) warnings.push(...planResult.warnings);
  }

  return {
    thesis,
    planId,
    evidenceSeeded,
    warnings: warnings.length ? warnings : undefined,
  };
}
