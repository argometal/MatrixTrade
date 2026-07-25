/**
 * CHANGE 24-1C — IndexedDB binary asset store for Chaos builder.
 * Blobs only — metadata lives in AF03 repo state.
 */

import { AF03_CHAOS_ASSETS_DB, AF03_CHAOS_ASSETS_STORE } from "./af03-builder-types";

export type ChaosAssetRecord = {
  id: string;
  blob: Blob;
  mimeType: string;
  filename: string;
  createdAt: string;
};

export type ChaosAssetsAvailability =
  | { ok: true }
  | { ok: false; reason: string };

function canUseIdb(): boolean {
  return typeof window !== "undefined" && typeof indexedDB !== "undefined";
}

export function chaosAssetsAvailability(): ChaosAssetsAvailability {
  if (!canUseIdb()) {
    return { ok: false, reason: "IndexedDB unavailable in this environment" };
  }
  return { ok: true };
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!canUseIdb()) {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(AF03_CHAOS_ASSETS_DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(AF03_CHAOS_ASSETS_STORE)) {
        db.createObjectStore(AF03_CHAOS_ASSETS_STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB transaction failed"));
    tx.onabort = () => reject(tx.error ?? new Error("IndexedDB transaction aborted"));
  });
}

export async function putAsset(
  id: string,
  blob: Blob,
  meta: { mimeType: string; filename: string; createdAt?: string }
): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction(AF03_CHAOS_ASSETS_STORE, "readwrite");
    const store = tx.objectStore(AF03_CHAOS_ASSETS_STORE);
    const record: ChaosAssetRecord = {
      id,
      blob,
      mimeType: meta.mimeType,
      filename: meta.filename,
      createdAt: meta.createdAt ?? new Date().toISOString(),
    };
    store.put(record);
    await txDone(tx);
  } finally {
    db.close();
  }
}

export async function getAsset(assetId: string): Promise<ChaosAssetRecord | null> {
  const db = await openDb();
  try {
    const tx = db.transaction(AF03_CHAOS_ASSETS_STORE, "readonly");
    const store = tx.objectStore(AF03_CHAOS_ASSETS_STORE);
    const record = await new Promise<ChaosAssetRecord | null>((resolve, reject) => {
      const req = store.get(assetId);
      req.onsuccess = () => resolve((req.result as ChaosAssetRecord | undefined) ?? null);
      req.onerror = () => reject(req.error ?? new Error("IndexedDB get failed"));
    });
    await txDone(tx);
    return record;
  } finally {
    db.close();
  }
}

export async function hasAsset(assetId: string): Promise<boolean> {
  const row = await getAsset(assetId);
  return row != null;
}

export async function deleteAsset(assetId: string): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction(AF03_CHAOS_ASSETS_STORE, "readwrite");
    tx.objectStore(AF03_CHAOS_ASSETS_STORE).delete(assetId);
    await txDone(tx);
  } finally {
    db.close();
  }
}

export async function createObjectUrl(assetId: string): Promise<string | null> {
  const row = await getAsset(assetId);
  if (!row) return null;
  return URL.createObjectURL(row.blob);
}

export function revokeObjectUrl(url: string): void {
  try {
    URL.revokeObjectURL(url);
  } catch {
    /* ignore */
  }
}
