import { promises as fs } from "fs";
import path from "path";
import { isVercelRuntime } from "../data-safety/policy";
import { isCloudInboxStore, ARGUS_FILES_BUCKET } from "../inbox-store/config";
import { isCloudJournalStore } from "../journal-store/config";
import { ensureArgusStorageReady, getArgusStoragePaths } from "./index";

export type QuotaGaugeStatus = "ok" | "warn" | "critical" | "unavailable";

export interface StorageQuotaGauge {
  label: string;
  usedBytes: number;
  limitBytes: number | null;
  percent: number | null;
  status: QuotaGaugeStatus;
  detail: string;
  fileCount?: number;
  estimated?: boolean;
}

export interface VercelRuntimeInfo {
  isVercel: boolean;
  vercelEnv?: string;
  detail: string;
}

export interface ArgusStorageQuotaReport {
  checkedAt: string;
  local: StorageQuotaGauge;
  supabaseDb: StorageQuotaGauge;
  supabaseStorage: StorageQuotaGauge;
  vercel: VercelRuntimeInfo;
}

const DEFAULT_DB_LIMIT_MB = 500;
const DEFAULT_STORAGE_LIMIT_MB = 1024;
const LIST_PAGE_SIZE = 1000;

function parseMbLimit(envValue: string | undefined, fallback: number): number {
  const parsed = Number(envValue?.trim());
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function mbToBytes(mb: number): number {
  return Math.round(mb * 1024 * 1024);
}

function gaugeFromUsedLimit(usedBytes: number, limitBytes: number | null): Pick<StorageQuotaGauge, "percent" | "status"> {
  if (limitBytes === null || limitBytes <= 0) {
    return { percent: null, status: "ok" };
  }
  const percent = Math.min(100, Math.round((usedBytes / limitBytes) * 100));
  if (percent >= 90) return { percent, status: "critical" };
  if (percent >= 75) return { percent, status: "warn" };
  return { percent, status: "ok" };
}

function hasSupabaseCredentials(): boolean {
  return Boolean(process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}

function isFullyCloudBacked(): boolean {
  return isCloudJournalStore() && isCloudInboxStore();
}

async function getFileSizeIfExists(filePath: string): Promise<number> {
  try {
    const stat = await fs.stat(filePath);
    return stat.isFile() ? stat.size : 0;
  } catch {
    return 0;
  }
}

async function sumDirBytes(dir: string): Promise<{ bytes: number; fileCount: number }> {
  let bytes = 0;
  let fileCount = 0;
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const sub = await sumDirBytes(full);
        bytes += sub.bytes;
        fileCount += sub.fileCount;
      } else if (entry.isFile()) {
        const stat = await fs.stat(full);
        bytes += stat.size;
        fileCount += 1;
      }
    }
  } catch {
    /* directory may not exist */
  }
  return { bytes, fileCount };
}

