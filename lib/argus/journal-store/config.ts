export function isCloudJournalStore(): boolean {
  return process.env.ARGUS_JOURNAL_STORE?.trim().toLowerCase() === "supabase";
}
