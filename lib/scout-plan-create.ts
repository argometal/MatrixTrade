import { computePlannedRR } from "./plan-risk";
import type { PlanTimeframe, SavePlanInput, TradePlan } from "./plan-types";
import { PLAN_TIMEFRAMES } from "./plan-types";
import { recordScoutDecision, savePlan } from "./plans";
import {
  parseOptionalIso,
  parseOptionalNumber,
  parsePlaybookIds,
  parseScoutPlanCreateStatus,
  parseVerdict,
  validateScoutPlanCreateProposal,
} from "./scout-plan-create-validate";
import { getLinkedActiveScoutPlans } from "./scout-plan-repair";
import { getStockThesisById } from "./stock-theses";

export { validateScoutPlanCreateProposal } from "./scout-plan-create-validate";

const DEFAULT_ANALYSIS: PlanTimeframe[] = ["1W", "1D", "1H", "15m", "5m"];
const DEFAULT_ENTRY: PlanTimeframe = "5m";

/**
 * Create a NEW Scout Plan window on an existing Stock File.
 * Does not recreate the Stock File. Does not reuse finished PLAN ids.
 */
export async function applyScoutPlanCreate(
  proposal: Record<string, unknown>
): Promise<{ plan?: TradePlan; errors?: string[]; warnings?: string[] }> {
  const check = validateScoutPlanCreateProposal(proposal);
  if (!check.ok) return { errors: check.errors };

  const stockFileId = String(proposal.stockFileId ?? proposal.stockThesisId)
    .trim()
    .toUpperCase();
  const ticker = String(proposal.ticker).trim().toUpperCase();
  const thesis = await getStockThesisById(stockFileId);
  if (!thesis) {
    return { errors: [`Stock File ${stockFileId} not found.`] };
  }
  if (thesis.ticker.toUpperCase() !== ticker) {
    return {
      errors: [`Ticker ${ticker} does not match Stock File ${thesis.ticker} (${thesis.id}).`],
    };
  }

  const playbookIds = parsePlaybookIds(proposal);
  const primaryPlaybook = playbookIds[0];
  const plannedEntry = parseOptionalNumber(proposal.plannedEntry)!;
  const stopPrice = parseOptionalNumber(proposal.stopPrice)!;
  const targetPrice = parseOptionalNumber(proposal.targetPrice)!;
  const status = parseScoutPlanCreateStatus(proposal.status) ?? "watching";

  const analysisTimeframes = Array.isArray(proposal.analysisTimeframes)
    ? proposal.analysisTimeframes
        .map((t) => String(t).trim())
        .filter((t): t is PlanTimeframe => (PLAN_TIMEFRAMES as readonly string[]).includes(t))
    : DEFAULT_ANALYSIS;
  const entryRaw =
    proposal.entryTimeframe !== undefined ? String(proposal.entryTimeframe).trim() : undefined;
  const entryTimeframe =
    entryRaw && (PLAN_TIMEFRAMES as readonly string[]).includes(entryRaw)
      ? (entryRaw as PlanTimeframe)
      : DEFAULT_ENTRY;

  const noteParts: string[] = [];
  if (proposal.notes !== undefined) noteParts.push(String(proposal.notes).trim());
  if (proposal.reasoning !== undefined) {
    noteParts.push(`Reasoning: ${String(proposal.reasoning).trim()}`);
  }
  if (proposal.locationEvidence !== undefined) {
    noteParts.push(`Location: ${String(proposal.locationEvidence).trim()}`);
  }
  if (proposal.confirmationEvidence !== undefined) {
    noteParts.push(`Confirmation: ${String(proposal.confirmationEvidence).trim()}`);
  }
  if (Array.isArray(proposal.conditionsToAdvance) && proposal.conditionsToAdvance.length) {
    noteParts.push(
      `Conditions: ${proposal.conditionsToAdvance.map((c) => String(c).trim()).filter(Boolean).join("; ")}`
    );
  }
  if (playbookIds.length > 1) {
    noteParts.push(`Playbooks: ${playbookIds.join(", ")}`);
  }
  if (proposal.singleEntryOnly === true) noteParts.push("singleEntryOnly:true");
  if (proposal.noChase === true) noteParts.push("noChase:true");

  const rr = computePlannedRR(plannedEntry, stopPrice, targetPrice);
  const minimumRR =
    parseOptionalNumber(proposal.minimumRR) ?? thesis.riskRules.minimumRR;
  const warnings: string[] = [];
  if (rr && rr.rr < minimumRR) {
    warnings.push(
      `Planned R:R ${rr.rr.toFixed(2)} is below minimum ${minimumRR}R — plan created as watching; raise asymmetry before GO.`
    );
  }

  const active = await getLinkedActiveScoutPlans(stockFileId);
  if (active.length > 0) {
    warnings.push(
      `Stock File already has active plan(s): ${active.map((p) => p.id).join(", ")}. Creating an additional NEW window (not reusing them).`
    );
  }

  const input: SavePlanInput = {
    ticker,
    stockThesisId: stockFileId,
    playbookId: primaryPlaybook,
    status,
    analysisTimeframes: analysisTimeframes.length ? analysisTimeframes : DEFAULT_ANALYSIS,
    entryTimeframe,
    plannedEntry,
    supportLevel: parseOptionalNumber(proposal.supportLevel),
    stopPrice,
    targetPrice,
    plannedRR: rr?.rr,
    validFrom: parseOptionalIso(proposal.validFrom),
    validUntil: parseOptionalIso(proposal.validUntil),
    thesis: proposal.thesis !== undefined ? String(proposal.thesis).trim() || undefined : undefined,
    chatNotes: noteParts.filter(Boolean).join("\n") || undefined,
  };

  const saved = await savePlan(input);
  if (saved.errors?.length) return { errors: saved.errors };
  if (!saved.plan) return { errors: ["Failed to create Scout Plan."] };
  if (saved.warnings?.length) warnings.push(...saved.warnings);

  const verdict = parseVerdict(proposal.verdict);
  if (verdict) {
    const challenges = Array.isArray(proposal.challenges)
      ? proposal.challenges.map((c) => String(c).trim()).filter(Boolean)
      : [];
    const decision = await recordScoutDecision(saved.plan.id, {
      verdict,
      decisionConfidence: Number(proposal.decisionConfidence),
      challenges,
      reasoning:
        proposal.reasoning !== undefined ? String(proposal.reasoning).trim() || undefined : undefined,
      locationEvidence:
        proposal.locationEvidence !== undefined
          ? String(proposal.locationEvidence).trim() || undefined
          : undefined,
      confirmationEvidence:
        proposal.confirmationEvidence !== undefined
          ? String(proposal.confirmationEvidence).trim() || undefined
          : undefined,
      singleEntryOnly: proposal.singleEntryOnly === true ? true : undefined,
    });
    if (decision.errors?.length) {
      return {
        plan: saved.plan,
        errors: [
          `Plan ${saved.plan.id} created but decision failed: ${decision.errors.join("; ")}`,
        ],
        warnings: warnings.length ? warnings : undefined,
      };
    }
    return {
      plan: decision.plan ?? saved.plan,
      warnings: warnings.length ? warnings : undefined,
    };
  }

  return { plan: saved.plan, warnings: warnings.length ? warnings : undefined };
}
