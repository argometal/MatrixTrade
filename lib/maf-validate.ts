import type {
  MafComponentAttribution,
  MafComponentId,
  MafObservationSupplement,
  MafQualityBand,
} from "./maf-types";
import { MAF_COMPONENT_IDS, MAF_QUALITY_BANDS } from "./maf-types";

function clampConfidence(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function parseOptionalNumber(
  raw: unknown,
  label: string,
  errors: string[]
): number | undefined {
  if (raw === undefined || raw === null || raw === "") return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n)) {
    errors.push(`${label} must be a number`);
    return undefined;
  }
  return n;
}

function parseOptionalBoolean(
  raw: unknown,
  label: string,
  errors: string[]
): boolean | undefined {
  if (raw === undefined || raw === null || raw === "") return undefined;
  if (typeof raw === "boolean") return raw;
  if (raw === "true") return true;
  if (raw === "false") return false;
  errors.push(`${label} must be a boolean`);
  return undefined;
}

export function parseObservationSupplement(
  raw: unknown,
  errors: string[]
): MafObservationSupplement | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    errors.push("observation must be an object");
    return undefined;
  }
  const o = raw as Record<string, unknown>;
  const unitRaw = o.mfeMaeUnit !== undefined ? String(o.mfeMaeUnit) : undefined;
  if (unitRaw !== undefined && unitRaw !== "price" && unitRaw !== "r") {
    errors.push("observation.mfeMaeUnit must be price|r");
  }

  const out: MafObservationSupplement = {
    mfe: parseOptionalNumber(o.mfe, "observation.mfe", errors),
    mae: parseOptionalNumber(o.mae, "observation.mae", errors),
    mfeMaeUnit: unitRaw === "price" || unitRaw === "r" ? unitRaw : undefined,
    timeUntilTargetHours: parseOptionalNumber(
      o.timeUntilTargetHours,
      "observation.timeUntilTargetHours",
      errors
    ),
    timeUntilInvalidationHours: parseOptionalNumber(
      o.timeUntilInvalidationHours,
      "observation.timeUntilInvalidationHours",
      errors
    ),
    betterEntryAvailable: parseOptionalBoolean(
      o.betterEntryAvailable,
      "observation.betterEntryAvailable",
      errors
    ),
    betterEntryPrice: parseOptionalNumber(
      o.betterEntryPrice,
      "observation.betterEntryPrice",
      errors
    ),
    targetReachedAfterStop: parseOptionalBoolean(
      o.targetReachedAfterStop,
      "observation.targetReachedAfterStop",
      errors
    ),
    thesisInvalidated: parseOptionalBoolean(
      o.thesisInvalidated,
      "observation.thesisInvalidated",
      errors
    ),
    notes: o.notes !== undefined ? String(o.notes).trim() || undefined : undefined,
  };

  const hasAny = Object.values(out).some((v) => v !== undefined);
  return hasAny ? out : undefined;
}

function parseAttributionRow(
  raw: unknown,
  index: number,
  errors: string[]
): MafComponentAttribution | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    errors.push(`components[${index}] must be an object`);
    return undefined;
  }
  const row = raw as Record<string, unknown>;
  const component = String(row.component ?? "").trim() as MafComponentId;
  if (!(MAF_COMPONENT_IDS as readonly string[]).includes(component)) {
    errors.push(
      `components[${index}].component must be one of: ${MAF_COMPONENT_IDS.join(", ")}`
    );
    return undefined;
  }
  const classification = String(row.classification ?? "").trim() as MafQualityBand;
  if (!(MAF_QUALITY_BANDS as readonly string[]).includes(classification)) {
    errors.push(
      `components[${index}].classification must be one of: ${MAF_QUALITY_BANDS.join(", ")}`
    );
    return undefined;
  }
  const reasoning = String(row.reasoning ?? "").trim();
  if (!reasoning) {
    errors.push(`components[${index}].reasoning required`);
    return undefined;
  }
  const confidenceRaw = row.aiInterpretationConfidence;
  if (confidenceRaw === undefined || confidenceRaw === null || confidenceRaw === "") {
    errors.push(`components[${index}].aiInterpretationConfidence required (0-100)`);
    return undefined;
  }
  const aiInterpretationConfidence = clampConfidence(Number(confidenceRaw));

  let evidenceRefs: string[] | undefined;
  if (row.evidenceRefs !== undefined) {
    if (!Array.isArray(row.evidenceRefs)) {
      errors.push(`components[${index}].evidenceRefs must be an array of strings`);
    } else {
      evidenceRefs = row.evidenceRefs.map((x) => String(x));
    }
  }

  return {
    component,
    classification,
    tag: row.tag !== undefined ? String(row.tag).trim() || undefined : undefined,
    aiInterpretationConfidence,
    reasoning,
    suggestedImprovement:
      row.suggestedImprovement !== undefined
        ? String(row.suggestedImprovement).trim() || undefined
        : undefined,
    evidenceRefs,
  };
}

export type ValidatedAttributionProposal = {
  tradeId?: string;
  planId?: string;
  experimentId?: string;
  components: MafComponentAttribution[];
  summary?: string;
  primaryDragComponent?: MafComponentId;
  observation?: MafObservationSupplement;
  humanApproved?: boolean;
};

export function validateAttributionProposal(
  proposal: Record<string, unknown>
): { ok: true; value: ValidatedAttributionProposal } | { ok: false; errors: string[] } {
  const errors: string[] = [];

  const tradeId = proposal.tradeId
    ? String(proposal.tradeId).trim().toUpperCase()
    : undefined;
  const planId = proposal.planId
    ? String(proposal.planId).trim().toUpperCase()
    : undefined;
  const experimentId = proposal.experimentId
    ? String(proposal.experimentId).trim().toUpperCase()
    : undefined;

  if (!tradeId && !planId && !experimentId) {
    errors.push("proposal requires tradeId, planId, or experimentId");
  }

  if (!Array.isArray(proposal.components) || proposal.components.length === 0) {
    errors.push("proposal.components must be a non-empty array");
  }

  const components: MafComponentAttribution[] = [];
  if (Array.isArray(proposal.components)) {
    proposal.components.forEach((row, i) => {
      const parsed = parseAttributionRow(row, i, errors);
      if (parsed) components.push(parsed);
    });
  }

  let primaryDragComponent: MafComponentId | undefined;
  if (proposal.primaryDragComponent !== undefined) {
    const drag = String(proposal.primaryDragComponent).trim() as MafComponentId;
    if (!(MAF_COMPONENT_IDS as readonly string[]).includes(drag)) {
      errors.push(`primaryDragComponent must be one of: ${MAF_COMPONENT_IDS.join(", ")}`);
    } else {
      primaryDragComponent = drag;
    }
  }

  const observation = parseObservationSupplement(proposal.observation, errors);

  let humanApproved: boolean | undefined;
  if (proposal.humanApproved !== undefined) {
    if (typeof proposal.humanApproved !== "boolean") {
      errors.push("humanApproved must be a boolean");
    } else {
      humanApproved = proposal.humanApproved;
    }
  }

  if (errors.length) return { ok: false, errors };

  return {
    ok: true,
    value: {
      tradeId,
      planId,
      experimentId,
      components,
      summary:
        proposal.summary !== undefined
          ? String(proposal.summary).trim() || undefined
          : undefined,
      primaryDragComponent,
      observation,
      humanApproved,
    },
  };
}
