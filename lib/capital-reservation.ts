/**
 * Scout Capital Reservations — Apply-only; never creates a Trade.
 */
import {
  assertFiniteNonNegative,
  assertIsoTimestamp,
  isActiveReservation,
  type CapitalReservation,
  type CapitalReservationStatus,
  type FundingDecision,
} from "./capital-types";
import {
  readCapitalPlannerState,
  writeCapitalPlannerState,
} from "./capital-planner-store";
import { appendCapitalLedgerEvent } from "./capital-ledger";
import { evaluateScoutFunding } from "./scout-funding";

export type CreateCapitalReservationInput = {
  id?: string;
  planId: string;
  stockFileId?: string;
  stockThesisId?: string;
  ticker?: string;
  requestedCapital: number;
  reservedCapital?: number;
  estimatedRisk: number;
  reservationPriority?: number;
  expiresAt?: string;
  status?: CapitalReservationStatus;
  availableCapital?: number;
  authorizableLossRoom?: number;
  capitalConfigurationPresent?: boolean;
  scoutExpired?: boolean;
  executionLevelsPresent?: boolean;
};

export type UpdateCapitalReservationInput = {
  id: string;
  requestedCapital?: number;
  reservedCapital?: number;
  estimatedRisk?: number;
  reservationPriority?: number;
  expiresAt?: string | null;
  status?: CapitalReservationStatus;
  fundingDecision?: FundingDecision;
  blockingReasons?: string[];
  availableCapital?: number;
  authorizableLossRoom?: number;
};

export async function listCapitalReservations(): Promise<CapitalReservation[]> {
  return (await readCapitalPlannerState()).reservations;
}

export async function createCapitalReservation(
  input: CreateCapitalReservationInput
): Promise<CapitalReservation> {
  const planId = input.planId.trim().toUpperCase();
  if (!planId) throw new Error("planId required");
  assertFiniteNonNegative(Number(input.requestedCapital), "requestedCapital");
  assertFiniteNonNegative(Number(input.estimatedRisk), "estimatedRisk");
  assertIsoTimestamp(input.expiresAt, "expiresAt");

  const state = await readCapitalPlannerState();
  const existingActive = state.reservations.find(
    (r) => r.planId === planId && isActiveReservation(r)
  );
  if (existingActive) {
    throw new Error(
      `Plan ${planId} already has an active reservation ${existingActive.id}`
    );
  }

  const requested = Number(input.requestedCapital);
  const reserved =
    input.reservedCapital !== undefined
      ? Number(input.reservedCapital)
      : requested;
  assertFiniteNonNegative(reserved, "reservedCapital");
  if (reserved > requested + 1e-9) {
    throw new Error(
      "reservedCapital cannot exceed requestedCapital without explicit amendment"
    );
  }

  const funding = evaluateScoutFunding({
    requestedCapital: requested,
    estimatedRisk: Number(input.estimatedRisk),
    availableCapital: input.availableCapital,
    authorizableLossRoom: input.authorizableLossRoom,
    existingReservations: state.reservations,
    capitalConfigurationPresent: input.capitalConfigurationPresent,
    scoutExpired: input.scoutExpired,
    executionLevelsPresent: input.executionLevelsPresent,
    // conflict check uses planId against existing — skip self
  });

  const now = new Date().toISOString();
  const status = input.status ?? "reserved";
  const reservation: CapitalReservation = {
    id: (input.id?.trim() || `CAPRES-${planId}`).toUpperCase(),
    planId,
    stockFileId: input.stockFileId?.trim().toUpperCase(),
    stockThesisId: input.stockThesisId?.trim().toUpperCase(),
    ticker: input.ticker?.trim().toUpperCase() || undefined,
    status,
    requestedCapital: requested,
    reservedCapital: reserved,
    estimatedRisk: Number(input.estimatedRisk),
    reservationPriority: input.reservationPriority,
    expiresAt: input.expiresAt,
    fundingDecision: funding.fundingDecision,
    blockingReasons: funding.reasons,
    createdAt: now,
    updatedAt: now,
  };

  if (state.reservations.some((r) => r.id === reservation.id)) {
    throw new Error(`reservation ${reservation.id} already exists`);
  }

  state.reservations.push(reservation);
  await writeCapitalPlannerState(state);

  if (status === "reserved" || status === "committed") {
    await appendCapitalLedgerEvent({
      idempotencyKey: `scout_reservation_created:${reservation.id}`,
      eventType: "scout_reservation_created",
      amount: reserved,
      status: "settled",
      settledAt: now,
      sourceEntityType: "capital_reservation",
      sourceEntityId: reservation.id,
      externalReference: planId,
    });
  }

  return reservation;
}

