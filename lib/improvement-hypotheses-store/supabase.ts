/**
 * MXT 028 cloud Improvement Hypotheses store.
 *
 * Prefer relational table `public.improvement_hypotheses` (MAF-style).
 * If the table is not yet in schema cache, fall back to Supabase Storage
 * (`mxt-artifacts` / improvement-hypotheses/) — same interim pattern as T0.
 *
 * Run supabase/improvement-hypotheses.sql to enable the relational path.
 */
import { createSupabaseAdmin } from "../supabase/server";
import { assertMxtPersistenceWriteAllowed } from "../mxt-readonly";
import type { ImprovementHypothesis } from "../improvement-hypothesis-types";
import {
  improvementHypothesisRowToRecord,
  improvementHypothesisToRow,
} from "./mapping";
import type { ImprovementHypothesesStore } from "./types";

export const MXT_IH_STORAGE_BUCKET = "mxt-artifacts";
const STORAGE_PREFIX = "improvement-hypotheses";

function objectPath(id: string): string {
  return `${STORAGE_PREFIX}/${id.toUpperCase()}.json`;
}

let tableAvailable: boolean | null = null;

async function isTableAvailable(): Promise<boolean> {
  if (tableAvailable !== null) return tableAvailable;
  const supabase = createSupabaseAdmin();
  const { error } = await supabase
    .from("improvement_hypotheses")
    .select("id")
    .limit(1);
  if (!error) {
    tableAvailable = true;
    return true;
  }
  const msg = String(error.message ?? "");
  if (/does not exist|Could not find the table|schema cache/i.test(msg)) {
    tableAvailable = false;
    return false;
  }
  // Other errors (network) — do not cache; rethrow via callers
  throw new Error(`Supabase improvement_hypotheses probe failed: ${msg}`);
}

async function ensureBucket(): Promise<void> {
  const supabase = createSupabaseAdmin();
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) {
    throw new Error(`Supabase storage listBuckets failed: ${error.message}`);
  }
  if (buckets?.some((b) => b.name === MXT_IH_STORAGE_BUCKET)) return;
  const { error: createError } = await supabase.storage.createBucket(
    MXT_IH_STORAGE_BUCKET,
    { public: false, fileSizeLimit: 2_000_000 }
  );
  if (createError && !/already exists/i.test(createError.message)) {
    throw new Error(
      `Supabase storage createBucket(${MXT_IH_STORAGE_BUCKET}) failed: ${createError.message}`
    );
  }
}

async function readAllFromTable(): Promise<ImprovementHypothesis[]> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("improvement_hypotheses")
    .select("*")
    .order("id");
  if (error) {
    throw new Error(
      `Supabase improvement_hypotheses read failed: ${error.message}`
    );
  }
  return (data ?? []).map((row) =>
    improvementHypothesisRowToRecord(row as never)
  );
}

async function upsertTable(row: ImprovementHypothesis): Promise<void> {
  assertMxtPersistenceWriteAllowed("improvement_hypotheses.upsert");
  const supabase = createSupabaseAdmin();
  const { error } = await supabase
    .from("improvement_hypotheses")
    .upsert(improvementHypothesisToRow(row), { onConflict: "id" });
  if (error) {
    throw new Error(
      `Supabase improvement_hypotheses upsert failed: ${error.message}`
    );
  }
}

async function readAllFromStorage(): Promise<ImprovementHypothesis[]> {
  await ensureBucket();
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase.storage
    .from(MXT_IH_STORAGE_BUCKET)
    .list(STORAGE_PREFIX, { limit: 1000 });
  if (error) {
    throw new Error(
      `Supabase IH storage list failed: ${error.message}`
    );
  }
  const ids = (data ?? [])
    .map((f) => f.name)
    .filter((n) => n.toLowerCase().endsWith(".json"))
    .map((n) => n.replace(/\.json$/i, ""));
  const rows: ImprovementHypothesis[] = [];
  for (const id of ids) {
    const { data: blob, error: dlErr } = await supabase.storage
      .from(MXT_IH_STORAGE_BUCKET)
      .download(objectPath(id));
    if (dlErr) {
      const msg = String(dlErr.message ?? "").toLowerCase();
      if (msg.includes("not found") || msg.includes("404")) continue;
      throw new Error(`Supabase IH storage download failed: ${dlErr.message}`);
    }
    const text = await blob.text();
    rows.push(JSON.parse(text) as ImprovementHypothesis);
  }
  return rows.sort((a, b) => a.id.localeCompare(b.id));
}

async function upsertStorage(row: ImprovementHypothesis): Promise<void> {
  assertMxtPersistenceWriteAllowed("improvement_hypotheses.storage.upsert");
  await ensureBucket();
  const supabase = createSupabaseAdmin();
  const body = JSON.stringify(row, null, 2);
  const { error } = await supabase.storage
    .from(MXT_IH_STORAGE_BUCKET)
    .upload(objectPath(row.id), body, {
      contentType: "application/json",
      upsert: true,
    });
  if (error) {
    throw new Error(`Supabase IH storage upload failed: ${error.message}`);
  }
}

export function createSupabaseImprovementHypothesesStore(): ImprovementHypothesesStore {
  return {
    async readAll() {
      if (await isTableAvailable()) return readAllFromTable();
      return readAllFromStorage();
    },
    async upsert(row) {
      if (await isTableAvailable()) {
        await upsertTable(row);
        return;
      }
      await upsertStorage(row);
    },
  };
}

/** Test helper — reset cached table probe. */
export function __resetImprovementHypothesesTableProbeForTests(): void {
  tableAvailable = null;
}
