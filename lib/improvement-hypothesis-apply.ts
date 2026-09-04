/**
 * MXT 028 — create / authorize / verdict / link evidence for Improvement Hypotheses.
 * Does not mutate Playbooks or Mechanics.
 */
import { getMafExperimentById, getMafExperimentByPlanId, getMafExperiments } from "./maf-store";
import type { MafComponentId, MafExperiment } from "./maf-types";
import { getPlanById } from "./plans";
import { getPlansStore } from "./plans-store";
import type { TradePlan } from "./plan-types";
import {
  getImprovementHypotheses,
  getImprovementHypothesisById,
  nextImprovementHypothesisId,
  upsertImprovementHypothesis,
} from "./improvement-hypothesis-store";
import type {
  ImprovementCandidateKind,
  ImprovementHypothesis,
  ImprovementHypothesisStatus,
} from "./improvement-hypothesis-types";

const ACCEPTED_MAF_STATUSES = new Set(["attributed", "concluded"]);

function isAcceptedMaf(maf: MafExperiment): boolean {
  if (maf.humanApproved === true) return true;
  return ACCEPTED_MAF_STATUSES.has(maf.status);
}

/** Default OLE candidate when entry_quality drag lacks a concrete suggestion. */
export function defaultCandidateForComponent(
  componentId: MafComponentId,
  suggestedImprovement?: string | null
): { label: string; kind: ImprovementCandidateKind; changeUnderTest: string } {
  const suggested = suggestedImprovement?.trim() ?? "";
  if (componentId === "entry_quality") {
    const looksOle =
      !suggested ||
      /layered|ole|optimiz/i.test(suggested);
    if (looksOle) {
      return {
        label: "Optimized Layered Entry",
        kind: "technique",
        changeUnderTest:
          suggested ||
          "Test Optimized Layered Entry (OLE) as the prospective entry technique for future applicable Cases — originating Case is justification only, not confirming evidence.",
      };
    }
  }
  return {
    label: suggested || `${componentId} improvement`,
    kind: suggested ? "process" : "other",
    changeUnderTest:
      suggested ||
      `Prospective improvement for diagnosed ${componentId} deficiency.`,
  };
}

function suggestedFromMaf(
  maf: MafExperiment,
  componentId: MafComponentId
): string | undefined {
  const primary =
    maf.attributions.find((a) => a.component === componentId) ??
    maf.attributions.find((a) => a.component === maf.primaryDragComponent);
  const text = primary?.suggestedImprovement?.trim();
  return text || undefined;
}

export type CreateImprovementHypothesisInput = {
  originPlanId: string;
  mafExperimentId?: string;
  componentId?: MafComponentId;
  candidateLabel?: string;
  candidateKind?: ImprovementCandidateKind;
  changeUnderTest?: string;
  applicability?: string;
  notes?: string;
};

export async function createImprovementHypothesisFromAcceptedMaf(
  input: CreateImprovementHypothesisInput
): Promise<{ hypothesis?: ImprovementHypothesis; errors?: string[] }> {
  const originPlanId = input.originPlanId.trim().toUpperCase();
  if (!originPlanId) return { errors: ["originPlanId required"] };

  const plan = await getPlanById(originPlanId);
  if (!plan) return { errors: [`Plan ${originPlanId} not found.`] };

  const maf =
    (input.mafExperimentId
      ? await getMafExperimentById(input.mafExperimentId)
      : undefined) ??
    (await getMafExperimentByPlanId(originPlanId)) ??
    (await getMafExperiments()).find(
      (row) => row.planId?.toUpperCase() === originPlanId
    );

  if (!maf) {
    return {
      errors: [
        `No accepted MAF found for ${originPlanId}. Create/accept MAF attribution first.`,
      ],
    };
  }
  if (!isAcceptedMaf(maf)) {
    return {
      errors: [
        `MAF ${maf.id} is not accepted (status=${maf.status}). Accept attribution before creating an Improvement Hypothesis.`,
      ],
    };
  }

  const componentId =
    input.componentId ??
    maf.primaryDragComponent ??
    maf.attributions[0]?.component;
  if (!componentId) {
    return {
      errors: [
        `MAF ${maf.id} has no primaryDragComponent / attributions to seed a hypothesis.`,
      ],
    };
  }

  const existing = await getImprovementHypotheses();
  const dup = existing.find(
    (h) =>
      h.originPlanId.toUpperCase() === originPlanId &&
      h.componentId === componentId &&
      h.status !== "rejected"
  );
  if (dup) {
    return {
      errors: [
        `Open Improvement Hypothesis ${dup.id} already exists for ${originPlanId} / ${componentId}.`,
      ],
    };
  }

  const suggested = suggestedFromMaf(maf, componentId);
  const defaults = defaultCandidateForComponent(componentId, suggested);
  const now = new Date().toISOString();
  const ticker = (plan.ticker || maf.ticker || "UNK").toUpperCase();

  const hypothesis: ImprovementHypothesis = {
    id: nextImprovementHypothesisId(existing, ticker),
    status: "proposed",
    ticker,
    componentId,
    candidateLabel: input.candidateLabel?.trim() || defaults.label,
    candidateKind: input.candidateKind ?? defaults.kind,
    applicability:
      input.applicability?.trim() ||
      `Future ${ticker} Cases where ${componentId} is the relevant method surface (same Playbook context when linked).`,
    changeUnderTest: input.changeUnderTest?.trim() || defaults.changeUnderTest,
    originPlanId,
    originMafExperimentId: maf.id,
    playbookId: plan.playbookId ?? maf.playbookId,
    evidencePlanIds: [],
    notes: input.notes?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
    source: "maf_accepted_deficiency",
  };

  await upsertImprovementHypothesis(hypothesis);
  return { hypothesis };
}

