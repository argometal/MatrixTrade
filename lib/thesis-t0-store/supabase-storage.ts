/**
 * Canonical cloud T0 persistence via Supabase Storage when the relational
 * table has not been applied yet (non-destructive interim).
 * Bucket: mxt-artifacts · prefix: thesis-t0-freezes/
 * Does not fabricate historical freezes. Append/upsert only.
 */

import { createSupabaseAdmin } from "../supabase/server";
import { assertMxtPersistenceWriteAllowed } from "../mxt-readonly";
import type { ThesisT0Freeze } from "../thesis-t0-types";
import type { ThesisT0Store } from "./types";

export const MXT_T0_STORAGE_BUCKET = "mxt-artifacts";
const PREFIX = "thesis-t0-freezes";

function objectPath(id: string): string {
  return `${PREFIX}/${id.toUpperCase()}.json`;
}

async function ensureBucket(): Promise<void> {
  const supabase = createSupabaseAdmin();
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) {
    throw new Error(`Supabase storage listBuckets failed: ${error.message}`);
  }
  if (buckets?.some((b) => b.name === MXT_T0_STORAGE_BUCKET)) return;
  const { error: createError } = await supabase.storage.createBucket(
    MXT_T0_STORAGE_BUCKET,
    { public: false, fileSizeLimit: 5_000_000 }
  );
  if (createError && !/already exists/i.test(createError.message)) {
    throw new Error(
      `Supabase storage createBucket(${MXT_T0_STORAGE_BUCKET}) failed: ${createError.message}`
    );
  }
}

async function listFreezeIds(): Promise<string[]> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase.storage
    .from(MXT_T0_STORAGE_BUCKET)
    .list(PREFIX, { limit: 1000 });
  if (error) {
    throw new Error(`Supabase T0 storage list failed: ${error.message}`);
  }
  return (data ?? [])
    .map((f) => f.name)
    .filter((n) => n.toLowerCase().endsWith(".json"))
    .map((n) => n.replace(/\.json$/i, ""));
}

async function downloadFreeze(id: string): Promise<ThesisT0Freeze | null> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase.storage
    .from(MXT_T0_STORAGE_BUCKET)
    .download(objectPath(id));
  if (error) {
    const msg = String(error.message ?? "").toLowerCase();
    if (msg.includes("not found") || msg.includes("404")) return null;
    throw new Error(`Supabase T0 storage download failed: ${error.message}`);
  }
  const text = await data.text();
  return JSON.parse(text) as ThesisT0Freeze;
}

export function createSupabaseStorageThesisT0Store(): ThesisT0Store {
  return {
    async readAll() {
      await ensureBucket();
      const ids = await listFreezeIds();
      const rows: ThesisT0Freeze[] = [];
      for (const id of ids) {
        const row = await downloadFreeze(id);
        if (row) rows.push(row);
      }
      return rows.sort((a, b) => a.id.localeCompare(b.id));
    },
    async getById(id) {
      await ensureBucket();
      return downloadFreeze(id);
    },
    async findOpenByStockThesisId(stockThesisId) {
      const all = await this.readAll();
      const key = stockThesisId.toUpperCase();
      return (
        all.find(
          (r) =>
            r.status === "open" && r.stockThesisId.toUpperCase() === key
        ) ?? null
      );
    },
    async insert(row) {
      assertMxtPersistenceWriteAllowed("thesis_t0_storage.insert");
      await ensureBucket();
      const existing = await downloadFreeze(row.id);
      if (existing) {
        throw new Error(`Thesis T0 freeze already exists: ${row.id}`);
      }
      const supabase = createSupabaseAdmin();
      const { error } = await supabase.storage
        .from(MXT_T0_STORAGE_BUCKET)
        .upload(objectPath(row.id), JSON.stringify(row), {
          contentType: "application/json",
          upsert: false,
        });
      if (error) {
        throw new Error(`Supabase T0 storage insert failed: ${error.message}`);
      }
    },
    async upsert(row) {
      assertMxtPersistenceWriteAllowed("thesis_t0_storage.upsert");
      await ensureBucket();
      const supabase = createSupabaseAdmin();
      const { error } = await supabase.storage
        .from(MXT_T0_STORAGE_BUCKET)
        .upload(objectPath(row.id), JSON.stringify(row), {
          contentType: "application/json",
          upsert: true,
        });
      if (error) {
        throw new Error(`Supabase T0 storage upsert failed: ${error.message}`);
      }
    },
  };
}
