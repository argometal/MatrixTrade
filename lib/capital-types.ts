/**
 * Capital Planner domain types (26-15).
 * Accounting model: cash_ledger (Model A) only.
 */

export const CAPITAL_ACCOUNTING_MODELS = ["cash_ledger"] as const;
export type CapitalAccountingModel = (typeof CAPITAL_ACCOUNTING_MODELS)[number];

export const CAPITAL_CONFIG_SOURCES = [
  "manual",
  "broker_snapshot",
  "imported",
  "other",
] as const;
export type CapitalConfigSource = (typeof CAPITAL_CONFIG_SOURCES)[number];

export const CAPITAL_CONFIG_STATUSES = ["active", "archived"] as const;
export type CapitalConfigStatus = (typeof CAPITAL_CONFIG_STATUSES)[number];

export type CapitalConfiguration = {
  id: string;
  accountingModel: CapitalAccountingModel;
  baseCurrency: "USD";
  settledCashBase?: number;
  settledCashAsOf?: string;
  totalEquityBase?: number;
  totalEquityAsOf?: string;
  liquidityBuffer?: number;
  source: CapitalConfigSource;
  /** When true, settledCashBase already includes settled external credits. */
  externalCreditsIncludedInCash: boolean;
  status: CapitalConfigStatus;
  createdAt: string;
  updatedAt: string;
};

export const CAPITAL_LEDGER_EVENT_TYPES = [
  "external_position_sale_pending",
  "external_position_sale_settled",
  "scout_reservation_created",
  "scout_reservation_released",
  "trade_capital_committed",
  "trade_capital_deployed",
  "trade_capital_released",
  "manual_adjustment",
] as const;
export type CapitalLedgerEventType = (typeof CAPITAL_LEDGER_EVENT_TYPES)[number];

export const CAPITAL_LEDGER_STATUSES = [
  "pending",
  "settled",
  "reversed",
  "cancelled",
] as const;
export type CapitalLedgerStatus = (typeof CAPITAL_LEDGER_STATUSES)[number];

export const CAPITAL_RECONCILIATION_STATUSES = [
  "unreconciled",
  "reconciled",
  "conflict",
] as const;
export type CapitalReconciliationStatus =
  (typeof CAPITAL_RECONCILIATION_STATUSES)[number];

export type CapitalLedgerEvent = {
  id: string;
  /** Stable idempotency key (unique). */
  idempotencyKey: string;
  eventType: CapitalLedgerEventType;
  amount: number;
  currency: "USD";
  status: CapitalLedgerStatus;
  effectiveAt: string;
  settledAt?: string;
  sourceEntityType?: string;
  sourceEntityId?: string;
  externalReference?: string;
  reconciliationStatus: CapitalReconciliationStatus;
  notes?: string;
  /** If this event reverses another settled event. */
  reversesEventId?: string;
  createdAt: string;
  updatedAt: string;
};

export const CAPITAL_RESERVATION_STATUSES = [
  "proposed",
  "reserved",
  "committed",
  "deployed",
  "released",
  "cancelled",
  "expired",
] as const;
export type CapitalReservationStatus =
  (typeof CAPITAL_RESERVATION_STATUSES)[number];

export const FUNDING_DECISIONS = [
  "unassessed",
  "unfunded",
  "partially_funded",
  "fully_funded",
  "blocked",
] as const;
export type FundingDecision = (typeof FUNDING_DECISIONS)[number];

export type CapitalReservation = {
  id: string;
  planId: string;
  stockFileId?: string;
  stockThesisId?: string;
  /** Runtime data only — never hard-coded in infrastructure. */
  ticker?: string;
  status: CapitalReservationStatus;
  requestedCapital: number;
  reservedCapital: number;
  estimatedRisk: number;
  reservationPriority?: number;
  expiresAt?: string;
  fundingDecision: FundingDecision;
  blockingReasons: string[];
  createdAt: string;
  updatedAt: string;
  releasedAt?: string;
  /**
   * Provenance for assisted funding follow-up (29-21).
   * Nullable on legacy reservations — never invent during migration.
   */
  fundingFingerprint?: string;
  sourcePlanUpdatedAt?: string;
  sourceDecisionUpdateId?: string;
};

export const ACTIVE_RESERVATION_STATUSES: CapitalReservationStatus[] = [
  "proposed",
  "reserved",
  "committed",
];

export function isActiveReservation(r: CapitalReservation): boolean {
  return ACTIVE_RESERVATION_STATUSES.includes(r.status);
}

export type CapitalAccountCompleteness = {
  cashSourceConfigured: boolean;
  equitySourceConfigured: boolean;
  externalPositionsConfigured: boolean;
  scoutReservationsConfigured: boolean;
  committedCapitalConfigured: boolean;
  investedScoutCapitalConfigured: boolean;
  liquidityBufferConfigured: boolean;
  ledgerConfigured: boolean;
  status: "unconfigured" | "partial" | "operational" | "reconciled";
};

export type CapitalField =
  | { status: "configured"; value: number }
  | { status: "unconfigured"; reason: string }
  | { status: "unknown"; reason: string };

export function capitalFieldValue(field: CapitalField): number | undefined {
  return field.status === "configured" ? field.value : undefined;
}

export function configuredField(value: number): CapitalField {
  return { status: "configured", value };
}

export function unconfiguredField(reason: string): CapitalField {
  return { status: "unconfigured", reason };
}

export function unknownField(reason: string): CapitalField {
  return { status: "unknown", reason };
}

export function assertFiniteNonNegative(
  value: number,
  field: string
): void {
  if (!Number.isFinite(value) || Number.isNaN(value)) {
    throw new Error(`${field} must be a finite number`);
  }
  if (value < 0) {
    throw new Error(`${field} must be non-negative`);
  }
}

export function assertIsoTimestamp(value: string | undefined, field: string): void {
  if (value === undefined) return;
  const t = Date.parse(value);
  if (!Number.isFinite(t) || Number.isNaN(t)) {
    throw new Error(`${field} must be a valid ISO timestamp`);
  }
}
