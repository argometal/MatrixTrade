import { createSupabaseAdmin } from "@/lib/supabase/server";

let softDeleteSchemaReady: boolean | null = null;
let inboxPrivateColumnReady: boolean | null = null;

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

/** Reset cache (tests only). */
export function resetArgusSoftDeleteSchemaCache(): void {
  softDeleteSchemaReady = null;
  inboxPrivateColumnReady = null;
}
