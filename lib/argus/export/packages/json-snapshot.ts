import type { ArgusData, Runbook } from "@/lib/argus/types";
import { isActiveRecord } from "@/lib/argus/supabase-protection/protected-counts";
import { runbooksForEntity } from "@/lib/argus/runbook-helpers";
import { buildExportEvidencePayload, buildExportTimeline } from "@/lib/argus/export/manifest";
import type { CollectedVaultEvidence } from "@/lib/argus/export/types";

/** Import-compatible runbook slice for JSON snapshot / AI tools. */
export function serializeRunbookForExport(runbook: Runbook) {
  return {
    id: runbook.id,
    title: runbook.title,
    linkedEntityIds: runbook.linkedEntityIds,
    tags: runbook.tags ?? [],
    items: runbook.items.map((item) => ({
      id: item.id,
      text: item.text,
      done: item.done,
      doneAt: item.doneAt,
      type: item.type,
      subtasks: item.subtasks ?? [],
    })),
    createdAt: runbook.createdAt,
    updatedAt: runbook.updatedAt,
  };
}

/**
 * Single-file JSON snapshot: evidence + timeline + scope entity + linked runbooks.
 * Runbooks use the same shape Import JSON accepts (`{ runbook: { title, items } }`).
 */
export function buildJsonSnapshotPayload(input: {
  data: ArgusData;
  collected: CollectedVaultEvidence;
  generatedAt?: string;
}) {
  const { data, collected } = input;
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const scopeEntity = data.entities.find((e) => e.id === collected.scope.id && isActiveRecord(e)) ?? null;
  const relatedEntities = collected.relatedEntityIds
    .map((id) => data.entities.find((e) => e.id === id && isActiveRecord(e)))
    .filter(Boolean);

  const linkedRunbooks = runbooksForEntity(data.runbooks ?? [], collected.scope.id).map(
    serializeRunbookForExport
  );

  return {
    version: "1.0.0",
    kind: "argus_json_snapshot",
    generatedAt,
    scope: collected.scope,
    entity: scopeEntity,
    relatedEntities,
    evidence: buildExportEvidencePayload(collected),
    timeline: buildExportTimeline(collected),
    runbooks: linkedRunbooks,
  };
}
