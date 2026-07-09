import { hasSupabaseCredentials } from "@/lib/supabase/server";

function isVercelRuntime(): boolean {
  return Boolean(process.env.VERCEL);
}

/** Explicit supabase, or auto on Vercel when Supabase credentials are present. */
export function isCloudJournalStore(): boolean {
  const store = process.env.ARGUS_JOURNAL_STORE?.trim().toLowerCase();
  if (store === "supabase") {
    if (!hasSupabaseCredentials()) {
      console.error(
        "ARGUS_JOURNAL_STORE=supabase but SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are missing — falling back to local journal"
      );
      return false;
    }
    return true;
  }
  if (store === "json" || store === "filesystem" || store === "local") return false;
  if (isVercelRuntime() && hasSupabaseCredentials()) return true;
  return false;
}