async function measureLocalStorage(): Promise<StorageQuotaGauge> {
  const limitMb = process.env.ARGUS_LOCAL_LIMIT_MB?.trim();
  const limitBytes = limitMb ? mbToBytes(parseMbLimit(limitMb, 0)) : null;
  const label = "Local disk";

  if (isFullyCloudBacked()) {
    return {
      label,
      usedBytes: 0,
      limitBytes,
      percent: null,
      status: "unavailable",
      detail: "Primary storage is Supabase — local paths are not authoritative",
    };
  }

  try {
    await ensureArgusStorageReady();
    const paths = getArgusStoragePaths();
    const journalBytes = await getFileSizeIfExists(paths.journalFile);
    const files = await sumDirBytes(paths.filesDir);
    const usedBytes = journalBytes + files.bytes;
    const fileCount = files.fileCount + (journalBytes > 0 ? 1 : 0);
    const { percent, status } = gaugeFromUsedLimit(usedBytes, limitBytes);

    return {
      label,
      usedBytes,
      limitBytes,
      percent,
      status,
      detail: paths.root,
      fileCount,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Local measurement failed";
    return {
      label,
      usedBytes: 0,
      limitBytes,
      percent: null,
      status: "unavailable",
      detail: message,
    };
  }
}

async function measureDbViaRpc(supabase: ReturnType<typeof import("@/lib/supabase/server").createSupabaseAdmin>): Promise<number | null> {
  const { data, error } = await supabase.rpc("argus_db_bytes");
  if (error || data === null || data === undefined) return null;
  const bytes = Number(data);
  return Number.isFinite(bytes) && bytes >= 0 ? bytes : null;
}

type PgQueryClient = {
  connect(): Promise<void>;
  query(sql: string): Promise<{ rows: Array<{ bytes?: string | number }> }>;
  end(): Promise<void>;
};

async function measureDbViaDatabaseUrl(): Promise<number | null> {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) return null;

  try {
    const pgModule = require("pg") as { Client: new (config: { connectionString: string }) => PgQueryClient };
    const client = new pgModule.Client({ connectionString: databaseUrl });
    await client.connect();
    try {
      const result = await client.query(
        `select coalesce(sum(pg_total_relation_size(quote_ident(schemaname)||'.'||quote_ident(tablename))), 0)::bigint as bytes
         from pg_tables where schemaname = 'public' and tablename like 'argus_%'`
      );
      const bytes = Number(result.rows[0]?.bytes ?? 0);
      return Number.isFinite(bytes) && bytes >= 0 ? bytes : null;
    } finally {
      await client.end();
    }
  } catch {
    return null;
  }
}

function textByteLength(value: unknown): number {
  if (typeof value !== "string") return 0;
  return Buffer.byteLength(value, "utf8");
}

async function estimateDbBytesViaSelect(
  supabase: ReturnType<typeof import("@/lib/supabase/server").createSupabaseAdmin>
): Promise<{ bytes: number; detail: string }> {
  let bytes = 0;

  const { data: journalRows, error: journalError } = await supabase
    .from("argus_journal")
    .select("data")
    .is("deleted_at", null);

  if (journalError) throw new Error(journalError.message);

  for (const row of journalRows ?? []) {
    if (row.data === null || row.data === undefined) continue;
    bytes += Buffer.byteLength(JSON.stringify(row.data), "utf8");
  }

  const { data: inboxRows, error: inboxError } = await supabase
    .from("argus_inbox_items")
    .select("raw_text, raw_email, subject, from_address, to_address")
    .is("deleted_at", null);

  if (inboxError) throw new Error(inboxError.message);

  for (const row of inboxRows ?? []) {
    bytes += textByteLength(row.raw_text);
    bytes += textByteLength(row.raw_email);
    bytes += textByteLength(row.subject);
    bytes += textByteLength(row.from_address);
    bytes += textByteLength(row.to_address);
  }

  const { data: attachmentRows, error: attachmentError } = await supabase
    .from("argus_attachments")
    .select("file_name, mime_type, storage_key")
    .is("deleted_at", null);

  if (attachmentError) throw new Error(attachmentError.message);

  for (const row of attachmentRows ?? []) {
    bytes += textByteLength(row.file_name);
    bytes += textByteLength(row.mime_type);
    bytes += textByteLength(row.storage_key);
  }

  return {
    bytes,
    detail: "Estimated from row payloads (indexes and overhead not included)",
  };
}

