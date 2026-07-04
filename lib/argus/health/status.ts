import { countArgusData } from "../data-safety/counts";
import { getStorageSafetyStatus } from "../data-safety";
import { isCloudInboxStore } from "../inbox-store/config";
import { ARGUS_FILES_BUCKET } from "../inbox-store/config";
import { isCloudJournalStore } from "../journal-store/config";
import { getRecentActivity } from "../journal-helpers";
import {
  getEntities,
  getInboxItems,
  getLogs,
  readArgus,
  searchEntities,
  searchLogs,
} from "../server-storage";
import { isActiveRecord } from "../supabase-protection/protected-counts";
import { isArgusSoftDeleteSchemaReady } from "../supabase-protection/schema-ready";

export type HealthLevel = "healthy" | "degraded" | "offline";

export interface ArgusSubsystemStatus {
  key: string;
  label: string;
  level: HealthLevel;
  lastChecked: string;
  count?: number;
  reason?: string;
}

export interface ArgusHealthReport {
  checkedAt: string;
  subsystems: ArgusSubsystemStatus[];
}

function icon(level: HealthLevel): string {
  if (level === "healthy") return "🟢";
  if (level === "degraded") return "🟡";
  return "🔴";
}

export function healthLevelIcon(level: HealthLevel): string {
  return icon(level);
}

function row(
  key: string,
  label: string,
  level: HealthLevel,
  lastChecked: string,
  count?: number,
  reason?: string
): ArgusSubsystemStatus {
  return { key, label, level, lastChecked, count, reason };
}

async function checkSupabaseDatabase(checkedAt: string): Promise<ArgusSubsystemStatus> {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    return row("database", "Supabase Database", "offline", checkedAt, undefined, "SUPABASE_URL or service key missing");
  }

  try {
    const { createSupabaseAdmin } = await import("@/lib/supabase/server");
    const supabase = createSupabaseAdmin();
    const tables = ["argus_journal", "argus_inbox_items", "argus_attachments"] as const;
    const failures: string[] = [];

    for (const table of tables) {
      const { error } = await supabase.from(table).select("*", { count: "exact", head: true });
      if (error) failures.push(`${table}: ${error.message}`);
    }

    if (failures.length === tables.length) {
      return row("database", "Supabase Database", "offline", checkedAt, undefined, failures[0]);
    }
    if (failures.length > 0) {
      return row("database", "Supabase Database", "degraded", checkedAt, undefined, failures.join("; "));
    }

    return row("database", "Supabase Database", "healthy", checkedAt);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Connection failed";
    return row("database", "Supabase Database", "offline", checkedAt, undefined, message);
  }
}

async function checkInbox(checkedAt: string): Promise<ArgusSubsystemStatus> {
  try {
    const items = await getInboxItems();
    const active = items.filter(isActiveRecord);
    const safety = getStorageSafetyStatus();
    if (safety.writesBlocked && isCloudInboxStore()) {
      return row("inbox", "Inbox", "degraded", checkedAt, active.length, "Writes blocked");
    }
    if (!isCloudInboxStore()) {
      return row("inbox", "Inbox", "degraded", checkedAt, active.length, "Filesystem inbox — not cloud-backed");
    }
    const schemaReady = await isArgusSoftDeleteSchemaReady();
    if (!schemaReady) {
      return row("inbox", "Inbox", "degraded", checkedAt, active.length, "Soft-delete schema not applied");
    }
    return row("inbox", "Inbox", "healthy", checkedAt, active.length);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Inbox read failed";
    return row("inbox", "Inbox", "offline", checkedAt, undefined, message);
  }
}

