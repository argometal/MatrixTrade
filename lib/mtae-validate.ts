import type {
  MtaeAsymmetryQuality,
  MtaeBattleZone,
  MtaeCalibrationErrorType,
  MtaeIntegratedView,
  MtaePriceZone,
  MtaeRankedLevel,
  MtaeReachProbability,
  MtaeTechnicalSummary,
  MtaeTimeframeReport,
  MtaeTimeframeRoles,
  MtaeTrend,
} from "./mtae-types";

const TRENDS: MtaeTrend[] = ["bullish", "neutral", "bearish"];
const REACH: MtaeReachProbability[] = ["high", "medium", "low"];
const ASYM: MtaeAsymmetryQuality[] = ["acceptable", "good", "excellent"];
const ERROR_TYPES: MtaeCalibrationErrorType[] = [
  "support_hierarchy",
  "resistance_hierarchy",
  "battle_zone",
  "probable_target",
  "extended_target",
  "structural_invalidation",
  "trend",
  "structure",
  "other",
];

function clampConfidence(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function parseZone(raw: unknown, label: string, errors: string[]): MtaePriceZone | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    errors.push(`${label} must be {low, high}`);
    return undefined;
  }
  const z = raw as Record<string, unknown>;
  const low = Number(z.low);
  const high = Number(z.high);
  if (!Number.isFinite(low) || !Number.isFinite(high)) {
    errors.push(`${label} low/high must be numbers`);
    return undefined;
  }
  if (low > high) {
    errors.push(`${label} low must be <= high`);
    return undefined;
  }
  return { low, high };
}

function parseTrend(raw: unknown, label: string, errors: string[]): MtaeTrend | undefined {
  const v = String(raw ?? "").toLowerCase() as MtaeTrend;
  if (!TRENDS.includes(v)) {
    errors.push(`${label} must be bullish|neutral|bearish`);
    return undefined;
  }
  return v;
}

function parseRankedLevels(raw: unknown, label: string, errors: string[]): MtaeRankedLevel[] {
  if (!Array.isArray(raw)) {
    errors.push(`${label} must be an array`);
    return [];
  }
  const out: MtaeRankedLevel[] = [];
  raw.forEach((item, i) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      errors.push(`${label}[${i}] must be an object`);
      return;
    }
    const row = item as Record<string, unknown>;
    const rank = Number(row.rank);
    const reason = String(row.reason ?? "").trim();
    const confidence = clampConfidence(Number(row.confidence ?? 0));
    if (!Number.isFinite(rank) || rank < 1) {
      errors.push(`${label}[${i}].rank must be >= 1`);
      return;
    }
    if (!reason) {
      errors.push(`${label}[${i}].reason required`);
      return;
    }
    const price =
      row.price !== undefined && Number.isFinite(Number(row.price)) ? Number(row.price) : undefined;
    const zone = parseZone(row.zone, `${label}[${i}].zone`, errors);
    if (price === undefined && !zone) {
      errors.push(`${label}[${i}] needs price or zone`);
      return;
    }
    out.push({
      rank,
      price,
      zone,
      strength:
        row.strength !== undefined && Number.isFinite(Number(row.strength))
          ? clampConfidence(Number(row.strength))
          : undefined,
      reason,
      confidence,
    });
  });
  return out;
}

function parseBattleZones(raw: unknown, label: string, errors: string[]): MtaeBattleZone[] {
  if (!Array.isArray(raw)) {
    errors.push(`${label} must be an array`);
    return [];
  }
  const out: MtaeBattleZone[] = [];
  raw.forEach((item, i) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      errors.push(`${label}[${i}] must be an object`);
      return;
    }
    const row = item as Record<string, unknown>;
    const id = String(row.id ?? "").trim() || `bz-${i + 1}`;
    const low = Number(row.low);
    const high = Number(row.high);
    const reachProbability = String(row.reachProbability ?? "").toLowerCase() as MtaeReachProbability;
    const asymmetryQuality = String(row.asymmetryQuality ?? "").toLowerCase() as MtaeAsymmetryQuality;
    const technicalImportance = clampConfidence(Number(row.technicalImportance ?? 0));
    const reason = String(row.reason ?? "").trim();
    if (!Number.isFinite(low) || !Number.isFinite(high) || low > high) {
      errors.push(`${label}[${i}] needs valid low/high`);
      return;
    }
    if (!REACH.includes(reachProbability)) {
      errors.push(`${label}[${i}].reachProbability must be high|medium|low`);
      return;
    }
    if (!ASYM.includes(asymmetryQuality)) {
      errors.push(`${label}[${i}].asymmetryQuality must be acceptable|good|excellent`);
      return;
    }
    if (!reason) {
      errors.push(`${label}[${i}].reason required`);
      return;
    }
    out.push({ id, low, high, reachProbability, asymmetryQuality, technicalImportance, reason });
  });
  return out;
}

