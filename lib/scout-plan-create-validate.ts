import type { PlanStatus } from "./plan-types";
import { validateScoutContract } from "./scout-contract";
import type { DecisionVerdict } from "./scout-decision-types";

export function parseOptionalNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export function parseOptionalIso(value: unknown): string | undefined {
  const raw = String(value ?? "").trim();
  if (!raw) return undefined;
  const parsed = Date.parse(raw);
  if (!Number.isFinite(parsed)) return undefined;
  return new Date(parsed).toISOString();
}

export function parseVerdict(value: unknown): DecisionVerdict | undefined {
  const raw = String(value ?? "").trim().toLowerCase();
  if (raw === "go" || raw === "wait" || raw === "probe" || raw === "no") return raw;
  return undefined;
}

/** Map AI-friendly status aliases onto PlanStatus. */
export function parseScoutPlanCreateStatus(value: unknown): PlanStatus | undefined {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return undefined;
  if (raw === "active" || raw === "watching") return "watching";
  if (raw === "ready") return "ready";
  if (raw === "entered") return "entered";
  if (raw === "skipped") return "skipped";
  if (raw === "failed") return "failed";
  if (raw === "expired") return "expired";
  return undefined;
}

export function parsePlaybookIds(proposal: Record<string, unknown>): string[] {
  if (Array.isArray(proposal.playbookIds)) {
    return proposal.playbookIds.map((id) => String(id).trim()).filter(Boolean);
  }
  if (proposal.playbookId !== undefined) {
    const id = String(proposal.playbookId).trim();
    return id ? [id] : [];
  }
  return [];
}

export function validateScoutPlanCreateProposal(
  proposal: Record<string, unknown>
): { ok: true } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const stockFileId = String(proposal.stockFileId ?? proposal.stockThesisId ?? "")
    .trim()
    .toUpperCase();
  const ticker = String(proposal.ticker ?? "").trim().toUpperCase();
  if (!stockFileId) errors.push("proposal.stockFileId (or stockThesisId) required");
  if (!ticker) errors.push("proposal.ticker required");

  const scoutCheck = validateScoutContract(
    {
      plannedEntry: parseOptionalNumber(proposal.plannedEntry),
      stopPrice: parseOptionalNumber(proposal.stopPrice),
      targetPrice: parseOptionalNumber(proposal.targetPrice),
      supportLevel: parseOptionalNumber(proposal.supportLevel),
    },
    { prefix: "proposal", requirePresent: true }
  );
  if (!scoutCheck.ok) errors.push(...scoutCheck.errors);

  if (proposal.status !== undefined && !parseScoutPlanCreateStatus(proposal.status)) {
    errors.push(
      "proposal.status must be watching|ready|active (alias for watching)|entered|skipped|failed|expired"
    );
  }

  if (proposal.verdict !== undefined && !parseVerdict(proposal.verdict)) {
    errors.push("proposal.verdict must be go|wait|probe|no");
  }

  if (proposal.decisionConfidence !== undefined) {
    const conf = Number(proposal.decisionConfidence);
    if (!Number.isFinite(conf) || conf < 0 || conf > 100) {
      errors.push("proposal.decisionConfidence must be 0–100");
    }
  }

  if (proposal.challenges !== undefined) {
    if (!Array.isArray(proposal.challenges) || proposal.challenges.length === 0) {
      errors.push("proposal.challenges must be a non-empty array when provided");
    }
  }

  if (proposal.verdict !== undefined) {
    const conf = Number(proposal.decisionConfidence);
    if (!Number.isFinite(conf)) {
      errors.push("proposal.decisionConfidence required when verdict is set");
    }
    if (!Array.isArray(proposal.challenges) || proposal.challenges.length === 0) {
      errors.push("proposal.challenges (min 1) required when verdict is set");
    }
  }

  if (errors.length) return { ok: false, errors };
  return { ok: true };
}