export async function updateCapitalReservation(
  input: UpdateCapitalReservationInput
): Promise<CapitalReservation> {
  const state = await readCapitalPlannerState();
  const idx = state.reservations.findIndex(
    (r) => r.id.toUpperCase() === input.id.trim().toUpperCase()
  );
  if (idx < 0) throw new Error(`reservation ${input.id} not found`);
  const existing = state.reservations[idx];

  if (
    existing.status === "deployed" &&
    input.status !== undefined &&
    (input.status === "released" || input.status === "cancelled")
  ) {
    // Allow explicit release after deploy only via capital-reservation-release with note —
    // silent release blocked here unless status provided through release service.
    throw new Error(
      "deployed reservation cannot be silently released — use capital-reservation-release"
    );
  }

  const next: CapitalReservation = {
    ...existing,
    blockingReasons: [...existing.blockingReasons],
    updatedAt: new Date().toISOString(),
  };

  if (input.requestedCapital !== undefined) {
    assertFiniteNonNegative(Number(input.requestedCapital), "requestedCapital");
    next.requestedCapital = Number(input.requestedCapital);
  }
  if (input.reservedCapital !== undefined) {
    assertFiniteNonNegative(Number(input.reservedCapital), "reservedCapital");
    next.reservedCapital = Number(input.reservedCapital);
  }
  if (next.reservedCapital > next.requestedCapital + 1e-9) {
    throw new Error(
      "reservedCapital cannot exceed requestedCapital without explicit amendment"
    );
  }
  if (input.estimatedRisk !== undefined) {
    assertFiniteNonNegative(Number(input.estimatedRisk), "estimatedRisk");
    next.estimatedRisk = Number(input.estimatedRisk);
  }
  if (input.reservationPriority !== undefined) {
    next.reservationPriority = input.reservationPriority;
  }
  if (input.expiresAt !== undefined) {
    next.expiresAt =
      input.expiresAt === null ? undefined : input.expiresAt;
    assertIsoTimestamp(next.expiresAt, "expiresAt");
  }
  if (input.status !== undefined) next.status = input.status;
  if (input.fundingDecision !== undefined) {
    next.fundingDecision = input.fundingDecision;
  }
  if (input.blockingReasons !== undefined) {
    next.blockingReasons = [...input.blockingReasons];
  } else if (
    input.availableCapital !== undefined ||
    input.authorizableLossRoom !== undefined
  ) {
    const funding = evaluateScoutFunding({
      requestedCapital: next.requestedCapital,
      estimatedRisk: next.estimatedRisk,
      availableCapital: input.availableCapital,
      authorizableLossRoom: input.authorizableLossRoom,
      capitalConfigurationPresent: true,
    });
    next.fundingDecision = funding.fundingDecision;
    next.blockingReasons = funding.reasons;
  }

  state.reservations[idx] = next;
  await writeCapitalPlannerState(state);
  return next;
}

export async function releaseCapitalReservation(input: {
  id: string;
  reason?: string;
}): Promise<CapitalReservation> {
  const state = await readCapitalPlannerState();
  const idx = state.reservations.findIndex(
    (r) => r.id.toUpperCase() === input.id.trim().toUpperCase()
  );
  if (idx < 0) throw new Error(`reservation ${input.id} not found`);
  const existing = state.reservations[idx];

  if (
    existing.status === "released" ||
    existing.status === "cancelled" ||
    existing.status === "expired"
  ) {
    return existing; // idempotent
  }

  const now = new Date().toISOString();
  const next: CapitalReservation = {
    ...existing,
    status: existing.status === "deployed" ? "released" : "released",
    reservedCapital: 0,
    fundingDecision: "unfunded",
    blockingReasons: input.reason ? [input.reason] : existing.blockingReasons,
    releasedAt: now,
    updatedAt: now,
  };
  state.reservations[idx] = next;
  await writeCapitalPlannerState(state);

  await appendCapitalLedgerEvent({
    idempotencyKey: `scout_reservation_released:${existing.id}`,
    eventType: "scout_reservation_released",
    amount: existing.reservedCapital,
    status: "settled",
    settledAt: now,
    sourceEntityType: "capital_reservation",
    sourceEntityId: existing.id,
    notes: input.reason,
  });

  return next;
}

export async function deployCapitalReservation(input: {
  id: string;
  tradeId: string;
}): Promise<CapitalReservation> {
  const state = await readCapitalPlannerState();
  const idx = state.reservations.findIndex(
    (r) => r.id.toUpperCase() === input.id.trim().toUpperCase()
  );
  if (idx < 0) throw new Error(`reservation ${input.id} not found`);
  const existing = state.reservations[idx];
  if (existing.status === "deployed") return existing;
  if (!isActiveReservation(existing) && existing.status !== "committed") {
    throw new Error(
      `reservation ${existing.id} status ${existing.status} cannot deploy`
    );
  }

  const now = new Date().toISOString();
  const next: CapitalReservation = {
    ...existing,
    status: "deployed",
    fundingDecision: "fully_funded",
    updatedAt: now,
  };
  state.reservations[idx] = next;
  await writeCapitalPlannerState(state);

  await appendCapitalLedgerEvent({
    idempotencyKey: `trade_capital_deployed:${existing.id}:${input.tradeId}`,
    eventType: "trade_capital_deployed",
    amount: existing.reservedCapital,
    status: "settled",
    settledAt: now,
    sourceEntityType: "trade",
    sourceEntityId: input.tradeId,
    externalReference: existing.id,
  });

  return next;
}

export function sumReservedCapital(reservations: CapitalReservation[]): number {
  return reservations
    .filter((r) => r.status === "reserved")
    .reduce((s, r) => s + r.reservedCapital, 0);
}

export function sumCommittedCapital(
  reservations: CapitalReservation[]
): number {
  return reservations
    .filter((r) => r.status === "committed")
    .reduce((s, r) => s + r.reservedCapital, 0);
}

export function listExpiredActiveReservations(
  reservations: CapitalReservation[],
  now = new Date()
): CapitalReservation[] {
  const t = now.getTime();
  return reservations.filter((r) => {
    if (!isActiveReservation(r) && r.status !== "expired") return false;
    if (!r.expiresAt) return false;
    const exp = Date.parse(r.expiresAt);
    return Number.isFinite(exp) && exp < t;
  });
}
