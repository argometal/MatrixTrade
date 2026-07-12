import { createHash } from "crypto";

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(obj).sort()) {
      if (key === "source" || key === "receivedAt" || key === "inboxItemId") continue;
      sorted[key] = sortKeys(obj[key]);
    }
    return sorted;
  }
  return value;
}

/** Deterministic fingerprint for idempotent Apply — ignores inbox metadata. */
export function computeImportFingerprint(payload: Record<string, unknown>): string {
  const normalized = sortKeys(payload) as Record<string, unknown>;
  const json = JSON.stringify(normalized);
  return createHash("sha256").update(json).digest("hex");
}
