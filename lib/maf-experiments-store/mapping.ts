import type {
  MafComponentAttribution,
  MafComponentId,
  MafExperiment,
  MafExperimentStatus,
  MafObservableEvidence,
} from "../maf-types";

export interface MafExperimentRow {
  id: string;
  trade_id: string | null;
  plan_id: string | null;
  playbook_id: string | null;
  evaluation_id: string | null;
  learning_outcome_id: string | null;
  observation_id: string | null;
  ticker: string;
  status: string;
  evidence: unknown;
  attributions: unknown;
  rule_hints: unknown | null;
  summary: string | null;
  primary_drag_component: string | null;
  human_approved: boolean | null;
  observation_notes: string | null;
  source: string | null;
  created_at: string;
  updated_at: string;
}

function str(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  const s = String(value).trim();
  return s || undefined;
}

function asObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function asAttributionArray(value: unknown): MafComponentAttribution[] {
  if (!Array.isArray(value)) return [];
  return value as MafComponentAttribution[];
}

export function mafExperimentRowToRecord(row: MafExperimentRow): MafExperiment {
  const evidence = asObject(row.evidence) as unknown as MafObservableEvidence;
  if (!evidence.sources || typeof evidence.sources !== "object") {
    evidence.sources = {};
  }
  return {
    id: String(row.id).toUpperCase(),
    tradeId: str(row.trade_id)?.toUpperCase(),
    planId: str(row.plan_id)?.toUpperCase(),
    playbookId: str(row.playbook_id),
    evaluationId: str(row.evaluation_id)?.toUpperCase(),
    learningOutcomeId: str(row.learning_outcome_id)?.toUpperCase(),
    observationId: str(row.observation_id)?.toUpperCase(),
    ticker: String(row.ticker).toUpperCase(),
    status: row.status as MafExperimentStatus,
    evidence,
    attributions: asAttributionArray(row.attributions),
    ruleHints: row.rule_hints == null ? undefined : asAttributionArray(row.rule_hints),
    summary: str(row.summary),
    primaryDragComponent: str(row.primary_drag_component) as
      | MafComponentId
      | undefined,
    humanApproved:
      row.human_approved === null || row.human_approved === undefined
        ? undefined
        : Boolean(row.human_approved),
    observationNotes: str(row.observation_notes),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    source: str(row.source),
  };
}

export function mafExperimentToRow(row: MafExperiment): MafExperimentRow {
  return {
    id: row.id.toUpperCase(),
    trade_id: row.tradeId?.toUpperCase() ?? null,
    plan_id: row.planId?.toUpperCase() ?? null,
    playbook_id: row.playbookId ?? null,
    evaluation_id: row.evaluationId?.toUpperCase() ?? null,
    learning_outcome_id: row.learningOutcomeId?.toUpperCase() ?? null,
    observation_id: row.observationId?.toUpperCase() ?? null,
    ticker: row.ticker.toUpperCase(),
    status: row.status,
    evidence: row.evidence ?? { sources: {} },
    attributions: row.attributions ?? [],
    rule_hints: row.ruleHints ?? null,
    summary: row.summary ?? null,
    primary_drag_component: row.primaryDragComponent ?? null,
    human_approved:
      row.humanApproved === undefined ? null : Boolean(row.humanApproved),
    observation_notes: row.observationNotes ?? null,
    source: row.source ?? null,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}
