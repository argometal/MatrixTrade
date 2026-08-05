/**
 * Edge-safe guest lock policy read for middleware (Supabase REST + short cache).
 * Cookie remains a fallback when store is unavailable.
 */
import {
  DEFAULT_GUEST_LOCK_POLICY,
  normalizeGuestLockPolicy,
  parseGuestLockPolicy,
  type GuestLockPolicy,
} from "@/lib/auth/guest-workstation-lock";

type CacheEntry = { at: number; policy: GuestLockPolicy };

const CACHE_TTL_MS = 15_000;
let cache: CacheEntry | null = null;

function hasSupabaseEnv(): boolean {
  return Boolean(process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}

async function fetchPolicyFromSupabase(): Promise<GuestLockPolicy | null> {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;

  const endpoint = `${url.replace(/\/$/, "")}/rest/v1/guest_lock_policy_state?id=eq.default&select=payload`;
  const res = await fetch(endpoint, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
    },
    // middleware: avoid Next fetch cache sticking a stale policy forever
    cache: "no-store",
  });

  if (!res.ok) {
    // Table missing / RLS / network — fall back to cookie
    return null;
  }

  const rows = (await res.json()) as Array<{ payload?: unknown }>;
  if (!Array.isArray(rows) || rows.length === 0 || !rows[0]?.payload) {
    return { ...DEFAULT_GUEST_LOCK_POLICY };
  }
  return (
    normalizeGuestLockPolicy(rows[0].payload as Partial<GuestLockPolicy>) ?? {
      ...DEFAULT_GUEST_LOCK_POLICY,
    }
  );
}

/**
 * Resolve account policy for middleware enforcement.
 * Prefer Supabase (cached ~15s); fall back to browser cookie.
 */
export async function resolveGuestLockPolicyForMiddleware(
  cookieRaw: string | undefined
): Promise<GuestLockPolicy> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_TTL_MS) {
    return cache.policy;
  }

  if (hasSupabaseEnv()) {
    try {
      const fromStore = await fetchPolicyFromSupabase();
      if (fromStore) {
        cache = { at: now, policy: fromStore };
        return fromStore;
      }
    } catch {
      // fall through to cookie
    }
  }

  const fromCookie = parseGuestLockPolicy(cookieRaw);
  if (fromCookie) {
    cache = { at: now, policy: fromCookie };
    return fromCookie;
  }

  return { ...DEFAULT_GUEST_LOCK_POLICY };
}

/** Test helper — clear edge cache between cases. */
export function __clearGuestLockPolicyEdgeCache(): void {
  cache = null;
}
