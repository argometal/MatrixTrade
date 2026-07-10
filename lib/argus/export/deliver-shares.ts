import { randomBytes } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { getArgusStoragePaths } from "../storage/paths";

export type DeliverShareRecord = {
  token: string;
  scopeName: string;
  scopeType: string;
  preparerName: string;
  createdAt: string;
  expiresAt: string;
  html: string;
};

const SHARE_TTL_DAYS = 30;

function sharesDir(): string {
  return path.join(getArgusStoragePaths().metaDir, "deliver-shares");
}

function shareFilePath(token: string): string {
  return path.join(sharesDir(), `${token}.json`);
}

export function generateShareToken(): string {
  return randomBytes(24).toString("base64url");
}

export async function saveDeliverShare(record: Omit<DeliverShareRecord, "expiresAt"> & { expiresAt?: string }): Promise<DeliverShareRecord> {
  const dir = sharesDir();
  await mkdir(dir, { recursive: true });
  const expiresAt =
    record.expiresAt ??
    new Date(Date.now() + SHARE_TTL_DAYS * 86400000).toISOString();
  const full: DeliverShareRecord = { ...record, expiresAt };
  await writeFile(shareFilePath(record.token), JSON.stringify(full, null, 2), "utf8");
  return full;
}

export async function loadDeliverShare(token: string): Promise<DeliverShareRecord | null> {
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) return null;
  try {
    const raw = await readFile(shareFilePath(token), "utf8");
    const parsed = JSON.parse(raw) as DeliverShareRecord;
    if (!parsed.html || !parsed.expiresAt) return null;
    if (Date.parse(parsed.expiresAt) < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}