export async function authorizeImprovementHypothesisForTesting(
  hypothesisId: string
): Promise<{ hypothesis?: ImprovementHypothesis; errors?: string[] }> {
  const h = await getImprovementHypothesisById(hypothesisId);
  if (!h) return { errors: [`Hypothesis ${hypothesisId} not found.`] };
  if (h.status === "method_change_authorized") {
    return { errors: [`${h.id} already authorized for method change.`] };
  }
  if (
    h.status !== "proposed" &&
    h.status !== "insufficient_evidence" &&
    h.status !== "testing"
  ) {
    return {
      errors: [
        `Cannot authorize testing from status=${h.status}. Reset verdict to insufficient_evidence first if needed.`,
      ],
    };
  }
  const now = new Date().toISOString();
  const updated: ImprovementHypothesis = {
    ...h,
    status: "testing",
    authorizedForTestingAt: h.authorizedForTestingAt ?? now,
    updatedAt: now,
  };
  await upsertImprovementHypothesis(updated);
  return { hypothesis: updated };
}

const VERDICT_STATUSES = new Set<ImprovementHypothesisStatus>([
  "supported",
  "rejected",
  "insufficient_evidence",
]);

export async function setImprovementHypothesisEvidenceVerdict(input: {
  hypothesisId: string;
  status: "supported" | "rejected" | "insufficient_evidence";
  note?: string;
}): Promise<{ hypothesis?: ImprovementHypothesis; errors?: string[] }> {
  if (!VERDICT_STATUSES.has(input.status)) {
    return { errors: [`Invalid evidence verdict: ${input.status}`] };
  }
  const h = await getImprovementHypothesisById(input.hypothesisId);
  if (!h) return { errors: [`Hypothesis ${input.hypothesisId} not found.`] };
  if (h.status === "proposed") {
    return {
      errors: [
        "Authorize for testing before setting an evidence verdict (or mark insufficient after testing).",
      ],
    };
  }
  if (h.status === "method_change_authorized") {
    return {
      errors: [
        "Method change already authorized — evidence verdict is frozen for this record.",
      ],
    };
  }
  const now = new Date().toISOString();
  const updated: ImprovementHypothesis = {
    ...h,
    status: input.status,
    evidenceVerdictSetAt: now,
    evidenceVerdictNote: input.note?.trim() || undefined,
    updatedAt: now,
  };
  await upsertImprovementHypothesis(updated);
  return { hypothesis: updated };
}

export async function authorizeImprovementMethodChange(input: {
  hypothesisId: string;
  note?: string;
}): Promise<{ hypothesis?: ImprovementHypothesis; errors?: string[] }> {
  const h = await getImprovementHypothesisById(input.hypothesisId);
  if (!h) return { errors: [`Hypothesis ${input.hypothesisId} not found.`] };
  if (h.status !== "supported") {
    return {
      errors: [
        `Method change authorization requires status=supported (got ${h.status}). Does not auto-mutate Mechanics.`,
      ],
    };
  }
  const now = new Date().toISOString();
  const updated: ImprovementHypothesis = {
    ...h,
    status: "method_change_authorized",
    methodChangeAuthorizedAt: now,
    methodChangeAuthorizationNote:
      input.note?.trim() ||
      "Human authorized method change boundary — Playbook/Mechanics not auto-mutated.",
    updatedAt: now,
  };
  await upsertImprovementHypothesis(updated);
  return { hypothesis: updated };
}

/**
 * Link a future Plan as independent evidence.
 * Originating Case is never added to evidencePlanIds.
 */
export async function linkPlanToImprovementHypothesis(input: {
  hypothesisId: string;
  planId: string;
}): Promise<{
  hypothesis?: ImprovementHypothesis;
  plan?: TradePlan;
  errors?: string[];
}> {
  const hypothesisId = input.hypothesisId.trim().toUpperCase();
  const planId = input.planId.trim().toUpperCase();
  if (!hypothesisId || !planId) {
    return { errors: ["hypothesisId and planId required"] };
  }

  const h = await getImprovementHypothesisById(hypothesisId);
  if (!h) return { errors: [`Hypothesis ${hypothesisId} not found.`] };

  if (planId === h.originPlanId.toUpperCase()) {
    return {
      errors: [
        `Plan ${planId} is the originating Case — it justifies the hypothesis but cannot be independent confirming evidence.`,
      ],
    };
  }

  if (h.status === "proposed") {
    return {
      errors: [
        `Authorize ${h.id} for testing before linking future evidence Plans.`,
      ],
    };
  }

  const plan = await getPlanById(planId);
  if (!plan) return { errors: [`Plan ${planId} not found.`] };

  const now = new Date().toISOString();
  const evidencePlanIds = h.evidencePlanIds.some(
    (id) => id.toUpperCase() === planId
  )
    ? h.evidencePlanIds
    : [...h.evidencePlanIds, planId];

  const updatedH: ImprovementHypothesis = {
    ...h,
    evidencePlanIds,
    status: h.status === "proposed" ? "testing" : h.status,
    updatedAt: now,
  };
  await upsertImprovementHypothesis(updatedH);

  const updatedPlan: TradePlan = {
    ...plan,
    improvementHypothesisId: h.id,
    updatedAt: now,
  };
  await getPlansStore().upsert(updatedPlan);

  return { hypothesis: updatedH, plan: updatedPlan };
}
