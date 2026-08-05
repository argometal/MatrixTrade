/**
 * Guest workstation lock policy — account-wide persistence.
 * Modes: memory (tests) | json (local) | supabase (prod).
 */
import { promises as fs } from "fs";
import path from "path";
import { isSupabaseMatrixStore } from "./trades-json";
import {
  DEFAULT_GUEST_LOCK_POLICY,
  normalizeGuestLockPolicy,
  type GuestLockPolicy,
} from "@/lib/auth/guest-workstation-lock";

export type GuestLockPolicyStore = {
  read(): Promise<GuestLockPolicy>;
  write(policy: GuestLockPolicy): Promise<void>;
};

const JSON_PATH = path.join(process.cwd(), "data", "guest-lock-policy.json");

let writeChain: Promise<void> = Promise.resolve();
let cachedStore: GuestLockPolicyStore | null = null;
let testPinned = false;

function clonePolicy(policy: GuestLockPolicy): GuestLockPolicy {
  return {
    enabled: policy.enabled,
    hours: policy.hours,
    dateFrom: policy.dateFrom,
    dateTo: policy.dateTo,
    dailyStart: policy.dailyStart,
    dailyEnd: policy.dailyEnd,
    indefinite: policy.indefinite,
  };
}

export function createMemoryGuestLockPolicyStore(
  seed: GuestLockPolicy = DEFAULT_GUEST_LOCK_POLICY
): GuestLockPolicyStore & { state: GuestLockPolicy } {
  const state = clonePolicy(seed);
  return {
    state,
    async read() {
      return clonePolicy(state);
    },
    async write(next) {
      Object.assign(state, clonePolicy(next));
    },
  };
}

function createJsonGuestLockPolicyStore(): GuestLockPolicyStore {
  return {
    async read() {
      try {
        const raw = await fs.readFile(JSON_PATH, "utf-8");
        const parsed = normalizeGuestLockPolicy(JSON.parse(raw) as Partial<GuestLockPolicy>);
        return parsed ?? { ...DEFAULT_GUEST_LOCK_POLICY };
      } catch (err) {
        const code = (err as NodeJS.ErrnoException).code;
        if (code === "ENOENT") return { ...DEFAULT_GUEST_LOCK_POLICY };
        throw err;
      }
    },
    async write(policy) {
      if (process.env.VERCEL || process.env.VERCEL_ENV) {
        throw new Error(
          "Guest lock JSON store cannot write on Vercel. Use Supabase guest_lock_policy_state."
        );
      }
      const run = writeChain.then(async () => {
        await fs.mkdir(path.dirname(JSON_PATH), { recursive: true });
        await fs.writeFile(JSON_PATH, `${JSON.stringify(clonePolicy(policy), null, 2)}\n`, "utf-8");
      });
      writeChain = run.then(
        () => undefined,
        () => undefined
      );
      await run;
    },
  };
}

function createSupabaseGuestLockPolicyStore(): GuestLockPolicyStore {
  return {
    async read() {
      const { createSupabaseAdmin } = await import("./supabase/server");
      const supabase = createSupabaseAdmin();
      const { data, error } = await supabase
        .from("guest_lock_policy_state")
        .select("payload")
        .eq("id", "default")
        .maybeSingle();
      if (error) {
        throw new Error(`Supabase guest_lock_policy_state read failed: ${error.message}`);
      }
      if (!data?.payload) return { ...DEFAULT_GUEST_LOCK_POLICY };
      return (
        normalizeGuestLockPolicy(data.payload as Partial<GuestLockPolicy>) ?? {
          ...DEFAULT_GUEST_LOCK_POLICY,
        }
      );
    },
    async write(policy) {
      const { createSupabaseAdmin } = await import("./supabase/server");
      const supabase = createSupabaseAdmin();
      const { error } = await supabase.from("guest_lock_policy_state").upsert(
        {
          id: "default",
          payload: clonePolicy(policy),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );
      if (error) {
        throw new Error(`Supabase guest_lock_policy_state write failed: ${error.message}`);
      }
    },
  };
}

function resolveMode(): "memory" | "json" | "supabase" {
  const forced = process.env.GUEST_LOCK_STORE?.trim().toLowerCase();
  if (forced === "memory") {
    if (process.env.NODE_ENV !== "test") {
      throw new Error("GUEST_LOCK_STORE=memory is allowed only in tests.");
    }
    return "memory";
  }
  if (forced === "json") return "json";
  if (forced === "supabase") return "supabase";
  if (isSupabaseMatrixStore()) return "supabase";
  if (process.env.VERCEL || process.env.VERCEL_ENV) return "supabase";
  return "json";
}

export function getGuestLockPolicyStore(): GuestLockPolicyStore {
  if (testPinned && cachedStore) return cachedStore;
  if (cachedStore) return cachedStore;
  const mode = resolveMode();
  if (mode === "memory") cachedStore = createMemoryGuestLockPolicyStore();
  else if (mode === "supabase") cachedStore = createSupabaseGuestLockPolicyStore();
  else cachedStore = createJsonGuestLockPolicyStore();
  return cachedStore;
}

export function __setGuestLockPolicyStoreForTests(
  seedOrStore: GuestLockPolicy | GuestLockPolicyStore | null
): void {
  if (seedOrStore === null) {
    cachedStore = null;
    testPinned = false;
    return;
  }
  if (typeof seedOrStore === "object" && "read" in seedOrStore && "write" in seedOrStore) {
    cachedStore = seedOrStore;
    testPinned = true;
    return;
  }
  cachedStore = createMemoryGuestLockPolicyStore(seedOrStore);
  testPinned = true;
}

export async function readGuestLockPolicyFromStore(): Promise<GuestLockPolicy> {
  return getGuestLockPolicyStore().read();
}

export async function writeGuestLockPolicyToStore(policy: GuestLockPolicy): Promise<void> {
  await getGuestLockPolicyStore().write(policy);
}

export const GUEST_LOCK_POLICY_JSON_PATH = JSON_PATH;
