import { hasSupabaseCredentials } from "@/lib/supabase/server";

export function isCloudInboxStore(): boolean {
  if (process.env.ARGUS_INBOX_STORE?.trim().toLowerCase() !== "supabase") return false;
  if (!hasSupabaseCredentials()) {
    console.error(
      "ARGUS_INBOX_STORE=supabase but SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are missing — falling back to local inbox"
    );
    return false;
  }
  return true;
}

export const ARGUS_FILES_BUCKET = "argus-files";
