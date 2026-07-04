function isVercelRuntime(): boolean {
  return Boolean(process.env.VERCEL);
}

function hasSupabaseCredentials(): boolean {
  return Boolean(process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}

/** Explicit supabase, or auto on Vercel when Supabase credentials are present. */
export function isCloudJournalStore(): boolean {
  const store = process.env.ARGUS_JOURNAL_STORE?.trim().toLowerCase();
  if (store === "supabase") return true;
  if (store === "json" || store === "filesystem" || store === "local") return false;
  if (isVercelRuntime() && hasSupabaseCredentials()) return true;
  return false;
}
