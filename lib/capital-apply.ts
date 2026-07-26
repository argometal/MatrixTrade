import type { TradingInboxPayload, TradingProposalType } from "./bridge";
import {
  createCapitalConfiguration,
  updateCapitalConfiguration,
} from "./capital-configuration";
import { appendCapitalLedgerEvent } from "./capital-ledger";
import {
  createCapitalReservation,
  releaseCapitalReservation,
  updateCapitalReservation,
} from "./capital-reservation";
import type {
  CapitalConfigSource,
  CapitalReservationStatus,
  FundingDecision,
} from "./capital-types";
import { getActiveCapitalConfiguration } from "./capital-configuration";
import { getCapitalAccountSnapshot } from "./capital-account";
import { capitalFieldValue } from "./capital-types";
import { getMonthlyRisk } from "./storage";

type CapApplyResult =
  | { ok: true; message: string; type: TradingProposalType }
  | { ok: false; errors: string[]; type: TradingProposalType };

function fail(type: TradingProposalType, err: unknown): CapApplyResult {
  return {
    ok: false,
    type,
    errors: [
      err instanceof Error ? err.message : "Capital Planner mutation failed",
    ],
  };
}

export async function applyCapitalConfigurationCreateBlock(
  parsed: TradingInboxPayload
): Promise<CapApplyResult> {
  try {
    const p = parsed.proposal;
    const config = await createCapitalConfiguration({
      id: p.id !== undefined ? String(p.id) : undefined,
      settledCashBase:
        p.settledCashBase !== undefined ? Number(p.settledCashBase) : undefined,
      settledCashAsOf:
        p.settledCashAsOf !== undefined ? String(p.settledCashAsOf) : undefined,
      totalEquityBase:
        p.totalEquityBase !== undefined ? Number(p.totalEquityBase) : undefined,
      totalEquityAsOf:
        p.totalEquityAsOf !== undefined ? String(p.totalEquityAsOf) : undefined,
      liquidityBuffer:
        p.liquidityBuffer !== undefined ? Number(p.liquidityBuffer) : undefined,
      source: p.source as CapitalConfigSource | undefined,
      externalCreditsIncludedInCash:
        p.externalCreditsIncludedInCash === undefined
          ? undefined
          : Boolean(p.externalCreditsIncludedInCash),
    });
    return {
      ok: true,
      type: "capital-configuration-create",
      message: `Capital Configuration ${config.id} active (cash_ledger).`,
    };
  } catch (err) {
    return fail("capital-configuration-create", err);
  }
}

export async function applyCapitalConfigurationUpdateBlock(
  parsed: TradingInboxPayload
): Promise<CapApplyResult> {
  try {
    const p = parsed.proposal;
    const config = await updateCapitalConfiguration({
      id: String(p.id ?? ""),
      settledCashBase:
        p.settledCashBase === null
          ? null
          : p.settledCashBase !== undefined
            ? Number(p.settledCashBase)
            : undefined,
      settledCashAsOf:
        p.settledCashAsOf === null
          ? null
          : p.settledCashAsOf !== undefined
            ? String(p.settledCashAsOf)
            : undefined,
      totalEquityBase:
        p.totalEquityBase === null
          ? null
          : p.totalEquityBase !== undefined
            ? Number(p.totalEquityBase)
            : undefined,
      totalEquityAsOf:
        p.totalEquityAsOf === null
          ? null
          : p.totalEquityAsOf !== undefined
            ? String(p.totalEquityAsOf)
            : undefined,
      liquidityBuffer:
        p.liquidityBuffer === null
          ? null
          : p.liquidityBuffer !== undefined
            ? Number(p.liquidityBuffer)
            : undefined,
      source: p.source as CapitalConfigSource | undefined,
      externalCreditsIncludedInCash:
        p.externalCreditsIncludedInCash === undefined
          ? undefined
          : Boolean(p.externalCreditsIncludedInCash),
      status:
        p.status === "active" || p.status === "archived"
          ? p.status
          : undefined,
    });
    return {
      ok: true,
      type: "capital-configuration-update",
      message: `Capital Configuration ${config.id} updated.`,
    };
  } catch (err) {
    return fail("capital-configuration-update", err);
  }
}