function parseTimeframeRoles(raw: unknown, errors: string[]): MtaeTimeframeRoles | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    errors.push("timeframeRoles must be an object");
    return null;
  }
  const r = raw as Record<string, unknown>;
  const strategic_tf = String(r.strategic_tf ?? "").trim();
  const opportunity_tf = String(r.opportunity_tf ?? "").trim();
  const refinement_tf = String(r.refinement_tf ?? "").trim();
  const execution_tf = String(r.execution_tf ?? "").trim();
  if (!strategic_tf || !opportunity_tf || !refinement_tf || !execution_tf) {
    errors.push(
      "timeframeRoles requires strategic_tf, opportunity_tf, refinement_tf, execution_tf"
    );
    return null;
  }
  const roles: MtaeTimeframeRoles = {
    strategic_tf,
    opportunity_tf,
    refinement_tf,
    execution_tf,
  };
  if (r.execution_detail_tf !== undefined) {
    const detail = String(r.execution_detail_tf).trim();
    if (detail) roles.execution_detail_tf = detail;
  }
  return roles;
}

function parsePerTimeframe(raw: unknown, errors: string[]): MtaeTimeframeReport[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    errors.push("perTimeframe must be a non-empty array");
    return [];
  }
  const out: MtaeTimeframeReport[] = [];
  raw.forEach((item, i) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      errors.push(`perTimeframe[${i}] must be an object`);
      return;
    }
    const row = item as Record<string, unknown>;
    const timeframe = String(row.timeframe ?? "").trim();
    if (!timeframe) {
      errors.push(`perTimeframe[${i}].timeframe required`);
      return;
    }
    const trend = parseTrend(row.trend, `perTimeframe[${i}].trend`, errors);
    if (!trend) return;
    const structuralInvalidation = String(row.structuralInvalidation ?? "").trim();
    const summary = String(row.summary ?? "").trim();
    if (!structuralInvalidation) {
      errors.push(`perTimeframe[${i}].structuralInvalidation required`);
      return;
    }
    if (!summary) {
      errors.push(`perTimeframe[${i}].summary required`);
      return;
    }
    const structureRaw =
      row.structure && typeof row.structure === "object" && !Array.isArray(row.structure)
        ? (row.structure as Record<string, unknown>)
        : {};
    const contradictions = Array.isArray(row.contradictions)
      ? row.contradictions.map((c) => String(c).trim()).filter(Boolean)
      : [];

    const report: MtaeTimeframeReport = {
      timeframe,
      trend,
      trendConfidence: clampConfidence(Number(row.trendConfidence ?? row.confidence ?? 50)),
      structure: {
        higherHighs: typeof structureRaw.higherHighs === "boolean" ? structureRaw.higherHighs : undefined,
        higherLows: typeof structureRaw.higherLows === "boolean" ? structureRaw.higherLows : undefined,
        channel: typeof structureRaw.channel === "boolean" ? structureRaw.channel : undefined,
        range: typeof structureRaw.range === "boolean" ? structureRaw.range : undefined,
        distribution:
          typeof structureRaw.distribution === "boolean" ? structureRaw.distribution : undefined,
        compression:
          typeof structureRaw.compression === "boolean" ? structureRaw.compression : undefined,
        broken: typeof structureRaw.broken === "boolean" ? structureRaw.broken : undefined,
        note: structureRaw.note !== undefined ? String(structureRaw.note) : undefined,
      },
      supports: parseRankedLevels(row.supports ?? [], `perTimeframe[${i}].supports`, errors),
      resistances: parseRankedLevels(row.resistances ?? [], `perTimeframe[${i}].resistances`, errors),
      battleZones: parseBattleZones(row.battleZones ?? [], `perTimeframe[${i}].battleZones`, errors),
      structuralInvalidation,
      contradictions,
      summary,
    };
    if (row.probableTarget !== undefined && Number.isFinite(Number(row.probableTarget))) {
      report.probableTarget = Number(row.probableTarget);
    }
    if (row.extendedTarget !== undefined && Number.isFinite(Number(row.extendedTarget))) {
      report.extendedTarget = Number(row.extendedTarget);
    }
    if (
      report.probableTarget !== undefined &&
      report.extendedTarget !== undefined &&
      report.probableTarget === report.extendedTarget
    ) {
      errors.push(
        `perTimeframe[${i}]: probableTarget and extendedTarget must not be the same price`
      );
    }
    out.push(report);
  });
  return out;
}

