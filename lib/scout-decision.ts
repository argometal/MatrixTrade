import { randomBytes } from "crypto";
import { parseConfirmationCost, type ConfirmationCost } from "./asymmetry-types";
import type { TradePlan } from "./plan-types";
import { authorizeProbe, parseProbeInput } from "./scout-probe";
import type { ProbeInput } from "./scout-probe-types";
import {
  authorizeLayeredEntry,
  parseLayeredEntryInput,
  type LayeredEntryInput,
  validateLayeredEntry,
} from "./layered-entry";
import {
  DECISION_HISTORY_CAP,
  type DecisionVerdict,
  type ExecutionRisk,
  type PlanningRisk,
  type ScoutDecision,
  type ScoutDecisionSource,
  type ScoutLifecycleStatus,
} from "./scout-decision-types";

export function newDecisionId(): string {
  return `DEC-${randomBytes(6).toString("hex")}`;
}

export type DecisionInput = {
  verdict: DecisionVerdict;
  decisionConfidence: number;
  challenges: string[];
  reasoning?: string;
  expectedValue?: number;
  expectedProbability?: number;
  thesisQuality?: number;
  opportunityQuality?: number;
  confirmationCost?: ConfirmationCost;
  locationEvidence?: string;
  confirmationEvidence?: string;
  singleEntryOnly?: boolean;
  planningRisk?: PlanningRisk;
  executionRisk?: ExecutionRisk;
  decidedBy?: ScoutDecisionSource;
  priorConfidence?: number;
  posteriorConfidence?: number;
};

