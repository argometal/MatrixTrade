/**
 * Canonical T0 cloud store for TRADES_STORE=supabase*.
 * Prefer relational table; fall back to Storage bucket when SQL not applied.
 * Local JSON is merged on read so historical freezes are never silently lost.
 */

import { createJsonThesisT0Store } from "./json";
import { createSupabaseStorageThesisT0Store } from "./supabase-storage";
import { createSupabaseTableThesisT0Store } from "./supabase-table";
import type { ThesisT0Freeze } from "../thesis-t0-types";
import type { ThesisT0Store } from "./types";

function mergeById(
  primary: ThesisT0Freeze[],
  secondary: ThesisT0Freeze[]
): ThesisT0Freeze[] {
  const map = new Map<string, ThesisT0Freeze>();
  for (const row of secondary) {
    map.set(row.id.toUpperCase(), row);
  }
  for (const row of primary) {
    map.set(row.id.toUpperCase(), row);
  }
  return [...map.values()].sort((a, b) => a.id.localeCompare(b.id));
}

async function resolveCloudStore(): Promise<ThesisT0Store> {
  const table = createSupabaseTableThesisT0Store();
  try {
    await table.readAll();
    return table;
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === "MISSING_TABLE") {
      return createSupabaseStorageThesisT0Store();
    }
    throw err;
  }
}

export function createSupabaseThesisT0Store(): ThesisT0Store {
  let cloud: ThesisT0Store | null = null;
  const local = createJsonThesisT0Store();

  async function getCloud(): Promise<ThesisT0Store> {
    if (!cloud) cloud = await resolveCloudStore();
    return cloud;
  }

  return {
    async readAll() {
      const [cloudRows, localRows] = await Promise.all([
        getCloud().then((s) => s.readAll()),
        local.readAll(),
      ]);
      return mergeById(cloudRows, localRows);
    },
    async getById(id) {
      const c = await getCloud();
      const fromCloud = await c.getById(id);
      if (fromCloud) return fromCloud;
      return local.getById(id);
    },
    async findOpenByStockThesisId(stockThesisId) {
      const c = await getCloud();
      const fromCloud = await c.findOpenByStockThesisId(stockThesisId);
      if (fromCloud) return fromCloud;
      return local.findOpenByStockThesisId(stockThesisId);
    },
    async insert(row) {
      const c = await getCloud();
      await c.insert(row);
      // Lab mirror — never the write authority when cloud is primary.
      try {
        await local.insert(row);
      } catch {
        try {
          await local.upsert(row);
        } catch {
          /* local mirror best-effort */
        }
      }
    },
    async upsert(row) {
      const c = await getCloud();
      await c.upsert(row);
      try {
        await local.upsert(row);
      } catch {
        /* local mirror best-effort */
      }
    },
  };
}
