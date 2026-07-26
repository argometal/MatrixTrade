/**
 * Capital Planner — Capital Account snapshot (26-13).
 * External Positions contribute investedExternalCapital only.
 * They never touch monthly risk, Scout R, Playbook stats, or MAF.
 */
import {
  getExternalPositions,
} from "./external-position-store";
import {
  isOpenExternalPosition,
  type ExternalPosition,
} from "./external-position-types";
import { getMonthlyRisk } from "./storage";
import type { MonthlyRisk } from "./monthly-risk";

export type CapitalAccountSnapshot = {
  totalCapital: number;
  settledCash: number;
  deployableCapital: number;
  reservedCapital: number;
  committedCapital: number;
  investedScoutCapital: number;
  investedExternalCapital: number;
  liquidityBuffer: number;
  availableCapital: number;
  /** Sum of open external market values (not available cash). */
  externalMarketValue: number;
  /** Cumulative realized proceeds released from external reductions. */
  externalReleasedProceeds: number;
  /** Potential future release = current external market value (informational). */
  potentialExternalCapitalRelease: number;
  openExternalPositionCount: number;
  monthlyRisk?: MonthlyRisk;
  /** True when no base equity is configured — account fields stay conservative. */
  baseEquityConfigured: boolean;
};

export type CapitalAccountInput = {
  /** Optional base equity / total capital. When omitted, totalCapital = 0. */
  totalCapital?: number;
  reservedCapital?: number;
  committedCapital?: number;
  investedScoutCapital?: number;
  liquidityBuffer?: number;
  /** Prior settled cash before external release accounting. Default = totalCapital. */
  settledCashBase?: number;
  externalPositions?: ExternalPosition[];
  monthlyRisk?: MonthlyRisk;
};

/**
 * Build Capital Account. External market value is never treated as available cash.
 * Released proceeds from reductions increase settledCash / deployableCapital.
 */
export function buildCapitalAccountSnapshot(
  input: CapitalAccountInput = {}
): CapitalAccountSnapshot {
  const positions = input.externalPositions ?? [];
  const open = positions.filter(isOpenExternalPosition);
  const investedExternalCapital = open.reduce(
    (sum, p) => sum + (Number.isFinite(p.costBasis) ? p.costBasis : 0),
    0
  );
  const externalMarketValue = open.reduce((sum, p) => {
    if (p.currentMarketValue !== undefined && Number.isFinite(p.currentMarketValue)) {
      return sum + p.currentMarketValue;
    }
    return sum + (Number.isFinite(p.costBasis) ? p.costBasis : 0);
  }, 0);
  const externalReleasedProceeds = positions.reduce(
    (sum, p) =>
      sum +
      (Number.isFinite(p.cumulativeReleasedProceeds)
        ? p.cumulativeReleasedProceeds
        : 0),
    0
  );

  const baseEquityConfigured =
    input.totalCapital !== undefined && Number.isFinite(input.totalCapital);
  const totalCapital = baseEquityConfigured ? Number(input.totalCapital) : 0;
  const reservedCapital = Number(input.reservedCapital ?? 0);
  const committedCapital = Number(input.committedCapital ?? 0);
  const investedScoutCapital = Number(input.investedScoutCapital ?? 0);
  const liquidityBuffer = Number(input.liquidityBuffer ?? 0);

  const settledCashBase =
    input.settledCashBase !== undefined
      ? Number(input.settledCashBase)
      : totalCapital;
  // Released proceeds increase settled cash; invested external cost is capital at risk, not cash.
  const settledCash = settledCashBase + externalReleasedProceeds;
  const deployableCapital = Math.max(
    0,
    settledCash - reservedCapital - committedCapital - liquidityBuffer
  );
  const availableCapital = Math.max(
    0,
    deployableCapital - investedScoutCapital
  );

  return {
    totalCapital,
    settledCash,
    deployableCapital,
    reservedCapital,
    committedCapital,
    investedScoutCapital,
    investedExternalCapital,
    liquidityBuffer,
    availableCapital,
    externalMarketValue,
    externalReleasedProceeds,
    potentialExternalCapitalRelease: externalMarketValue,
    openExternalPositionCount: open.length,
    monthlyRisk: input.monthlyRisk,
    baseEquityConfigured,
  };
}

/** Live Capital Account for UI / planner. */
export async function getCapitalAccountSnapshot(options?: {
  totalCapital?: number;
}): Promise<CapitalAccountSnapshot> {
  const [externalPositions, monthlyRisk] = await Promise.all([
    getExternalPositions(),
    getMonthlyRisk(),
  ]);
  return buildCapitalAccountSnapshot({
    totalCapital: options?.totalCapital,
    externalPositions,
    monthlyRisk,
  });
}

/** External positions never contribute to monthly risk used. */
export function externalPositionsAffectMonthlyRisk(): false {
  return false;
}
