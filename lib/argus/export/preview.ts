import { evidenceRecordCount } from "./dedup";
import { applyExportCollectionOptions } from "./filters";
import { collectVaultEvidence } from "./collect-evidence";
import type { ArgusData, InboxItem } from "../types";
import type { ExportCollectionOptions, ExportPreviewSummary, ExportScopeType } from "./types";

function formatDateLabel(from?: string, to?: string): string {
  if (!from && !to) return "All dates";
  if (from && to) return `${from} → ${to}`;
  if (from) return `From ${from}`;
  return `Until ${to}`;
}

function estimateAttachmentBytes(data: ArgusData, attachmentIds: string[]): number {
  let total = 0;
  for (const id of attachmentIds) {
    const att = data.attachments.find((a) => a.id === id);
    if (!att) continue;
    total += 48_000;
  }
  return total;
}

export function buildExportPreviewSummary(input: {
  data: ArgusData;
  inboxItems: InboxItem[];
  scopeType: ExportScopeType;
  scopeId: string;
  includePrivate: boolean;
  options?: ExportCollectionOptions;
}): ExportPreviewSummary | null {
  const collected = collectVaultEvidence({
    data: input.data,
    inboxItems: input.inboxItems,
    scopeType: input.scopeType,
    scopeId: input.scopeId,
    includePrivate: input.includePrivate,
  });
  if (!collected) return null;

  const filtered = applyExportCollectionOptions(collected, input.options ?? {});
  const attachmentIds = filtered.attachments.map((att) => att.id);

  return {
    scopeType: filtered.scope.type,
    scopeId: filtered.scope.id,
    scopeName: filtered.scope.name,
    evidenceCount: evidenceRecordCount(filtered.logs, filtered.inbox),
    logCount: filtered.logs.length,
    inboxCount: filtered.inbox.length,
    fileCount: filtered.attachments.length,
    estimatedBytes: estimateAttachmentBytes(input.data, attachmentIds),
    dateLabel: formatDateLabel(input.options?.fromDate, input.options?.toDate),
    containsPrivate:
      filtered.logs.some((log) => log.private) || filtered.inbox.some((item) => item.private),
  };
}
