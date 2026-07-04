export function isCloudInboxStore(): boolean {
  return process.env.ARGUS_INBOX_STORE?.trim().toLowerCase() === "supabase";
}

export const ARGUS_FILES_BUCKET = "argus-files";
