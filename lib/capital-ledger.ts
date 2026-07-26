/**
 * Capital ledger — idempotent events; settled amounts immutable.
 */
import {
  assertFiniteNonNegative,
  assertIsoTimestamp,
  type CapitalLedgerEvent,
  type CapitalLedgerEventType,
  type CapitalLedgerStatus,
  type CapitalReconciliationStatus,
} from "./capital-types";
import {
  readCapitalPlannerState,
  writeCapitalPlannerState,
} from "./capital-planner-store";

export type AppendCapitalLedgerEventInput = {
  id?: string;
  idempotencyKey: string;
  eventType: CapitalLedgerEventType;
  amount: number;
  status?: CapitalLedgerStatus;
  effectiveAt?: string;
  settledAt?: string;
  sourceEntityType?: string;
  sourceEntityId?: string;
  externalReference?: string;
  reconciliationStatus?: CapitalReconciliationStatus;
  notes?: string;
  reversesEventId?: string;
};

function payloadConflicts(
  existing: CapitalLedgerEvent,
  input: AppendCapitalLedgerEventInput
): boolean {
  if (existing.eventType !== input.eventType) return true;
  if (existing.amount !== Number(input.amount)) return true;
  if (
    input.sourceEntityId !== undefined &&
    existing.sourceEntityId !== input.sourceEntityId
  ) {
    return true;
  }
  if (
    input.externalReference !== undefined &&
    existing.externalReference !== input.externalReference
  ) {
    return true;
  }
  return false;
}

export async function appendCapitalLedgerEvent(
  input: AppendCapitalLedgerEventInput
): Promise<{ event: CapitalLedgerEvent; idempotentReplay?: boolean }> {
  const key = input.idempotencyKey.trim();
  if (!key) throw new Error("idempotencyKey required");
  assertFiniteNonNegative(Number(input.amount), "amount");
  assertIsoTimestamp(input.effectiveAt, "effectiveAt");
  assertIsoTimestamp(input.settledAt, "settledAt");

  const state = await readCapitalPlannerState();
  const prior = state.ledgerEvents.find((e) => e.idempotencyKey === key);
  if (prior) {
    if (payloadConflicts(prior, input)) {
      throw new Error(
        `ledger idempotencyKey ${key} already accepted with conflicting payload`
      );
    }
    return { event: prior, idempotentReplay: true };
  }

  const now = new Date().toISOString();
  const status = input.status ?? "pending";
  if (
    input.reversesEventId &&
    !state.ledgerEvents.some((e) => e.id === input.reversesEventId)
  ) {
    throw new Error(`reversesEventId ${input.reversesEventId} not found`);
  }

  const event: CapitalLedgerEvent = {
    id: (
      input.id?.trim() ||
      `CLED-${key.replace(/[^a-zA-Z0-9]+/g, "-").slice(0, 48)}-${state.ledgerEvents.length + 1}`
    ).toUpperCase(),
    idempotencyKey: key,
    eventType: input.eventType,
    amount: Number(input.amount),
    currency: "USD",
    status,
    effectiveAt: input.effectiveAt ?? now,
    settledAt: input.settledAt,
    sourceEntityType: input.sourceEntityType,
    sourceEntityId: input.sourceEntityId,
    externalReference: input.externalReference,
    reconciliationStatus: input.reconciliationStatus ?? "unreconciled",
    notes: input.notes,
    reversesEventId: input.reversesEventId,
    createdAt: now,
    updatedAt: now,
  };

  if (state.ledgerEvents.some((e) => e.id === event.id)) {
    throw new Error(`ledger event ${event.id} already exists`);
  }

  state.ledgerEvents.push(event);
  await writeCapitalPlannerState(state);
  return { event };
}

/** Settled external sale credits not reversed — counted once. */
export function sumSettledExternalCreditsFromLedger(
  events: CapitalLedgerEvent[]
): number {
  let sum = 0;
  const reversed = new Set(
    events
      .filter((e) => e.reversesEventId && e.status !== "cancelled")
      .map((e) => e.reversesEventId as string)
  );
  for (const e of events) {
    if (e.eventType !== "external_position_sale_settled") continue;
    if (e.status !== "settled") continue;
    if (reversed.has(e.id)) continue;
    sum += e.amount;
  }
  return sum;
}

export async function listCapitalLedgerEvents(): Promise<CapitalLedgerEvent[]> {
  return (await readCapitalPlannerState()).ledgerEvents;
}
