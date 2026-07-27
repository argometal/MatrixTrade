/**
 * Capital Configuration — single active cash_ledger config.
 */
import {
  assertBalanceAsOfInvariant,
} from "./capital-balance-asof";
import {
  assertFiniteNonNegative,
  assertIsoTimestamp,
  type CapitalConfigSource,
  type CapitalConfiguration,
} from "./capital-types";
import {
  readCapitalPlannerState,
  writeCapitalPlannerState,
} from "./capital-planner-store";

export type CreateCapitalConfigurationInput = {
  id?: string;
  settledCashBase?: number;
  settledCashAsOf?: string;
  totalEquityBase?: number;
  totalEquityAsOf?: string;
  liquidityBuffer?: number;
  source?: CapitalConfigSource;
  externalCreditsIncludedInCash?: boolean;
};

export type UpdateCapitalConfigurationInput = {
  id: string;
  settledCashBase?: number | null;
  settledCashAsOf?: string | null;
  totalEquityBase?: number | null;
  totalEquityAsOf?: string | null;
  liquidityBuffer?: number | null;
  source?: CapitalConfigSource;
  externalCreditsIncludedInCash?: boolean;
  status?: "active" | "archived";
};

export async function getActiveCapitalConfiguration(): Promise<
  CapitalConfiguration | null
> {
  const state = await readCapitalPlannerState();
  if (state.configuration?.status === "active") return state.configuration;
  return null;
}

export async function createCapitalConfiguration(
  input: CreateCapitalConfigurationInput
): Promise<CapitalConfiguration> {
  const state = await readCapitalPlannerState();
  if (state.configuration?.status === "active") {
    throw new Error(
      "An active Capital Configuration already exists — update or archive it first"
    );
  }

  // Create must never coerce null → 0 via Number(null).
  if (input.settledCashBase !== undefined) {
    if (input.settledCashBase === null) {
      throw new Error("settledCashBase null is not allowed on create");
    }
    assertFiniteNonNegative(Number(input.settledCashBase), "settledCashBase");
  }
  if (input.totalEquityBase !== undefined) {
    if (input.totalEquityBase === null) {
      throw new Error("totalEquityBase null is not allowed on create");
    }
    assertFiniteNonNegative(Number(input.totalEquityBase), "totalEquityBase");
  }
  if (input.liquidityBuffer !== undefined) {
    if (input.liquidityBuffer === null) {
      throw new Error("liquidityBuffer null is not allowed on create");
    }
    assertFiniteNonNegative(Number(input.liquidityBuffer), "liquidityBuffer");
  }
  assertIsoTimestamp(input.settledCashAsOf, "settledCashAsOf");
  assertIsoTimestamp(input.totalEquityAsOf, "totalEquityAsOf");

  const now = new Date().toISOString();
  const config: CapitalConfiguration = {
    id: (input.id?.trim() || "CAPCFG-DEFAULT").toUpperCase(),
    accountingModel: "cash_ledger",
    baseCurrency: "USD",
    settledCashBase:
      input.settledCashBase !== undefined
        ? Number(input.settledCashBase)
        : undefined,
    settledCashAsOf: input.settledCashAsOf,
    totalEquityBase:
      input.totalEquityBase !== undefined
        ? Number(input.totalEquityBase)
        : undefined,
    totalEquityAsOf: input.totalEquityAsOf,
    liquidityBuffer:
      input.liquidityBuffer !== undefined
        ? Number(input.liquidityBuffer)
        : undefined,
    source: input.source ?? "manual",
    externalCreditsIncludedInCash: input.externalCreditsIncludedInCash ?? false,
    status: "active",
    createdAt: now,
    updatedAt: now,
  };

  // Domain enforces create invariants independently of UI / Apply validation.
  assertBalanceAsOfInvariant(config, { requireAtLeastOneCompletePair: true });

  state.configuration = config;
  await writeCapitalPlannerState(state);
  return config;
}

export async function updateCapitalConfiguration(
  input: UpdateCapitalConfigurationInput
): Promise<CapitalConfiguration> {
  const state = await readCapitalPlannerState();
  const existing = state.configuration;
  if (!existing || existing.id.toUpperCase() !== input.id.trim().toUpperCase()) {
    throw new Error(`Capital Configuration ${input.id} not found`);
  }

  const next: CapitalConfiguration = {
    ...existing,
    accountingModel: "cash_ledger",
    baseCurrency: "USD",
    updatedAt: new Date().toISOString(),
  };

  if (input.settledCashBase !== undefined) {
    if (input.settledCashBase === null) {
      next.settledCashBase = undefined;
      if (input.settledCashAsOf === undefined) {
        throw new Error(
          "Clearing settledCashBase requires settledCashAsOf: null"
        );
      }
    } else {
      assertFiniteNonNegative(Number(input.settledCashBase), "settledCashBase");
      next.settledCashBase = Number(input.settledCashBase);
      if (input.settledCashAsOf === undefined || input.settledCashAsOf === null) {
        throw new Error(
          "Setting settledCashBase requires a fresh settledCashAsOf"
        );
      }
    }
  }
  if (input.totalEquityBase !== undefined) {
    if (input.totalEquityBase === null) {
      next.totalEquityBase = undefined;
      if (input.totalEquityAsOf === undefined) {
        throw new Error(
          "Clearing totalEquityBase requires totalEquityAsOf: null"
        );
      }
    } else {
      assertFiniteNonNegative(Number(input.totalEquityBase), "totalEquityBase");
      next.totalEquityBase = Number(input.totalEquityBase);
      if (input.totalEquityAsOf === undefined || input.totalEquityAsOf === null) {
        throw new Error(
          "Setting totalEquityBase requires a fresh totalEquityAsOf"
        );
      }
    }
  }
  if (input.liquidityBuffer !== undefined) {
    if (input.liquidityBuffer === null) {
      // Explicit clear — do not coerce to 0.
      next.liquidityBuffer = undefined;
    } else {
      assertFiniteNonNegative(Number(input.liquidityBuffer), "liquidityBuffer");
      next.liquidityBuffer = Number(input.liquidityBuffer);
    }
  }
  if (input.settledCashAsOf !== undefined) {
    next.settledCashAsOf =
      input.settledCashAsOf === null ? undefined : input.settledCashAsOf;
    assertIsoTimestamp(next.settledCashAsOf, "settledCashAsOf");
  }
  if (input.totalEquityAsOf !== undefined) {
    next.totalEquityAsOf =
      input.totalEquityAsOf === null ? undefined : input.totalEquityAsOf;
    assertIsoTimestamp(next.totalEquityAsOf, "totalEquityAsOf");
  }
  if (input.source !== undefined) next.source = input.source;
  if (input.externalCreditsIncludedInCash !== undefined) {
    next.externalCreditsIncludedInCash = input.externalCreditsIncludedInCash;
  }
  if (input.status !== undefined) next.status = input.status;

  assertBalanceAsOfInvariant(next);

  // Never infer cash from equity or equity from cash.
  state.configuration = next;
  await writeCapitalPlannerState(state);
  return next;
}
