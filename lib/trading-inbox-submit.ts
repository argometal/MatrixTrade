import { getBridgeConfig } from "./bridge";
import { isSupabaseTradesStore } from "./trades-json";
import {
  createSupabaseInboxItem,
  getSupabaseInboxItem,
  listSupabaseInboxItems,
  setSupabaseInboxStatus,
} from "./trading-inbox-store/supabase";
import {
  createLocalInboxItem,
  getLocalInboxItem,
  listLocalInboxItems,
  setLocalInboxStatus,
} from "./trading-inbox-storage-local";

export type InboxBackend = "worker" | "supabase" | "local";

function isVercelRuntime(): boolean {
  return Boolean(process.env.VERCEL);
}

function isSupabaseInboxStore(): boolean {
  if (isSupabaseTradesStore()) return true;
  if (process.env.VERCEL_ENV === "production") return true;
  return Boolean(
    process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  );
}

export function resolveInboxBackendLabel(): string {
  const { configured } = getBridgeConfig();
  if (configured) return "worker+supabase";
  if (isSupabaseInboxStore()) return "supabase";
  return "local";
}

export async function submitToTradingInbox(
  payload: Record<string, unknown>
): Promise<
  | { ok: true; inboxItemId: string; receivedAt: string; origin: InboxBackend }
  | { ok: false; error: string }
> {
  const body = {
    ...payload,
    source: typeof payload.source === "string" ? payload.source : "ai-block",
  };

  const workerResult = await postBridgeInboxProposal(body);
  if (workerResult.ok) {
    return {
      ok: true,
      inboxItemId: workerResult.id,
      receivedAt: workerResult.receivedAt,
      origin: "worker",
    };
  }

  if (isSupabaseInboxStore()) {
    try {
      const item = await createSupabaseInboxItem(body);
      return {
        ok: true,
        inboxItemId: item.id,
        receivedAt: item.receivedAt,
        origin: "supabase",
      };
    } catch (err) {
      const detail = err instanceof Error ? err.message : "unknown error";
      return {
        ok: false,
        error: `Production inbox unavailable (Supabase). Run supabase/trading-inbox.sql. ${detail}`,
      };
    }
  }

  if (isVercelRuntime()) {
    return {
      ok: false,
      error:
        workerResult.error ??
        "Production inbox unavailable. Configure Worker bridge (BRIDGE_WRITE_TOKEN) or run supabase/trading-inbox.sql.",
    };
  }

  const local = await createLocalInboxItem(body);
  return {
    ok: true,
    inboxItemId: local.id,
    receivedAt: local.receivedAt,
    origin: "local",
  };
}

async function postBridgeInboxProposal(
  payload: Record<string, unknown>
): Promise<
  | { ok: true; id: string; receivedAt: string }
  | { ok: false; error: string; skipped?: boolean }
> {
  const { url, writeToken, configured } = getBridgeConfig();
  if (!configured || !writeToken) {
    return { ok: false, error: "Bridge not configured", skipped: true };
  }

  try {
    const response = await fetch(`${url}/inbox`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${writeToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    if (!response.ok) {
      const text = await response.text();
      return { ok: false, error: `Worker inbox POST failed (${response.status}): ${text}` };
    }

    const data = (await response.json()) as { id?: string; receivedAt?: string };
    if (!data.id) {
      return { ok: false, error: "Worker inbox response missing id" };
    }

    return {
      ok: true,
      id: data.id,
      receivedAt: data.receivedAt ?? new Date().toISOString(),
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Worker inbox request failed",
    };
  }
}

export async function listSupabasePendingInboxItems() {
  if (!isSupabaseInboxStore()) return [];
  try {
    return await listSupabaseInboxItems("pending");
  } catch {
    return [];
  }
}

export async function listPendingInboxForRuntime(
  workerItems: import("./bridge").BridgeInboxItem[]
): Promise<import("./bridge").BridgeInboxItem[]> {
  const [supabase, local] = await Promise.all([
    listSupabasePendingInboxItems(),
    isVercelRuntime() ? Promise.resolve([]) : listLocalInboxItems(),
  ]);
  return [...workerItems, ...supabase, ...local].sort((a, b) =>
    b.receivedAt.localeCompare(a.receivedAt)
  );
}

export async function getInboxItemFromStore(
  id: string,
  origin: string
): Promise<import("./bridge").BridgeInboxItem | undefined> {
  if (origin === "local") return getLocalInboxItem(id);
  if (origin === "supabase") {
    try {
      return await getSupabaseInboxItem(id);
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export async function markInboxItemStatus(
  id: string,
  origin: string,
  status: "applied" | "rejected"
): Promise<boolean> {
  if (origin === "local") return setLocalInboxStatus(id, status);
  if (origin === "supabase") return setSupabaseInboxStatus(id, status);
  return false;
}

export { isSupabaseInboxStore };
