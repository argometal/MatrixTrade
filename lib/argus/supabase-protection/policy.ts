import { isCloudInboxStore } from "../inbox-store/config";
import { isCloudJournalStore } from "../journal-store/config";

/** True when ARGUS user data lives in Supabase tables. */
export function isArgusSupabaseEnabled(): boolean {
  return isCloudInboxStore() || isCloudJournalStore();
}

/** Block delete-all / reset / truncate against Supabase-backed ARGUS data. */
export function isSupabaseDestructiveBlocked(): boolean {
  return isArgusSupabaseEnabled();
}

export function supabaseDestructiveBlockedMessage(): string {
  return (
    "Delete-all and reset are disabled while ARGUS uses Supabase storage. " +
    "User data is soft-deleted only. See supabase/dev/argus-destructive-local-only.sql for local dev."
  );
}
