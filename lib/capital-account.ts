/**
 * Capital Planner — Capital Account snapshot (26-15).
 * Accounting model: cash_ledger (Model A).
 *
 * Never derive settledCash from totalEquity.
 * Never substitute costBasis for missing market value.
 * Never count potential release as available capital.
 */
import { getExternalPositions } from "./external-position-store";
import {
  isOpenExternalPosition,
  isValuationStale,
  sumPendingSettlementProceeds,
  sumSettledProceeds,
  type ExternalPosition,
} from "./external-position-types";
import { getMonthlyRisk, getTrades } from "./storage";
import type { MonthlyRisk } from "./monthly-risk";
import type { Trade } from "./types";
import {
  capitalFieldValue,
  configuredField,
  unconfiguredField,
  unknownField,
  type CapitalAccountCompleteness,
  type CapitalConfiguration,
  type CapitalField,
  type CapitalLedgerEvent,
  type CapitalReservation,
} from "./capital-types";
import { getActiveCapitalConfiguration } from "./capital-configuration";
import { sumSettledExternalCreditsFromLedger } from "./capital-ledger";
import {
  listExpiredActiveReservations,
  sumCommittedCapital,
  sumReservedCapital,
} from "./capital-reservation";
import { computeInvestedScoutCapital } from "./invested-scout-capital";
import { readCapitalPlannerState } from "./capital-planner-store";

export type { CapitalField, CapitalAccountCompleteness };
export { capitalFieldValue };

export type PotentialReleaseDetail = {
  positionId: string;
  ticker: string;
  releasableShares: number;
  estimatedReleaseValue: number;
  releaseConfidence: "low" | "medium" | "high";
  valuationAsOf?: string;
};

export type CapitalAccountSnapshot = {
  accountingModel: "cash_ledger";
  completeness: CapitalAccountCompleteness;
  /** Account equity — never treated as cash. */
  totalEquity: CapitalField;
  totalEquityAsOf?: string;
  settledCash: CapitalField;
  settledCashAsOf?: string;
  cashSource?: string;
  reconciliationStatus: "unreconciled" | "reconciled" | "conflict" | "unconfigured";
  deployableCapital: CapitalField;
  reservedCapital: CapitalField;
  committedCapital: CapitalField;
  investedScoutCapital: CapitalField;
  liquidityBuffer: CapitalField;
  /** Model A: equals deployableCapital when configured. */
  availableCapital: CapitalField;
  investedExternalCapital: CapitalField;
  externalMarketValue: CapitalField;
  pendingSettlementProceeds: CapitalField;
  settledExternalProceeds: CapitalField;
  potentialExternalCapitalRelease: CapitalField;
  potentialReleaseDetails: PotentialReleaseDetail[];
  openExternalPositionCount: number;
  reservations: CapitalReservation[];
  configuration: CapitalConfiguration | null;
  monthlyRisk?: MonthlyRisk;
  notes: string[];
};

export type CapitalAccountInput = {
  configuration?: CapitalConfiguration | null;
  externalPositions?: ExternalPosition[];
  reservations?: CapitalReservation[];
  ledgerEvents?: CapitalLedgerEvent[];
  openTrades?: Trade[];
  monthlyRisk?: MonthlyRisk;
  /** Test override — prefer configuration in production. */
  settledCashBase?: number;
  totalEquityBase?: number;
  liquidityBuffer?: number;
  externalCreditsIncludedInCash?: boolean;
};

function buildCompleteness(flags: {
  cash: boolean;
  equity: boolean;
  external: boolean;
  reservations: boolean;
  committed: boolean;
  investedScout: boolean;
  buffer: boolean;
  ledger: boolean;
  reconciled: boolean;
}): CapitalAccountCompleteness {
  const status: CapitalAccountCompleteness["status"] = flags.reconciled
    ? "reconciled"
    : flags.cash && flags.buffer && flags.reservations && flags.committed && flags.investedScout
      ? "operational"
      : flags.cash || flags.external || flags.equity
        ? "partial"
        : "unconfigured";

  return {
    cashSourceConfigured: flags.cash,
    equitySourceConfigured: flags.equity,
    externalPositionsConfigured: flags.external,
    scoutReservationsConfigured: flags.reservations,
    committedCapitalConfigured: flags.committed,
    investedScoutCapitalConfigured: flags.investedScout,
    liquidityBufferConfigured: flags.buffer,
    ledgerConfigured: flags.ledger,
    status,
  };
}

