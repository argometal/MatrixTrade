import type { StockThesis, StockThesisHistoricalAnalysis } from "./stock-thesis-types";
import { getStockThesisById } from "./stock-theses";
import { getStockThesesStore } from "./stock-theses-store";
import type { MtaeAssessment, MtaeCalibration } from "./mtae-types";
import {
  appendMtaeAssessment,
  appendMtaeCalibration,
  getMtaeAssessmentById,
  getMtaeAssessments,
  getMtaeCalibrations,
  nextMtaeAssessmentId,
  nextMtaeCalibrationId,
} from "./mtae-store";
import {
  validateTechnicalAssessmentProposal,
  validateTechnicalCalibrationProposal,
} from "./mtae-validate";

function mergeHistoricalAnalysis(
  existing: StockThesisHistoricalAnalysis[],
  assessment: MtaeAssessment
): StockThesisHistoricalAnalysis[] {
  const byTf = new Map(existing.map((row) => [row.timeframe.toUpperCase(), row]));
  for (const report of assessment.perTimeframe) {
    byTf.set(report.timeframe.toUpperCase(), {
      timeframe: report.timeframe,
      summary: report.summary,
    });
  }
  return [...byTf.values()];
}

function patchThesisFromAssessment(
  thesis: StockThesis,
  assessment: MtaeAssessment
): StockThesis {
  const summary = assessment.technicalSummary;
  const targets = [summary.probableTarget, summary.extendedTarget].filter(
    (n): n is number => typeof n === "number" && Number.isFinite(n)
  );
  const stamp = assessment.createdAt.slice(0, 16).replace("T", " ");
  const block = `### MTAE · ${assessment.id} · ${stamp}\ntrend:${summary.trend} conf:${summary.confidence}\n${summary.structureNote}`;
  const notes = thesis.notes ? `${thesis.notes}\n\n${block}` : block;

  return {
    ...thesis,
    levels: {
      ...thesis.levels,
      majorSupport: summary.majorSupport ?? thesis.levels.majorSupport,
      majorResistance: summary.majorResistance ?? thesis.levels.majorResistance,
      primaryZone: summary.primaryBattleZone ?? thesis.levels.primaryZone,
      secondaryZone: summary.secondaryBattleZone ?? thesis.levels.secondaryZone,
      targets: targets.length ? targets : thesis.levels.targets,
    },
    riskRules: {
      ...thesis.riskRules,
      invalidation: summary.structuralInvalidation || thesis.riskRules.invalidation,
    },
    historicalAnalysis: mergeHistoricalAnalysis(thesis.historicalAnalysis ?? [], assessment),
    notes,
    version: thesis.version + 1,
    updatedAt: assessment.createdAt,
  };
}

export async function applyTechnicalAssessment(
  proposal: Record<string, unknown>
): Promise<{
  assessment?: MtaeAssessment;
  thesis?: StockThesis;
  errors?: string[];
}> {
  const parsed = validateTechnicalAssessmentProposal(proposal);
  if (!parsed.ok) return { errors: parsed.errors };

  const thesis = await getStockThesisById(parsed.value.stockProfileId);
  if (!thesis) {
    return { errors: [`Stock file ${parsed.value.stockProfileId} not found.`] };
  }
  if (thesis.ticker.toUpperCase() !== parsed.value.ticker) {
    return {
      errors: [
        `Ticker ${parsed.value.ticker} does not match Stock File ${thesis.ticker} (${thesis.id}).`,
      ],
    };
  }

  const existing = await getMtaeAssessments();
  const now = new Date().toISOString();
  const assessment: MtaeAssessment = {
    id: nextMtaeAssessmentId(existing, parsed.value.ticker),
    stockProfileId: parsed.value.stockProfileId,
    ticker: parsed.value.ticker,
    asOfPrice: parsed.value.asOfPrice,
    timeframeMapId: parsed.value.timeframeMapId,
    timeframeRoles: parsed.value.timeframeRoles,
    perTimeframe: parsed.value.perTimeframe,
    integrated: parsed.value.integrated,
    technicalSummary: parsed.value.technicalSummary,
    createdAt: now,
    source: "ai-block",
  };

  await appendMtaeAssessment(assessment);

  if (!parsed.value.patchStockFile) {
    return { assessment, thesis };
  }

  const updated = patchThesisFromAssessment(thesis, assessment);
  await getStockThesesStore().upsert(updated);
  return { assessment, thesis: updated };
}

export async function applyTechnicalCalibration(
  proposal: Record<string, unknown>
): Promise<{ calibration?: MtaeCalibration; errors?: string[] }> {
  const parsed = validateTechnicalCalibrationProposal(proposal);
  if (!parsed.ok) return { errors: parsed.errors };

  const assessment = await getMtaeAssessmentById(parsed.value.assessmentId);
  if (!assessment) {
    return { errors: [`Assessment ${parsed.value.assessmentId} not found.`] };
  }
  if (assessment.stockProfileId !== parsed.value.stockProfileId) {
    return {
      errors: [
        `Assessment ${assessment.id} belongs to ${assessment.stockProfileId}, not ${parsed.value.stockProfileId}.`,
      ],
    };
  }

  const existing = await getMtaeCalibrations();
  const calibration: MtaeCalibration = {
    id: nextMtaeCalibrationId(existing, parsed.value.ticker),
    assessmentId: parsed.value.assessmentId,
    stockProfileId: parsed.value.stockProfileId,
    ticker: parsed.value.ticker,
    errorType: parsed.value.errorType,
    fieldPath: parsed.value.fieldPath,
    aiValue: parsed.value.aiValue,
    humanValue: parsed.value.humanValue,
    magnitude: parsed.value.magnitude,
    confidenceAdjustment: parsed.value.confidenceAdjustment,
    reason: parsed.value.reason,
    createdAt: new Date().toISOString(),
  };

  await appendMtaeCalibration(calibration);
  return { calibration };
}