export async function applyCapitalReservationCreateBlock(
  parsed: TradingInboxPayload
): Promise<CapApplyResult> {
  try {
    const p = parsed.proposal;
    const [snap, monthly, config] = await Promise.all([
      getCapitalAccountSnapshot(),
      getMonthlyRisk(),
      getActiveCapitalConfiguration(),
    ]);
    const reservation = await createCapitalReservation({
      id: p.id !== undefined ? String(p.id) : undefined,
      planId: String(p.planId ?? ""),
      stockFileId:
        p.stockFileId !== undefined ? String(p.stockFileId) : undefined,
      stockThesisId:
        p.stockThesisId !== undefined ? String(p.stockThesisId) : undefined,
      ticker: p.ticker !== undefined ? String(p.ticker) : undefined,
      requestedCapital: Number(p.requestedCapital),
      reservedCapital:
        p.reservedCapital !== undefined ? Number(p.reservedCapital) : undefined,
      estimatedRisk: Number(p.estimatedRisk),
      reservationPriority:
        p.reservationPriority !== undefined
          ? Number(p.reservationPriority)
          : undefined,
      expiresAt: p.expiresAt !== undefined ? String(p.expiresAt) : undefined,
      status: p.status as CapitalReservationStatus | undefined,
      availableCapital: capitalFieldValue(snap.availableCapital),
      authorizableLossRoom: monthly.monthlyLossRoom,
      capitalConfigurationPresent: Boolean(config),
      executionLevelsPresent: true,
    });
    return {
      ok: true,
      type: "capital-reservation-create",
      message: `Capital reservation ${reservation.id} for ${reservation.planId} → ${reservation.fundingDecision}.`,
    };
  } catch (err) {
    return fail("capital-reservation-create", err);
  }
}

export async function applyCapitalReservationUpdateBlock(
  parsed: TradingInboxPayload
): Promise<CapApplyResult> {
  try {
    const p = parsed.proposal;
    const reservation = await updateCapitalReservation({
      id: String(p.id ?? ""),
      requestedCapital:
        p.requestedCapital !== undefined
          ? Number(p.requestedCapital)
          : undefined,
      reservedCapital:
        p.reservedCapital !== undefined ? Number(p.reservedCapital) : undefined,
      estimatedRisk:
        p.estimatedRisk !== undefined ? Number(p.estimatedRisk) : undefined,
      reservationPriority:
        p.reservationPriority !== undefined
          ? Number(p.reservationPriority)
          : undefined,
      expiresAt:
        p.expiresAt === null
          ? null
          : p.expiresAt !== undefined
            ? String(p.expiresAt)
            : undefined,
      status: p.status as CapitalReservationStatus | undefined,
      fundingDecision: p.fundingDecision as FundingDecision | undefined,
      blockingReasons: Array.isArray(p.blockingReasons)
        ? p.blockingReasons.map(String)
        : undefined,
    });
    return {
      ok: true,
      type: "capital-reservation-update",
      message: `Capital reservation ${reservation.id} updated → ${reservation.status}.`,
    };
  } catch (err) {
    return fail("capital-reservation-update", err);
  }
}

export async function applyCapitalReservationReleaseBlock(
  parsed: TradingInboxPayload
): Promise<CapApplyResult> {
  try {
    const p = parsed.proposal;
    const reservation = await releaseCapitalReservation({
      id: String(p.id ?? ""),
      reason: p.reason !== undefined ? String(p.reason) : undefined,
    });
    return {
      ok: true,
      type: "capital-reservation-release",
      message: `Capital reservation ${reservation.id} released.`,
    };
  } catch (err) {
    return fail("capital-reservation-release", err);
  }
}

export async function applyCapitalLedgerAdjustmentBlock(
  parsed: TradingInboxPayload
): Promise<CapApplyResult> {
  try {
    const p = parsed.proposal;
    const { event, idempotentReplay } = await appendCapitalLedgerEvent({
      id: p.id !== undefined ? String(p.id) : undefined,
      idempotencyKey: String(p.idempotencyKey ?? ""),
      eventType: "manual_adjustment",
      amount: Number(p.amount),
      status: "settled",
      effectiveAt:
        p.effectiveAt !== undefined ? String(p.effectiveAt) : undefined,
      settledAt: p.settledAt !== undefined ? String(p.settledAt) : undefined,
      notes: p.notes !== undefined ? String(p.notes) : undefined,
      reversesEventId:
        p.reversesEventId !== undefined
          ? String(p.reversesEventId)
          : undefined,
      externalReference:
        p.externalReference !== undefined
          ? String(p.externalReference)
          : undefined,
    });
    return {
      ok: true,
      type: "capital-ledger-adjustment",
      message: `Ledger ${event.id} ${idempotentReplay ? "replayed" : "recorded"} (${event.amount}).`,
    };
  } catch (err) {
    return fail("capital-ledger-adjustment", err);
  }
}