async function measureSupabaseDatabase(): Promise<StorageQuotaGauge> {
  const limitBytes = mbToBytes(parseMbLimit(process.env.SUPABASE_DB_LIMIT_MB, DEFAULT_DB_LIMIT_MB));
  const label = "Supabase database";

  if (!hasSupabaseCredentials()) {
    return {
      label,
      usedBytes: 0,
      limitBytes,
      percent: null,
      status: "unavailable",
      detail: "SUPABASE_URL or service key missing",
    };
  }

  try {
    const { createSupabaseAdmin } = await import("@/lib/supabase/server");
    const supabase = createSupabaseAdmin();

    let usedBytes: number | null = await measureDbViaRpc(supabase);
    let detail = "Measured via argus_db_bytes()";
    let estimated = false;

    if (usedBytes === null) {
      usedBytes = await measureDbViaDatabaseUrl();
      if (usedBytes !== null) {
        detail = "Measured via DATABASE_URL (pg_total_relation_size)";
      }
    }

    if (usedBytes === null) {
      const estimate = await estimateDbBytesViaSelect(supabase);
      usedBytes = estimate.bytes;
      detail = estimate.detail;
      estimated = true;
    }

    const { percent, status } = gaugeFromUsedLimit(usedBytes, limitBytes);

    return {
      label,
      usedBytes,
      limitBytes,
      percent,
      status,
      detail,
      estimated,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Database measurement failed";
    return {
      label,
      usedBytes: 0,
      limitBytes,
      percent: null,
      status: "unavailable",
      detail: message,
    };
  }
}

async function listBucketUsage(
  supabase: ReturnType<typeof import("@/lib/supabase/server").createSupabaseAdmin>,
  prefix = ""
): Promise<{ bytes: number; fileCount: number }> {
  let totalBytes = 0;
  let fileCount = 0;
  let offset = 0;

  while (true) {
    const { data, error } = await supabase.storage.from(ARGUS_FILES_BUCKET).list(prefix, {
      limit: LIST_PAGE_SIZE,
      offset,
    });
    if (error) throw new Error(error.message);
    if (!data?.length) break;

    for (const item of data) {
      const itemPath = prefix ? `${prefix}/${item.name}` : item.name;
      const isFolder = item.id === null || item.id === undefined;

      if (isFolder) {
        const nested = await listBucketUsage(supabase, itemPath);
        totalBytes += nested.bytes;
        fileCount += nested.fileCount;
        continue;
      }

      const size = item.metadata?.size;
      if (typeof size === "number" && size >= 0) {
        totalBytes += size;
      }
      fileCount += 1;
    }

    if (data.length < LIST_PAGE_SIZE) break;
    offset += LIST_PAGE_SIZE;
  }

  return { bytes: totalBytes, fileCount };
}

async function measureSupabaseStorage(): Promise<StorageQuotaGauge> {
  const limitBytes = mbToBytes(parseMbLimit(process.env.SUPABASE_STORAGE_LIMIT_MB, DEFAULT_STORAGE_LIMIT_MB));
  const label = `Supabase storage (${ARGUS_FILES_BUCKET})`;

  if (!hasSupabaseCredentials()) {
    return {
      label,
      usedBytes: 0,
      limitBytes,
      percent: null,
      status: "unavailable",
      detail: "SUPABASE_URL or service key missing",
    };
  }

  try {
    const { createSupabaseAdmin } = await import("@/lib/supabase/server");
    const supabase = createSupabaseAdmin();
    const { bytes, fileCount } = await listBucketUsage(supabase);
    const { percent, status } = gaugeFromUsedLimit(bytes, limitBytes);

    return {
      label,
      usedBytes: bytes,
      limitBytes,
      percent,
      status,
      detail: "Summed from bucket object metadata.size",
      fileCount,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Storage measurement failed";
    return {
      label,
      usedBytes: 0,
      limitBytes,
      percent: null,
      status: "unavailable",
      detail: message,
    };
  }
}

function measureVercelRuntime(): VercelRuntimeInfo {
  const isVercel = isVercelRuntime();
  const vercelEnv = process.env.VERCEL_ENV?.trim();

  if (!isVercel) {
    return {
      isVercel: false,
      detail: "Not running on Vercel — persistent local or external ARGUS_DATA_DIR may apply",
    };
  }

  const envLabel = vercelEnv ? ` (${vercelEnv})` : "";
  return {
    isVercel: true,
    vercelEnv,
    detail: `Serverless runtime${envLabel} — no persistent volume; data survives only via Supabase stores`,
  };
}

export async function getArgusStorageQuotaReport(): Promise<ArgusStorageQuotaReport> {
  const [local, supabaseDb, supabaseStorage] = await Promise.all([
    measureLocalStorage(),
    measureSupabaseDatabase(),
    measureSupabaseStorage(),
  ]);

  return {
    checkedAt: new Date().toISOString(),
    local,
    supabaseDb,
    supabaseStorage,
    vercel: measureVercelRuntime(),
  };
}
