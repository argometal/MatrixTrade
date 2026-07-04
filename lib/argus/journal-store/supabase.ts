import { createSupabaseAdmin } from "@/lib/supabase/server";
import { migrateToV3 } from "../migrate";
import { normalizeArgusData } from "../normalize";
import type { ArgusData } from "../types";

const JOURNAL_ROW_ID = "primary";

type JournalRow = {
  id: string;
  data: ArgusData;
  updated_at: string;
};

export async function readJournalFromSupabase(): Promise<ArgusData | null> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase.from("argus_journal").select("data").eq("id", JOURNAL_ROW_ID).maybeSingle();
  if (error) throw new Error(`Supabase journal read failed: ${error.message}`);
  if (!data?.data) return null;
  return normalizeArgusData(migrateToV3(data.data));
}

export async function writeJournalToSupabase(data: ArgusData): Promise<void> {
  const supabase = createSupabaseAdmin();
  const payload = {
    id: JOURNAL_ROW_ID,
    data,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from("argus_journal").upsert(payload);
  if (error) throw new Error(`Supabase journal write failed: ${error.message}`);
}

export async function readJournalBackupFromSupabase(): Promise<string | null> {
  const data = await readJournalFromSupabase();
  if (!data) return null;
  return `${JSON.stringify(data, null, 2)}\n`;
}

export async function restoreJournalToSupabase(json: string): Promise<void> {
  const parsed = migrateToV3(JSON.parse(json));
  await writeJournalToSupabase(normalizeArgusData(parsed));
}