function parseRiskStruct(raw: unknown): Record<string, string> | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const obj = raw as Record<string, unknown>;
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null && String(value).trim()) {
      result[key] = String(value).trim();
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

export function parseDecisionInput(raw: Record<string, unknown>): DecisionInput {
  const challenges = Array.isArray(raw.challenges)
    ? raw.challenges.map((c) => String(c).trim()).filter(Boolean)
    : [];
  return {
    verdict: raw.verdict as DecisionVerdict,
    decisionConfidence: Number(raw.decisionConfidence),
    challenges,
    reasoning: raw.reasoning ? String(raw.reasoning).trim() : undefined,
    expectedValue:
      raw.expectedValue !== undefined ? Number(raw.expectedValue) : undefined,
    expectedProbability:
      raw.expectedProbability !== undefined
        ? Number(raw.expectedProbability)
        : undefined,
    opportunityQuality:
      raw.opportunityQuality !== undefined
        ? Number(raw.opportunityQuality)
        : undefined,
    thesisQuality:
      raw.thesisQuality !== undefined ? Number(raw.thesisQuality) : undefined,
    confirmationCost: parseConfirmationCost(raw.confirmationCost),
    locationEvidence: raw.locationEvidence
      ? String(raw.locationEvidence).trim()
      : undefined,
    confirmationEvidence: raw.confirmationEvidence
      ? String(raw.confirmationEvidence).trim()
      : undefined,
    singleEntryOnly:
      raw.singleEntryOnly === true || raw.singleEntryOnly === "true"
        ? true
        : raw.singleEntryOnly === false || raw.singleEntryOnly === "false"
          ? false
          : undefined,
    planningRisk: parseRiskStruct(raw.planningRisk) as PlanningRisk | undefined,
    executionRisk: parseRiskStruct(raw.executionRisk) as ExecutionRisk | undefined,
    decidedBy: raw.decidedBy as ScoutDecisionSource | undefined,
    priorConfidence:
      raw.priorConfidence !== undefined
        ? Number(raw.priorConfidence)
        : undefined,
    posteriorConfidence:
      raw.posteriorConfidence !== undefined
        ? Number(raw.posteriorConfidence)
        : undefined,
  };
}

export function validateDecision(
  input: DecisionInput,
  options?: { requireProbeFields?: boolean; probe?: ProbeInput }
): string[] {
  const errors: string[] = [];
  const verdicts: DecisionVerdict[] = ["wait", "probe", "go", "no"];
  if (!verdicts.includes(input.verdict)) {
    errors.push("verdict must be wait, probe, go, or no");
  }
  if (
    !Number.isFinite(input.decisionConfidence) ||
    input.decisionConfidence < 0 ||
    input.decisionConfidence > 100
  ) {
    errors.push("decisionConfidence must be 0-100");
  }
  if (!input.challenges.length) {
    errors.push("challenges[] required (min 1)");
  }
  if (input.verdict === "probe") {
    const probe = options?.probe;
    if (!probe?.trigger?.trim()) {
      errors.push("probe.trigger required when verdict is probe");
    }
    if (!probe?.expires) {
      errors.push("probe.expires required when verdict is probe");
    }
  }
  return errors;
}

export function deriveLifecycleFromPlan(plan: TradePlan): ScoutLifecycleStatus {
  if (plan.status === "expired") return "expired";
  if (plan.status === "skipped") return "cancelled";
  if (plan.status === "entered" || plan.linkedTradeId) return "executed";

  if (plan.layeredEntry?.status === "missed") return "missed";

  if (plan.probe?.enabled) {
    switch (plan.probe.status) {
      case "active":
        return "probe_active";
      case "converted":
        return "converted";
      case "cancelled":
      case "stopped":
        return "cancelled";
      case "authorized":
        break;
    }
  }

  if (plan.decision) {
    switch (plan.decision.verdict) {
      case "wait":
        return "decided_wait";
      case "probe":
        return plan.probe?.status === "active" ? "probe_active" : "decided_probe";
      case "go":
        return "decided_go";
      case "no":
        return "decided_no";
    }
  }

  return "open";
}

export function appendDecision(
  plan: TradePlan,
  input: DecisionInput,
  probeInput?: ProbeInput,
  layeredEntryInput?: LayeredEntryInput
): { plan: TradePlan; errors?: string[] } {
  const layeredErrors =
    layeredEntryInput && input.verdict === "go"
      ? validateLayeredEntry(layeredEntryInput)
      : [];
  const errors = [
    ...validateDecision(input, { probe: probeInput }),
    ...layeredErrors,
  ];
  if (errors.length) return { plan, errors };

  const now = new Date().toISOString();
  const decision: ScoutDecision = {
    id: newDecisionId(),
    verdict: input.verdict,
    decisionConfidence: input.decisionConfidence,
    challenges: input.challenges,
    reasoning: input.reasoning,
    expectedValue: input.expectedValue,
    expectedProbability: input.expectedProbability,
    opportunityQuality: input.opportunityQuality,
    thesisQuality: input.thesisQuality,
    confirmationCost: input.confirmationCost,
    locationEvidence: input.locationEvidence,
    confirmationEvidence: input.confirmationEvidence,
    singleEntryOnly: input.singleEntryOnly,
    planningRisk: input.planningRisk,
    executionRisk: input.executionRisk,
    priorDecisionId: plan.decision?.id,
    decidedAt: now,
    decidedBy: input.decidedBy ?? "human",
    priorConfidence: input.priorConfidence ?? plan.decision?.decisionConfidence,
    posteriorConfidence: input.posteriorConfidence,
  };

  const history = [...(plan.decisionHistory ?? []), ...(plan.decision ? [plan.decision] : [])];
  if (history.length > DECISION_HISTORY_CAP) {
    history.splice(0, history.length - DECISION_HISTORY_CAP);
  }

  let probe = plan.probe;
  if (input.verdict === "probe" && probeInput) {
    probe = authorizeProbe(probeInput);
  } else if (input.verdict !== "probe") {
    probe = undefined;
  }

  let layeredEntry = plan.layeredEntry;
  let executionMethod = plan.executionMethod;
  if (input.verdict === "go" && layeredEntryInput) {
    layeredEntry = authorizeLayeredEntry(layeredEntryInput, {
      primaryTargetPrice:
        layeredEntryInput.primaryTargetPrice ?? plan.targetPrice,
      planStopPrice: layeredEntryInput.commonStopPrice ?? plan.stopPrice,
    });
    executionMethod = layeredEntry.executionMethod;
  } else if (input.verdict !== "go") {
    layeredEntry = undefined;
    executionMethod = undefined;
  }

  const updated: TradePlan = {
    ...plan,
    decision,
    decisionHistory: history,
    probe,
    layeredEntry,
    executionMethod,
    updatedAt: now,
  };
  updated.scoutLifecycle = deriveLifecycleFromPlan(updated);

  return { plan: updated };
}

export function formatDecisionSection(plan: TradePlan): string {
  if (!plan.decision) return "";
  const d = plan.decision;
  const lines = [
    "=== DECISION ===",
    `id:${d.id}`,
    `verdict:${d.verdict}`,
    `confidence:${d.decisionConfidence}`,
    `decided_at:${d.decidedAt}`,
    `decided_by:${d.decidedBy ?? "human"}`,
  ];
  if (d.reasoning) lines.push(`reasoning:${d.reasoning.replace(/\s+/g, " ").slice(0, 200)}`);
  if (d.challenges.length) {
    lines.push(`challenges:${d.challenges.join(" | ")}`);
  }
  if (d.expectedValue !== undefined) lines.push(`expected_value:${d.expectedValue}R`);
  if (d.expectedProbability !== undefined) {
    lines.push(`expected_probability:${d.expectedProbability}`);
  }
  if (d.opportunityQuality !== undefined) {
    lines.push(`opportunity_quality:${d.opportunityQuality}`);
  }
  if (d.thesisQuality !== undefined) {
    lines.push(`thesis_quality:${d.thesisQuality}`);
  }
  if (d.confirmationCost) {
    const c = d.confirmationCost;
    if (c.currentRR !== undefined) lines.push(`confirmation_current_rr:${c.currentRR}`);
    if (c.estimatedConfirmedRR !== undefined) {
      lines.push(`confirmation_estimated_rr:${c.estimatedConfirmedRR}`);
    }
    if (c.rewardConsumedPercent !== undefined) {
      lines.push(`confirmation_reward_consumed_pct:${c.rewardConsumedPercent}`);
    }
    if (c.assessment) {
      lines.push(`confirmation_assessment:${c.assessment.replace(/\s+/g, " ").slice(0, 160)}`);
    }
  }
  if (d.locationEvidence) {
    lines.push(`location_evidence:${d.locationEvidence.replace(/\s+/g, " ").slice(0, 160)}`);
  }
  if (d.confirmationEvidence) {
    lines.push(
      `confirmation_evidence:${d.confirmationEvidence.replace(/\s+/g, " ").slice(0, 160)}`
    );
  }
  if (d.singleEntryOnly) lines.push("single_entry_only:yes");
  if (d.priorConfidence !== undefined) lines.push(`prior_confidence:${d.priorConfidence}`);
  if (d.posteriorConfidence !== undefined) {
    lines.push(`posterior_confidence:${d.posteriorConfidence}`);
  }
  if (plan.scoutLifecycle) lines.push(`lifecycle:${plan.scoutLifecycle}`);
  return lines.join("\n");
}

export { parseProbeInput, parseLayeredEntryInput };