function parseIntegrated(raw: unknown, errors: string[]): MtaeIntegratedView | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    errors.push("integrated must be an object");
    return null;
  }
  const row = raw as Record<string, unknown>;
  const structureSpine = String(row.structureSpine ?? "").trim();
  const opportunityNote = String(row.opportunityNote ?? "").trim();
  const executionContext = String(row.executionContext ?? "").trim();
  if (!structureSpine || !opportunityNote || !executionContext) {
    errors.push("integrated requires structureSpine, opportunityNote, executionContext");
    return null;
  }
  return {
    structureSpine,
    opportunityNote,
    executionContext,
    battleZoneRanking: parseBattleZones(
      row.battleZoneRanking ?? [],
      "integrated.battleZoneRanking",
      errors
    ),
    contradictions: Array.isArray(row.contradictions)
      ? row.contradictions.map((c) => String(c).trim()).filter(Boolean)
      : [],
  };
}

function parseTechnicalSummary(raw: unknown, errors: string[]): MtaeTechnicalSummary | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    errors.push("technicalSummary must be an object");
    return null;
  }
  const row = raw as Record<string, unknown>;
  const trend = parseTrend(row.trend, "technicalSummary.trend", errors);
  const structureNote = String(row.structureNote ?? "").trim();
  const structuralInvalidation = String(row.structuralInvalidation ?? "").trim();
  if (!trend || !structureNote || !structuralInvalidation) {
    errors.push(
      "technicalSummary requires trend, structureNote, structuralInvalidation"
    );
    return null;
  }

  // Forbidden Matrix decision fields in MTAE summary
  for (const banned of [
    "maximumEntry",
    "recommendedEntry",
    "plannedEntry",
    "minimumRR",
    "riskReward",
    "rr",
    "shares",
    "positionSize",
    "scoutVerdict",
    "verdict",
  ]) {
    if (row[banned] !== undefined) {
      errors.push(
        `technicalSummary must not include ${banned} — MTAE is technical only (Scout owns capital)`
      );
    }
  }

  const probableTarget =
    row.probableTarget !== undefined && Number.isFinite(Number(row.probableTarget))
      ? Number(row.probableTarget)
      : undefined;
  const extendedTarget =
    row.extendedTarget !== undefined && Number.isFinite(Number(row.extendedTarget))
      ? Number(row.extendedTarget)
      : undefined;
  if (
    probableTarget !== undefined &&
    extendedTarget !== undefined &&
    probableTarget === extendedTarget
  ) {
    errors.push("technicalSummary: probableTarget and extendedTarget must differ");
  }

  return {
    trend,
    structureNote,
    majorSupport:
      row.majorSupport !== undefined && Number.isFinite(Number(row.majorSupport))
        ? Number(row.majorSupport)
        : undefined,
    majorResistance:
      row.majorResistance !== undefined && Number.isFinite(Number(row.majorResistance))
        ? Number(row.majorResistance)
        : undefined,
    primaryBattleZone: parseZone(row.primaryBattleZone, "technicalSummary.primaryBattleZone", errors),
    secondaryBattleZone: parseZone(
      row.secondaryBattleZone,
      "technicalSummary.secondaryBattleZone",
      errors
    ),
    probableTarget,
    extendedTarget,
    structuralInvalidation,
    contradictions: Array.isArray(row.contradictions)
      ? row.contradictions.map((c) => String(c).trim()).filter(Boolean)
      : [],
    confidence: clampConfidence(Number(row.confidence ?? 50)),
  };
}

