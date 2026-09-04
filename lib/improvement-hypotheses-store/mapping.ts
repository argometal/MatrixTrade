import type {
  ImprovementCandidateKind,
  ImprovementHypothesis,
  ImprovementHypothesisStatus,
} from "../improvement-hypothesis-types";
import type { MafComponentId } from "../maf-types";

export interface ImprovementHypothesisRow {
  id: string;
  status: string;
  ticker: string;
  component_id: string;
  candidate_label: string;
  candidate_kind: string;
  applicability: string;
  change_under_test: string;
  origin_plan_id: string;
  origin_maf_experiment_id: string;
  origin_case_equation_id: string | null;
  playbook_id: string | null;
  evidence_plan_ids: unknown;
  notes: string | null;
  authorized_for_testing_at: string | null;
  method_change_authorized_at: string | null;
  method_change_authorization_note: string | null;
  evidence_verdict_set_at: string | null;
  evidence_verdict_note: string | null;
  source: string | null;
  created_at: string;
  updated_at: string;
}

function str(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  const s = String(value).trim();
  return s || undefined;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((x) => String(x).trim().toUpperCase())
    .filter(Boolean);
}

export function improvementHypothesisRowToRecord(
  row: ImprovementHypothesisRow
): ImprovementHypothesis {
  return {
    id: String(row.id).toUpperCase(),
    status: row.status as ImprovementHypothesisStatus,
    ticker: String(row.ticker).toUpperCase(),
    componentId: row.component_id as MafComponentId,
    candidateLabel: String(row.candidate_label),
    candidateKind: row.candidate_kind as ImprovementCandidateKind,
    applicability: String(row.applicability),
    changeUnderTest: String(row.change_under_test),
    originPlanId: String(row.origin_plan_id).toUpperCase(),
    originMafExperimentId: String(row.origin_maf_experiment_id).toUpperCase(),
    originCaseEquationId: str(row.origin_case_equation_id),
    playbookId: str(row.playbook_id),
    evidencePlanIds: asStringArray(row.evidence_plan_ids),
    notes: str(row.notes),
    authorizedForTestingAt: str(row.authorized_for_testing_at),
    methodChangeAuthorizedAt: str(row.method_change_authorized_at),
    methodChangeAuthorizationNote: str(row.method_change_authorization_note),
    evidenceVerdictSetAt: str(row.evidence_verdict_set_at),
    evidenceVerdictNote: str(row.evidence_verdict_note),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    source: str(row.source),
  };
}

export function improvementHypothesisToRow(
  row: ImprovementHypothesis
): ImprovementHypothesisRow {
  return {
    id: row.id.toUpperCase(),
    status: row.status,
    ticker: row.ticker.toUpperCase(),
    component_id: row.componentId,
    candidate_label: row.candidateLabel,
    candidate_kind: row.candidateKind,
    applicability: row.applicability,
    change_under_test: row.changeUnderTest,
    origin_plan_id: row.originPlanId.toUpperCase(),
    origin_maf_experiment_id: row.originMafExperimentId.toUpperCase(),
    origin_case_equation_id: row.originCaseEquationId ?? null,
    playbook_id: row.playbookId ?? null,
    evidence_plan_ids: row.evidencePlanIds.map((id) => id.toUpperCase()),
    notes: row.notes ?? null,
    authorized_for_testing_at: row.authorizedForTestingAt ?? null,
    method_change_authorized_at: row.methodChangeAuthorizedAt ?? null,
    method_change_authorization_note:
      row.methodChangeAuthorizationNote ?? null,
    evidence_verdict_set_at: row.evidenceVerdictSetAt ?? null,
    evidence_verdict_note: row.evidenceVerdictNote ?? null,
    source: row.source ?? null,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}