async function checkEvidenceStore(checkedAt: string): Promise<ArgusSubsystemStatus> {
  try {
    const data = await readArgus();
    const counts = countArgusData(data);
    const safety = getStorageSafetyStatus();
    if (safety.writesBlocked) {
      return row("evidence", "Evidence Store", "degraded", checkedAt, counts.logs, "Journal writes blocked");
    }
    if (safety.ephemeralJournal) {
      return row("evidence", "Evidence Store", "degraded", checkedAt, counts.logs, "Ephemeral journal storage");
    }
    if (isCloudJournalStore()) {
      return row("evidence", "Evidence Store", "healthy", checkedAt, counts.logs);
    }
    return row("evidence", "Evidence Store", "degraded", checkedAt, counts.logs, "Filesystem journal");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Evidence read failed";
    return row("evidence", "Evidence Store", "offline", checkedAt, undefined, message);
  }
}

async function checkAttachments(checkedAt: string): Promise<ArgusSubsystemStatus> {
  try {
    const data = await readArgus();
    const count = data.attachments.filter(isActiveRecord).length;

    if (isCloudInboxStore() || isCloudJournalStore()) {
      const url = process.env.SUPABASE_URL?.trim();
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
      if (url && key) {
        const { createSupabaseAdmin } = await import("@/lib/supabase/server");
        const supabase = createSupabaseAdmin();
        const { error } = await supabase.storage.from(ARGUS_FILES_BUCKET).list("", { limit: 1 });
        if (error) {
          return row("attachments", "Attachments", "degraded", checkedAt, count, `Storage: ${error.message}`);
        }
      }
    }

    return row("attachments", "Attachments", "healthy", checkedAt, count);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Attachment check failed";
    return row("attachments", "Attachments", "offline", checkedAt, undefined, message);
  }
}

async function checkActivity(checkedAt: string): Promise<ArgusSubsystemStatus> {
  try {
    const logs = await getLogs(true);
    const recent = getRecentActivity(logs, 8);
    const entities = await getEntities();
    const objectCount = entities.length;
    const count = recent.length + Math.min(objectCount, 8);

    if (logs.length === 0 && objectCount === 0) {
      return row("activity", "Activity", "healthy", checkedAt, 0);
    }
    return row("activity", "Activity", "healthy", checkedAt, count);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Activity read failed";
    return row("activity", "Activity", "offline", checkedAt, undefined, message);
  }
}

async function checkRelationships(checkedAt: string): Promise<ArgusSubsystemStatus> {
  try {
    const data = await readArgus();
    let links = 0;
    for (const log of data.logs.filter(isActiveRecord)) {
      links += log.entityIds.length;
    }
    for (const item of data.inboxItems.filter(isActiveRecord)) {
      links += item.linkedEntityIds?.length ?? 0;
    }
    for (const entity of data.entities.filter(isActiveRecord)) {
      if (entity.type === "project") {
        links += entity.linkedPersonIds?.length ?? 0;
        links += entity.linkedTags?.length ?? 0;
      }
    }
    return row("relationships", "Relationships", "healthy", checkedAt, links);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Relationship read failed";
    return row("relationships", "Relationships", "offline", checkedAt, undefined, message);
  }
}

async function checkSearchIndex(checkedAt: string): Promise<ArgusSubsystemStatus> {
  try {
    const entities = await getEntities();
    const probe = entities.length > 0 ? entities[0].name.slice(0, 3) : "zzz";
    const entityHits = await searchEntities(probe);
    const logHits = await searchLogs(probe, true);
    const count = entities.length + (await getLogs(true)).length;
    if (entities.length > 0 && entityHits.length === 0) {
      return row("search", "Search Index", "degraded", checkedAt, count, "Entity search returned no hits");
    }
    void logHits;
    return row("search", "Search Index", "healthy", checkedAt, count);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Search failed";
    return row("search", "Search Index", "offline", checkedAt, undefined, message);
  }
}

export async function getArgusHealthReport(): Promise<ArgusHealthReport> {
  const checkedAt = new Date().toISOString();
  const subsystems = await Promise.all([
    checkSupabaseDatabase(checkedAt),
    checkInbox(checkedAt),
    checkEvidenceStore(checkedAt),
    checkAttachments(checkedAt),
    checkActivity(checkedAt),
    checkRelationships(checkedAt),
    checkSearchIndex(checkedAt),
  ]);
  return { checkedAt, subsystems };
}