export type ParsedMtaeAssessmentProposal = {
  stockProfileId: string;
  ticker: string;
  asOfPrice?: number;
  timeframeMapId?: string;
  timeframeRoles: MtaeTimeframeRoles;
  perTimeframe: MtaeTimeframeReport[];
  integrated: MtaeIntegratedView;
  technicalSummary: MtaeTechnicalSummary;
  patchStockFile: boolean;
};

export function validateTechnicalAssessmentProposal(
  proposal: Record<string, unknown>
): { ok: true; value: ParsedMtaeAssessmentProposal } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const stockProfileId = String(proposal.stockProfileId ?? proposal.id ?? "")
    .trim()
    .toUpperCase();
  const ticker = String(proposal.ticker ?? "")
    .trim()
    .toUpperCase();
  if (!stockProfileId) errors.push("proposal.stockProfileId required");
  if (!ticker) errors.push("proposal.ticker required");

  const timeframeRoles = parseTimeframeRoles(proposal.timeframeRoles, errors);
  const perTimeframe = parsePerTimeframe(proposal.perTimeframe, errors);
  const integrated = parseIntegrated(proposal.integrated, errors);
  const technicalSummary = parseTechnicalSummary(proposal.technicalSummary, errors);

  if (errors.length || !timeframeRoles || !integrated || !technicalSummary) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      stockProfileId,
      ticker,
      asOfPrice:
        proposal.asOfPrice !== undefined && Number.isFinite(Number(proposal.asOfPrice))
          ? Number(proposal.asOfPrice)
          : undefined,
      timeframeMapId:
        proposal.timeframeMapId !== undefined
          ? String(proposal.timeframeMapId).trim() || undefined
          : undefined,
      timeframeRoles,
      perTimeframe,
      integrated,
      technicalSummary,
      patchStockFile: proposal.patchStockFile === false ? false : true,
    },
  };
}

export type ParsedMtaeCalibrationProposal = {
  assessmentId: string;
  stockProfileId: string;
  ticker: string;
  errorType: MtaeCalibrationErrorType;
  fieldPath: string;
  aiValue: unknown;
  humanValue: unknown;
  magnitude?: string;
  confidenceAdjustment?: number;
  reason: string;
};

export function validateTechnicalCalibrationProposal(
  proposal: Record<string, unknown>
): { ok: true; value: ParsedMtaeCalibrationProposal } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const assessmentId = String(proposal.assessmentId ?? "").trim().toUpperCase();
  const stockProfileId = String(proposal.stockProfileId ?? "").trim().toUpperCase();
  const ticker = String(proposal.ticker ?? "").trim().toUpperCase();
  const errorType = String(proposal.errorType ?? "").trim() as MtaeCalibrationErrorType;
  const fieldPath = String(proposal.fieldPath ?? "").trim();
  const reason = String(proposal.reason ?? "").trim();

  if (!assessmentId) errors.push("proposal.assessmentId required");
  if (!stockProfileId) errors.push("proposal.stockProfileId required");
  if (!ticker) errors.push("proposal.ticker required");
  if (!ERROR_TYPES.includes(errorType)) {
    errors.push(`proposal.errorType must be one of: ${ERROR_TYPES.join(", ")}`);
  }
  if (!fieldPath) errors.push("proposal.fieldPath required");
  if (proposal.aiValue === undefined) errors.push("proposal.aiValue required");
  if (proposal.humanValue === undefined) errors.push("proposal.humanValue required");
  if (!reason) errors.push("proposal.reason required");

  if (errors.length) return { ok: false, errors };

  return {
    ok: true,
    value: {
      assessmentId,
      stockProfileId,
      ticker,
      errorType,
      fieldPath,
      aiValue: proposal.aiValue,
      humanValue: proposal.humanValue,
      magnitude:
        proposal.magnitude !== undefined ? String(proposal.magnitude).trim() || undefined : undefined,
      confidenceAdjustment:
        proposal.confidenceAdjustment !== undefined &&
        Number.isFinite(Number(proposal.confidenceAdjustment))
          ? Number(proposal.confidenceAdjustment)
          : undefined,
      reason,
    },
  };
}
