import { createSupabaseAdmin } from "../supabase/server";
import type { BridgeInboxItem } from "../bridge";

interface InboxRow {
  id: string;
  received_at: string;
  status: string;
  payload: Record<string, unknown>;
  source: string | null;
}

function rowToItem(row: InboxRow): BridgeInboxItem {
  return {
    id: row.id,
    receivedAt: row.received_at,
    status: row.status as BridgeInboxItem["status"],
    payload: row.payload ?? {},
    origin: "supabase",
  };
}

export async function listSupabaseInboxItems(
  status: "pending" | "applied" | "rejected" = "pending"
): Promise<BridgeInboxItem[]> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("trading_inbox")
    .select("*")
    .eq("status", status)
    .order("received_at", { ascending: false });

  if (error) {
    throw new Error(`Supabase trading_inbox read failed: ${error.message}`);
  }

  return (data as InboxRow[]).map(rowToItem);
}

export async function createSupabaseInboxItem(
  payload: Record<string, unknown>
): Promise<BridgeInboxItem> {
  const supabase = createSupabaseAdmin();
  const source = typeof payload.source === "string" ? payload.source : "ai-block";
  const { data, error } = await supabase
    .from("trading_inbox")
    .insert({
      payload,
      source,
      status: "pending",
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Supabase trading_inbox insert failed: ${error?.message ?? "unknown"}`);
  }

  return rowToItem(data as InboxRow);
}

export async function getSupabaseInboxItem(id: string): Promise<BridgeInboxItem | undefined> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase.from("trading_inbox").select("*").eq("id", id).maybeSingle();

  if (error) {
    throw new Error(`Supabase trading_inbox read failed: ${error.message}`);
  }
  if (!data) return undefined;
  return rowToItem(data as InboxRow);
}

/** IDs that exist in trading_inbox but are no longer pending (applied|rejected). */
export async function listSupabaseResolvedInboxIds(
  ids: string[]
): Promise<Set<string>> {
  const unique = [...new Set(ids.map((id) => String(id).trim()).filter(Boolean))];
  if (!unique.length) return new Set();

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("trading_inbox")
    .select("id, status")
    .in("id", unique)
    .neq("status", "pending");

  if (error) {
    throw new Error(`Supabase trading_inbox status read failed: ${error.message}`);
  }

  return new Set((data ?? []).map((row) => String((row as { id: string }).id)));
}

export async function setSupabaseInboxStatus(
  id: string,
  status: "applied" | "rejected",
  options?: { onlyIfPending?: boolean }
): Promise<boolean> {
  const supabase = createSupabaseAdmin();
  let query = supabase.from("trading_inbox").update({ status }).eq("id", id);
  if (options?.onlyIfPending) {
    query = query.eq("status", "pending");
  }
  const { data, error } = await query.select("id").maybeSingle();
  if (error) {
    throw new Error(`Supabase trading_inbox update failed: ${error.message}`);
  }
  return Boolean(data);
}