export function computeExternalMarketValueField(
  positions: ExternalPosition[]
): CapitalField {
  const open = positions.filter(isOpenExternalPosition);
  let sum = 0;
  let known = 0;
  let unknown = 0;
  for (const p of open) {
    if (
      p.currentPrice !== undefined &&
      Number.isFinite(p.currentPrice) &&
      p.currentPrice > 0 &&
      Number.isFinite(p.shares) &&
      p.shares >= 0
    ) {
      sum += p.shares * p.currentPrice;
      known += 1;
    } else {
      unknown += 1;
    }
  }
  if (open.length === 0) return configuredField(0);
  if (known === 0) {
    return unknownField(
      "external market value requires valid currentPrice for open positions"
    );
  }
  if (unknown > 0) {
    return unknownField(
      `external market value incomplete: ${unknown} open position(s) lack valid price`
    );
  }
  return configuredField(sum);
}

export function computePotentialExternalRelease(
  positions: ExternalPosition[]
): {
  field: CapitalField;
  details: PotentialReleaseDetail[];
} {
  const details: PotentialReleaseDetail[] = [];
  for (const p of positions.filter(isOpenExternalPosition)) {
    if (p.liquidityStatus !== "liquid") continue;
    if (
      p.currentPrice === undefined ||
      !(p.currentPrice > 0) ||
      !Number.isFinite(p.currentPrice)
    ) {
      continue;
    }
    if (isValuationStale(p.lastValuationAt)) continue;

    const fromPlan =
      p.exitPlan?.status === "active" &&
      p.exitPlan.targetShares !== undefined &&
      p.exitPlan.targetShares > 0
        ? Math.min(p.exitPlan.targetShares, p.shares)
        : undefined;
    const releasableShares = fromPlan;
    if (releasableShares === undefined || releasableShares <= 0) continue;

    details.push({
      positionId: p.id,
      ticker: p.ticker,
      releasableShares,
      estimatedReleaseValue: releasableShares * p.currentPrice,
      releaseConfidence: fromPlan !== undefined ? "medium" : "low",
      valuationAsOf: p.lastValuationAt,
    });
  }

  if (details.length === 0) {
    return {
      field: unconfiguredField(
        "potential release requires liquid + non-stale valuation + active exit plan targetShares"
      ),
      details,
    };
  }
  return {
    field: configuredField(
      details.reduce((s, d) => s + d.estimatedReleaseValue, 0)
    ),
    details,
  };
}

