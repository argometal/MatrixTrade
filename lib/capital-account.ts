/**
 * Capital Planner — Capital Account snapshot (26-13 / hardened 26-14).
 *
 * Unconfigured global fields are never silently shown as known zero.
 * External Positions contribute investedExternalCapital and settlement ledgers only.
 * Pending settlement does NOT increase settled cash.
 */
import { getExternalPositions } from "./external-position-store";
import {
  isOpenExternalPosition,
  sumPendingSettlementProceeds,
  sumSettledProceeds,
  type ExternalPosition,
} from "./external-position-types";
import { getMonthlyRisk } from "./storage";
import type { MonthlyRisk } from "./monthly-risk";

export type CapitalField =
  | { status: "configured"; value: number }
  | { status: "unconfigured"; reason: string };

export function capitalFieldValue(field: CapitalField): number | undefined {
  return field.status === "configured" ? field.value : undefined;
}

export type CapitalAccountSnapshot = {
  /** Partial planner — not a complete global capital ledger. */
  completeness: "partial_external_only";
  totalCapital: CapitalField;
  settledCash: CapitalField;
  deployableCapital: CapitalField;
  reservedCapital: CapitalField;
  committedCapital: CapitalField;
  investedScoutCapital: CapitalField;
  liquidityBuffer: CapitalField;
  availableCapital: CapitalField;
  /** Known from External Positions (cost basis of open rows). */
  investedExternalCapital: CapitalField;
  externalMarketValue: CapitalField;
  /** Sale proceeds awaiting settlement — not cash. */
  pendingSettlementProceeds: CapitalField;
  /** Settled external sale credits (ledger, counted once). */
  settledExternalProceeds: CapitalField;
  potentialExternalCapitalRelease: CapitalField;
  openExternalPositionCount: number;
  monthlyRisk?: MonthlyRisk;
  notes: string[];
};

export type CapitalAccountInput = {
  totalCapital?: number;
  settledCashBase?: number;
  reservedCapital?: number;
  committedCapital?: number;
  investedScoutCapital?: number;
  liquidityBuffer?: number;
  externalPositions?: ExternalPosition[];
  monthlyRisk?: MonthlyRisk;
};

function configured(value: number): CapitalField {
  return { status: "configured", value };
}

function unconfigured(reason: string): CapitalField {
  return { status: "unconfigured", reason };
}

export function buildCapitalAccountSnapshot(
  input: CapitalAccountInput = {}
): CapitalAccountSnapshot {
  const positions = input.externalPositions ?? [];
  const open = positions.filter(isOpenExternalPosition);
  const investedExternal = open.reduce(
    (sum, p) => sum + (Number.isFinite(p.costBasis) ? p.costBasis : 0),
    0
  );
  const externalMarketValue = open.reduce((sum, p) => {
    if (
      p.currentMarketValue !== undefined &&
      Number.isFinite(p.currentMarketValue)
    ) {
      return sum + p.currentMarketValue;
    }
    return sum + (Number.isFinite(p.costBasis) ? p.costBasis : 0);
  }, 0);

  const pending = sumPendingSettlementProceeds(positions);
  const settledExternal = sumSettledProceeds(positions);

  const notes: string[] = [
    "Capital Planner is partial: External Positions are connected; Scout reservations / committed / invested Scout capital / base equity are not wired as authoritative sources.",
    "Pending settlement proceeds are not settled cash.",
    "Settled external credits are ledger events counted once — not re-added from cumulative sale totals on each snapshot.",
  ];

  const investedExternalCapital = configured(investedExternal);
  const externalMarketValueField = configured(externalMarketValue);
  const pendingSettlementProceeds = configured(pending);
  const settledExternalProceeds = configured(settledExternal);
  const potentialExternalCapitalRelease = configured(externalMarketValue);

  const totalCapital =
    input.totalCapital !== undefined && Number.isFinite(input.totalCapital)
      ? configured(Number(input.totalCapital))
      : unconfigured("totalCapital source not configured");

  const reservedCapital =
    input.reservedCapital !== undefined && Number.isFinite(input.reservedCapital)
      ? configured(Number(input.reservedCapital))
      : unconfigured("Scout/capital reservations not connected");

  const committedCapital =
    input.committedCapital !== undefined &&
    Number.isFinite(input.committedCapital)
      ? configured(Number(input.committedCapital))
      : unconfigured("committed capital source not connected");

  const investedScoutCapital =
    input.investedScoutCapital !== undefined &&
    Number.isFinite(input.investedScoutCapital)
      ? configured(Number(input.investedScoutCapital))
      : unconfigured("invested Scout capital source not connected");

  const liquidityBuffer =
    input.liquidityBuffer !== undefined && Number.isFinite(input.liquidityBuffer)
      ? configured(Number(input.liquidityBuffer))
      : unconfigured("liquidity buffer not configured");

  let settledCash: CapitalField;
  if (
    input.settledCashBase !== undefined &&
    Number.isFinite(input.settledCashBase)
  ) {
    // Base cash + settled external credits only (never pending; never re-sum sale totals).
    settledCash = configured(Number(input.settledCashBase) + settledExternal);
  } else if (totalCapital.status === "configured") {
    settledCash = configured(totalCapital.value + settledExternal);
  } else {
    settledCash = unconfigured(
      "settledCash requires configured base equity or settledCashBase; pending settlement is excluded"
    );
  }

  let deployableCapital: CapitalField = unconfigured(
    "deployableCapital requires settledCash + reserved/committed/buffer configuration"
  );
  let availableCapital: CapitalField = unconfigured(
    "availableCapital requires deployableCapital and investedScoutCapital"
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
    deployableCapital = configured(deployable);
    if (investedScoutCapital.status === "configured") {
      availableCapital = configured(
        Math.max(0, deployable - investedScoutCapital.value)
      );
    }
  }

  return {
    completeness: "partial_external_only",
    totalCapital,
    settledCash,
    deployableCapital,
    reservedCapital,
    committedCapital,
    investedScoutCapital,
    liquidityBuffer,
    availableCapital,
    investedExternalCapital,
    externalMarketValue: externalMarketValueField,
    pendingSettlementProceeds,
    settledExternalProceeds,
    potentialExternalCapitalRelease,
    openExternalPositionCount: open.length,
    monthlyRisk: input.monthlyRisk,
    notes,
  };
}

export async function getCapitalAccountSnapshot(options?: {
  totalCapital?: number;
  settledCashBase?: number;
}): Promise<CapitalAccountSnapshot> {
  const [externalPositions, monthlyRisk] = await Promise.all([
    getExternalPositions(),
    getMonthlyRisk(),
  ]);
  return buildCapitalAccountSnapshot({
    totalCapital: options?.totalCapital,
    settledCashBase: options?.settledCashBase,
    externalPositions,
    monthlyRisk,
  });
}

export function externalPositionsAffectMonthlyRisk(): false {
  return false;
}
