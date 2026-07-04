import { createSupabaseAdmin } from "@/lib/supabase/server";
import { ARGUS_FILES_BUCKET } from "../inbox-store/config";

export async function uploadJournalAttachmentBytes(id: string, bytes: Buffer, mimeType: string): Promise<void> {
  const supabase = createSupabaseAdmin();
  const { error } = await supabase.storage.from(ARGUS_FILES_BUCKET).upload(id, bytes, {
    contentType: mimeType || "application/octet-stream",
    upsert: true,
  });
  if (error) throw new Error(`Supabase journal attachment upload failed: ${error.message}`);
}

export async function readJournalAttachmentBytes(id: string): Promise<Buffer | null> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase.storage.from(ARGUS_FILES_BUCKET).download(id);
  if (error || !data) return null;
  return Buffer.from(await data.arrayBuffer());
}

export async function removeJournalAttachmentBytes(id: string): Promise<void> {
  const supabase = createSupabaseAdmin();
  await supabase.storage.from(ARGUS_FILES_BUCKET).remove([id]);
}
