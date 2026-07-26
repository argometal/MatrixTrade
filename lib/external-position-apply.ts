import type { TradingInboxPayload, TradingProposalType } from "./bridge";
import {
  createExternalPosition,
  reduceExternalPosition,
  updateExternalPosition,
  upsertExternalExitPlan,
} from "./external-position";
import type {
  ExternalAcquisitionSource,
  ExternalCapitalTreatment,
  ExternalLiquidityStatus,
  ExitPlanStatus,
} from "./external-position-types";

type ExtApplyResult =
  | { ok: true; message: string; type: TradingProposalType }
  | { ok: false; errors: string[]; type: TradingProposalType };

function fail(type: TradingProposalType, err: unknown): ExtApplyResult {
  return {
    ok: false,
    type,
    errors: [
      err instanceof Error ? err.message : "External Position mutation failed",
    ],
  };
}

export async function applyExternalPositionCreateBlock(
  parsed: TradingInboxPayload
): Promise<ExtApplyResult> {
  try {
    const p = parsed.proposal;
    const position = await createExternalPosition({
      id: p.id !== undefined ? String(p.id) : undefined,
      ticker: String(p.ticker ?? ""),
      shares: Number(p.shares),
      averageCost: Number(p.averageCost),
      currentPrice:
        p.currentPrice !== undefined ? Number(p.currentPrice) : undefined,
      acquisitionSource: p.acquisitionSource as
        | ExternalAcquisitionSource
        | undefined,
      capitalTreatment: p.capitalTreatment as
        | ExternalCapitalTreatment
        | undefined,
      liquidityStatus: p.liquidityStatus as ExternalLiquidityStatus | undefined,
      openedAt: p.openedAt !== undefined ? String(p.openedAt) : undefined,
      reviewAt: p.reviewAt !== undefined ? String(p.reviewAt) : undefined,
      notes: p.notes !== undefined ? String(p.notes) : undefined,
    });
    return {
      ok: true,
      type: "external-position-create",
      message: `External Position ${position.id} created (${position.ticker}). Excluded from experiment metrics.`,
    };
  } catch (err) {
    return fail("external-position-create", err);
  }
}

export async function applyExternalPositionUpdateBlock(
  parsed: TradingInboxPayload
): Promise<ExtApplyResult> {
  try {
    const p = parsed.proposal;
    const position = await updateExternalPosition({
      id: String(p.id ?? ""),
      currentPrice:
        p.currentPrice !== undefined ? Number(p.currentPrice) : undefined,
      reviewAt:
        p.reviewAt === null
          ? null
          : p.reviewAt !== undefined
            ? String(p.reviewAt)
            : undefined,
      notes:
        p.notes === null
          ? null
          : p.notes !== undefined
            ? String(p.notes)
            : undefined,
      liquidityStatus: p.liquidityStatus as ExternalLiquidityStatus | undefined,
      capitalTreatment: p.capitalTreatment as
        | ExternalCapitalTreatment
        | undefined,
      acquisitionSource: p.acquisitionSource as
        | ExternalAcquisitionSource
        | undefined,
    });
    return {
      ok: true,
      type: "external-position-update",
      message: `External Position ${position.id} updated.`,
    };
  } catch (err) {
    return fail("external-position-update", err);
  }
}

export async function applyExternalPositionReductionBlock(
  parsed: TradingInboxPayload
): Promise<ExtApplyResult> {
  try {
    const p = parsed.proposal;
    const { position, reduction } = await reduceExternalPosition({
      positionId: String(p.positionId ?? ""),
      sharesReduced: Number(p.sharesReduced),
      executionPrice: Number(p.executionPrice),
      executedAt: p.executedAt !== undefined ? String(p.executedAt) : undefined,
      fees: p.fees !== undefined ? Number(p.fees) : undefined,
      notes: p.notes !== undefined ? String(p.notes) : undefined,
    });
    return {
      ok: true,
      type: "external-position-reduction",
      message: `External Position ${position.id} reduced by ${reduction.sharesReduced} shares · realized P/L ${reduction.realizedPnL.toFixed(2)} · status ${position.status}. No Trade created.`,
    };
  } catch (err) {
    return fail("external-position-reduction", err);
  }
}

export async function applyExternalPositionExitPlanBlock(
  parsed: TradingInboxPayload
): Promise<ExtApplyResult> {
  try {
    const p = parsed.proposal;
    const position = await upsertExternalExitPlan({
      positionId: String(p.positionId ?? ""),
      targetPrice:
        p.targetPrice !== undefined ? Number(p.targetPrice) : undefined,
      targetShares:
        p.targetShares !== undefined ? Number(p.targetShares) : undefined,
      defensivePrice:
        p.defensivePrice !== undefined ? Number(p.defensivePrice) : undefined,
      defensiveAction:
        p.defensiveAction !== undefined
          ? String(p.defensiveAction)
          : undefined,
      validUntil: p.validUntil !== undefined ? String(p.validUntil) : undefined,
      reviewRule: p.reviewRule !== undefined ? String(p.reviewRule) : undefined,
      notes: p.notes !== undefined ? String(p.notes) : undefined,
      status: p.status as ExitPlanStatus | undefined,
    });
    return {
      ok: true,
      type: "external-position-exit-plan-update",
      message: `Exit plan on ${position.id} → ${position.exitPlan?.status ?? "draft"}.`,
    };
  } catch (err) {
    return fail("external-position-exit-plan-update", err);
  }
}
