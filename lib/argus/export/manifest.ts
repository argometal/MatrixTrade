import { createHash } from "crypto";
import { buildTimelineFromLogsAndInbox } from "../v2/timeline-builders";
import type { CollectedVaultEvidence, ExportEvidencePayload, ExportManifest, ExportTimelineEntry, ExportTimelinePayload } from "./types";
import { evidenceRecordCount, uniqueEmailCount } from "./dedup";

export function sha256Hex(content: Buffer | string): string {
  return createHash("sha256").update(content).digest("hex");
}

function crossRefForLog(logId: string, collected: CollectedVaultEvidence) {
  const ref = collected.crossReferences.find((entry) => entry.logId === logId);
  if (!ref) return {};
  return { crossRefId: ref.inboxId, crossRefType: "inbox" as const };
}

function crossRefForInbox(inboxId: string, collected: CollectedVaultEvidence) {
  const ref = collected.crossReferences.find((entry) => entry.inboxId === inboxId);
  if (!ref) return {};
  return { crossRefId: ref.logId, crossRefType: "log" as const };
}

export function buildExportTimeline(collected: CollectedVaultEvidence): ExportTimelinePayload {
  const merged = buildTimelineFromLogsAndInbox(collected.logs, collected.inbox);
  const entries: ExportTimelineEntry[] = merged.map((entry) => {
    const sourceType = entry.kind === "email" ? "inbox" : "log";
    const cross =
      sourceType === "inbox"
        ? crossRefForInbox(entry.id, collected)
        : crossRefForLog(entry.id, collected);

    return {
      id: entry.id,
      sourceType,
      kind: entry.kind === "email" ? "email" : entry.kind === "meeting" ? "meeting" : "journal",
      date: entry.date,
      time: entry.time,
      title: entry.title,
      body: entry.body,
      tags: entry.tags,
      private: Boolean(entry.protected),
      ...cross,
    };
  });

  return {
    scope: collected.scope,
    entries,
    emailCount: uniqueEmailCount(collected.inbox),
  };
}

export function buildExportEvidencePayload(
  collected: CollectedVaultEvidence
): ExportEvidencePayload {
  return {
    scope: collected.scope,
    logs: collected.logs,
    inbox: collected.inbox,
    crossReferences: collected.crossReferences,
    attachments: collected.attachments.map((att) => ({
      id: att.id,
      fileName: att.fileName,
      mimeType: att.mimeType,
      createdAt: att.createdAt,
      parentType: att.parentType,
      parentId: att.parentId,
      zipPath: `files/${att.id}`,
    })),
    relatedEntityIds: collected.relatedEntityIds,
  };
}

export function buildExportManifest(input: {
  collected: CollectedVaultEvidence;
  includePrivate: boolean;
  hashes: Record<string, string>;
  options?: import("./types").ExportCollectionOptions;
}): ExportManifest {
  const { collected, includePrivate, hashes, options } = input;
  const entityIds = [collected.scope.id, ...collected.relatedEntityIds].sort();

  return {
    version: "1.0.0",
    exportedAt: new Date().toISOString(),
    packageType: "evidence_vault",
    scopeType: collected.scope.type,
    scopeId: collected.scope.id,
    scopeName: collected.scope.name,
    includePrivate,
    containsPrivate: collected.containsPrivate,
    evidenceCount: evidenceRecordCount(collected.logs, collected.inbox),
    fileCount: collected.attachments.length,
    hashes,
    sourceIds: {
      logIds: collected.logs.map((log) => log.id).sort(),
      inboxIds: collected.inbox.map((item) => item.id).sort(),
      attachmentIds: collected.attachments.map((att) => att.id).sort(),
      entityIds,
    },
    dateFrom: options?.fromDate?.trim() || null,
    dateTo: options?.toDate?.trim() || null,
    includes: {
      logs: options?.includeLogs !== false,
      inbox: options?.includeInbox !== false,
      attachments: options?.includeAttachments !== false,
    },
  };
}
