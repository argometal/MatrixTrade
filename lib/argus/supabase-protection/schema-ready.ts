import { createSupabaseAdmin } from "@/lib/supabase/server";

let softDeleteSchemaReady: boolean | null = null;
let inboxPrivateColumnReady: boolean | null = null;
let inboxTriageColumnsReady: boolean | null = null;

/** True after supabase/argus-protection.sql has been applied (deleted_at columns exist). */
export async function isArgusSoftDeleteSchemaReady(): Promise<boolean> {
  if (softDeleteSchemaReady !== null) return softDeleteSchemaReady;

  try {
    const supabase = createSupabaseAdmin();
    const { error } = await supabase.from("argus_inbox_items").select("deleted_at").limit(1);
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("deleted_at") || error.code === "42703") {
        softDeleteSchemaReady = false;
        return false;
      }
      throw error;
    }
    softDeleteSchemaReady = true;
  } catch {
    softDeleteSchemaReady = false;
  }
  return softDeleteSchemaReady;
}

/** True when argus_inbox_items.private exists (supabase/argus-setup.sql). */
export async function isArgusInboxPrivateColumnReady(): Promise<boolean> {
  if (inboxPrivateColumnReady !== null) return inboxPrivateColumnReady;

  try {
    const supabase = createSupabaseAdmin();
    const { error } = await supabase.from("argus_inbox_items").select("private").limit(1);
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("private") || error.code === "42703") {
        inboxPrivateColumnReady = false;
        return false;
      }
      throw error;
    }
    inboxPrivateColumnReady = true;
  } catch {
    inboxPrivateColumnReady = false;
  }
  return inboxPrivateColumnReady;
}

/** True when argus_inbox_items.follow_up_date and topics exist (supabase/argus-inbox-triage.sql). */
export async function isArgusInboxTriageColumnsReady(): Promise<boolean> {
  if (inboxTriageColumnsReady !== null) return inboxTriageColumnsReady;

  try {
    const supabase = createSupabaseAdmin();
    const { error } = await supabase.from("argus_inbox_items").select("follow_up_date, topics").limit(1);
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("follow_up_date") || msg.includes("topics") || error.code === "42703") {
        inboxTriageColumnsReady = false;
        return false;
      }
      throw error;
    }
    inboxTriageColumnsReady = true;
  } catch {
    inboxTriageColumnsReady = false;
  }
  return inboxTriageColumnsReady;
}

/** Reset cache (tests only). */
export function resetArgusSoftDeleteSchemaCache(): void {
  softDeleteSchemaReady = null;
  inboxPrivateColumnReady = null;
  inboxTriageColumnsReady = null;
}
