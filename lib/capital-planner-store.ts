/**
 * Capital Planner persistence — configuration, ledger, reservations.
 * Modes: memory (tests) | json (local) | supabase (prod when wired).
 */
import { promises as fs } from "fs";
import path from "path";
import { isSupabaseMatrixStore } from "./trades-json";
import type {
  CapitalConfiguration,
  CapitalLedgerEvent,
  CapitalReservation,
} from "./capital-types";

export type CapitalPlannerState = {
  configuration: CapitalConfiguration | null;
  ledgerEvents: CapitalLedgerEvent[];
  reservations: CapitalReservation[];
};

export type CapitalPlannerStore = {
  read(): Promise<CapitalPlannerState>;
  write(state: CapitalPlannerState): Promise<void>;
};

const EMPTY: CapitalPlannerState = {
  configuration: null,
  ledgerEvents: [],
  reservations: [],
};

const JSON_PATH = path.join(process.cwd(), "data", "capital-planner.json");

let writeChain: Promise<void> = Promise.resolve();
let cachedStore: CapitalPlannerStore | null = null;
let testPinned = false;

function cloneState(state: CapitalPlannerState): CapitalPlannerState {
  return {
    configuration: state.configuration
      ? { ...state.configuration }
      : null,
    ledgerEvents: state.ledgerEvents.map((e) => ({ ...e })),
    reservations: state.reservations.map((r) => ({
      ...r,
      blockingReasons: [...r.blockingReasons],
    })),
  };
}

export function createMemoryCapitalPlannerStore(
  seed: CapitalPlannerState = EMPTY
): CapitalPlannerStore & { state: CapitalPlannerState } {
  const state = cloneState(seed);
  return {
    state,
    async read() {
      return cloneState(state);
    },
    async write(next) {
      state.configuration = next.configuration
        ? { ...next.configuration }
        : null;
      state.ledgerEvents = next.ledgerEvents.map((e) => ({ ...e }));
      state.reservations = next.reservations.map((r) => ({
        ...r,
        blockingReasons: [...r.blockingReasons],
      }));
    },
  };
}

function createJsonCapitalPlannerStore(): CapitalPlannerStore {
  return {
    async read() {
      try {
        const raw = await fs.readFile(JSON_PATH, "utf-8");
        const parsed = JSON.parse(raw) as CapitalPlannerState;
        return {
          configuration: parsed.configuration ?? null,
          ledgerEvents: Array.isArray(parsed.ledgerEvents)
            ? parsed.ledgerEvents
            : [],
          reservations: Array.isArray(parsed.reservations)
            ? parsed.reservations
            : [],
        };
      } catch (err) {
        const code = (err as NodeJS.ErrnoException).code;
        if (code === "ENOENT") return cloneState(EMPTY);
        throw err;
      }
    },
    async write(state) {
      if (process.env.VERCEL || process.env.VERCEL_ENV) {
        throw new Error(
          "Capital Planner JSON store cannot write on Vercel. Use Supabase capital_planner tables."
        );
      }
      const run = writeChain.then(async () => {
        await fs.mkdir(path.dirname(JSON_PATH), { recursive: true });
        await fs.writeFile(
          JSON_PATH,
          `${JSON.stringify(cloneState(state), null, 2)}\n`,
          "utf-8"
        );
      });
      writeChain = run.then(
        () => undefined,
        () => undefined
      );
      await run;
    },
  };
}

/**
 * Supabase backend: single-row JSON document in capital_planner_state.
 * Falls back to empty if table missing (non-destructive).
 */
function createSupabaseCapitalPlannerStore(): CapitalPlannerStore {
  return {
    async read() {
      const { createSupabaseAdmin } = await import("./supabase/server");
      const supabase = createSupabaseAdmin();
      const { data, error } = await supabase
        .from("capital_planner_state")
        .select("payload")
        .eq("id", "default")
        .maybeSingle();
      if (error) {
        throw new Error(
          `Supabase capital_planner_state read failed: ${error.message}`
        );
      }
      if (!data?.payload) return cloneState(EMPTY);
      const parsed = data.payload as CapitalPlannerState;
      return {
        configuration: parsed.configuration ?? null,
        ledgerEvents: Array.isArray(parsed.ledgerEvents)
          ? parsed.ledgerEvents
          : [],
        reservations: Array.isArray(parsed.reservations)
          ? parsed.reservations
          : [],
      };
    },
    async write(state) {
      const { createSupabaseAdmin } = await import("./supabase/server");
      const supabase = createSupabaseAdmin();
      const { error } = await supabase.from("capital_planner_state").upsert(
        {
          id: "default",
          payload: cloneState(state),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );
      if (error) {
        throw new Error(
          `Supabase capital_planner_state write failed: ${error.message}`
        );
      }
    },
  };
}

function resolveMode(): "memory" | "json" | "supabase" {
  const forced = process.env.CAPITAL_PLANNER_STORE?.trim().toLowerCase();
  if (forced === "memory") {
    if (process.env.NODE_ENV !== "test") {
      throw new Error("CAPITAL_PLANNER_STORE=memory is allowed only in tests.");
    }
    return "memory";
  }
  if (forced === "json") return "json";
  if (forced === "supabase") return "supabase";
  if (isSupabaseMatrixStore()) return "supabase";
  if (process.env.VERCEL || process.env.VERCEL_ENV) return "supabase";
  return "json";
}

export function getCapitalPlannerStore(): CapitalPlannerStore {
  if (testPinned && cachedStore) return cachedStore;
  if (cachedStore) return cachedStore;
  const mode = resolveMode();
  if (mode === "memory") cachedStore = createMemoryCapitalPlannerStore();
  else if (mode === "supabase")
    cachedStore = createSupabaseCapitalPlannerStore();
  else cachedStore = createJsonCapitalPlannerStore();
  return cachedStore;
}

export function __setCapitalPlannerStoreForTests(
  seedOrStore: CapitalPlannerState | CapitalPlannerStore | null
): void {
  if (seedOrStore === null) {
    cachedStore = null;
    testPinned = false;
    return;
  }
  if (
    typeof seedOrStore === "object" &&
    "read" in seedOrStore &&
    "write" in seedOrStore
  ) {
    cachedStore = seedOrStore;
    testPinned = true;
    return;
  }
  cachedStore = createMemoryCapitalPlannerStore(seedOrStore);
  testPinned = true;
}

export async function readCapitalPlannerState(): Promise<CapitalPlannerState> {
  return getCapitalPlannerStore().read();
}

export async function writeCapitalPlannerState(
  state: CapitalPlannerState
): Promise<void> {
  await getCapitalPlannerStore().write(state);
}

export const CAPITAL_PLANNER_JSON_PATH = JSON_PATH;