export function buildCapitalAccountSnapshot(
  input: CapitalAccountInput = {}
): CapitalAccountSnapshot {
  const positions = input.externalPositions ?? [];
  const open = positions.filter(isOpenExternalPosition);
  const reservations = input.reservations ?? [];
  const ledgerEvents = input.ledgerEvents ?? [];
  const config = input.configuration ?? null;

  const investedExternal = open.reduce(
    (sum, p) => sum + (Number.isFinite(p.costBasis) ? p.costBasis : 0),
    0
  );
  const investedExternalCapital = configuredField(investedExternal);
  const externalMarketValue = computeExternalMarketValueField(positions);
  const pending = sumPendingSettlementProceeds(positions);
  const settledFromPositions = sumSettledProceeds(positions);
  const settledFromLedger = sumSettledExternalCreditsFromLedger(ledgerEvents);
  // Prefer ledger when present; else position reduction settlement (legacy path).
  const settledExternal =
    ledgerEvents.some((e) => e.eventType === "external_position_sale_settled")
      ? settledFromLedger
      : settledFromPositions;

  const pendingSettlementProceeds = configuredField(pending);
  const settledExternalProceeds = configuredField(settledExternal);
  const potential = computePotentialExternalRelease(positions);

  const notes: string[] = [
    "Accounting model: cash_ledger (Model A). availableCapital = deployableCapital.",
    "totalEquity is never treated as settled cash.",
    "Pending settlement and potential external release are not available capital.",
    "investedScoutCapital is informational and is not subtracted again from cash.",
  ];

  const settledCashBase =
    input.settledCashBase !== undefined
      ? input.settledCashBase
      : config?.settledCashBase;
  const totalEquityBase =
    input.totalEquityBase !== undefined
      ? input.totalEquityBase
      : config?.totalEquityBase;
  const liquidityBufferValue =
    input.liquidityBuffer !== undefined
      ? input.liquidityBuffer
      : config?.liquidityBuffer;
  const externalCreditsIncluded =
    input.externalCreditsIncludedInCash ??
    config?.externalCreditsIncludedInCash ??
    false;

  const totalEquity =
    totalEquityBase !== undefined && Number.isFinite(totalEquityBase)
      ? configuredField(Number(totalEquityBase))
      : unconfiguredField("totalEquityBase not configured");

  let settledCash: CapitalField;
  if (settledCashBase !== undefined && Number.isFinite(settledCashBase)) {
    const credits = externalCreditsIncluded ? 0 : settledExternal;
    settledCash = configuredField(Number(settledCashBase) + credits);
  } else {
    settledCash = unconfiguredField(
      "settledCashBase not configured — cash source missing"
    );
  }

  // Reservations store is the authoritative Scout reservation source (may be empty).
  const reservedCapital = configuredField(sumReservedCapital(reservations));
  const committedCapital = configuredField(sumCommittedCapital(reservations));

  const invested = computeInvestedScoutCapital(input.openTrades ?? []);
  const investedScoutCapital = invested.field;

  const liquidityBuffer =
    liquidityBufferValue !== undefined && Number.isFinite(liquidityBufferValue)
      ? configuredField(Number(liquidityBufferValue))
      : unconfiguredField("liquidityBuffer not configured");

  let deployableCapital: CapitalField = unconfiguredField(
    "deployableCapital requires settledCash, reserved, committed, and liquidityBuffer"
  );
  let availableCapital: CapitalField = unconfiguredField(
    "availableCapital requires deployableCapital (Model A)"
  );

  if (
    settledCash.status === "configured" &&
    reservedCapital.status === "configured" &&
    committedCapital.status === "configured" &&
    liquidityBuffer.status === "configured"
  ) {
    const deployable = Math.max(
      0,
      settledCash.value -
        reservedCapital.value -
        committedCapital.value -
        liquidityBuffer.value
    );
    deployableCapital = configuredField(deployable);
    // Model A: available = deployable (do not subtract investedScoutCapital again).
    availableCapital = configuredField(deployable);
  }

  const completeness = buildCompleteness({
    cash: settledCash.status === "configured",
    equity: totalEquity.status === "configured",
    external: true,
    reservations: true,
    committed: true,
    investedScout: investedScoutCapital.status === "configured",
    buffer: liquidityBuffer.status === "configured",
    ledger: true,
    reconciled:
      config !== null &&
      ledgerEvents.length > 0 &&
      ledgerEvents.every((e) => e.reconciliationStatus === "reconciled"),
  });

  return {
    accountingModel: "cash_ledger",
    completeness,
    totalEquity,
    totalEquityAsOf: config?.totalEquityAsOf,
    settledCash,
    settledCashAsOf: config?.settledCashAsOf,
    cashSource: config?.source,
    reconciliationStatus:
      completeness.status === "reconciled"
        ? "reconciled"
        : settledCash.status === "configured"
          ? "unreconciled"
          : "unconfigured",
    deployableCapital,
    reservedCapital,
    committedCapital,
    investedScoutCapital,
    liquidityBuffer,
    availableCapital,
    investedExternalCapital,
    externalMarketValue,
    pendingSettlementProceeds,
    settledExternalProceeds,
    potentialExternalCapitalRelease: potential.field,
    potentialReleaseDetails: potential.details,
    openExternalPositionCount: open.length,
    reservations,
    configuration: config,
    monthlyRisk: input.monthlyRisk,
    notes,
  };
}

export async function getCapitalAccountSnapshot(): Promise<CapitalAccountSnapshot> {
  const [externalPositions, monthlyRisk, trades, state, configuration] =
    await Promise.all([
      getExternalPositions(),
      getMonthlyRisk(),
      getTrades(),
      readCapitalPlannerState(),
      getActiveCapitalConfiguration(),
    ]);
  const openTrades = trades.filter((t) => t.status === "open");
  return buildCapitalAccountSnapshot({
    configuration,
    externalPositions,
    reservations: state.reservations,
    ledgerEvents: state.ledgerEvents,
    openTrades,
    monthlyRisk,
  });
}

export function externalPositionsAffectMonthlyRisk(): false {
  return false;
}

export function buildExpiredReservationAttentionItems(
  reservations: CapitalReservation[]
): Array<{
  id: string;
  priority: number;
  title: string;
  detail: string;
}> {
  return listExpiredActiveReservations(reservations).map((r) => ({
    id: `capital-reservation-expired-${r.id}`,
    priority: 35,
    title: `Expired capital reservation ${r.id}`,
    detail: `Plan ${r.planId} reservation expired — release unused reserved capital.`,
  }));
}
