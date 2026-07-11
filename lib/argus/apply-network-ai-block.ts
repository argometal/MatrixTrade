import { autoTitleFromBody } from "./journal-helpers";
import { resolveClassificationStatus } from "./normalize";
import {
  normalizeContactValueKeys,
  normalizeMyValueKeys,
} from "./network-relationship-metrics";
import type { NetworkAiBlockPayload } from "./network-ai-block";
import type { Entity, LogInput } from "./types";

export type ApplyNetworkAiBlockDeps = {
  getEntity: (id: string) => Promise<Entity | null | undefined>;
  createLog: (input: LogInput) => Promise<{ id: string }>;
  updateEntity: (id: string, patch: Partial<Entity>) => Promise<unknown>;
};

export type ApplyNetworkAiBlockResult =
  | { ok: true; message: string; logId?: string }
  | { ok: false; error: string };

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function strArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => String(v).trim()).filter(Boolean);
}

async function requirePerson(
  deps: ApplyNetworkAiBlockDeps,
  entityId: string
): Promise<{ ok: true; entity: Entity } | { ok: false; error: string }> {
  const entity = await deps.getEntity(entityId);
  if (!entity || entity.type !== "person" || entity.deletedAt) {
    return { ok: false, error: "Person not found for entityId." };
  }
  return { ok: true, entity };
}

/** Apply a validated network AI block. Call only from explicit human Apply action. */
export async function applyNetworkAiBlock(
  deps: ApplyNetworkAiBlockDeps,
  payload: NetworkAiBlockPayload
): Promise<ApplyNetworkAiBlockResult> {
  const { type, proposal } = payload;
  const entityId = str(proposal.entityId);
  const personCheck = await requirePerson(deps, entityId);
  if (!personCheck.ok) return personCheck;

  const today = new Date().toISOString().slice(0, 10);

  switch (type) {
    case "network-register": {
      const body = str(proposal.body) || "Registered from Network AI import.";
      const title = str(proposal.title) || autoTitleFromBody(body);
      const log = await deps.createLog({
        kind: "log",
        date: today,
        title,
        body,
        entityIds: [entityId],
        classificationStatus: resolveClassificationStatus([entityId]),
        private: false,
        source: "manual",
        attachmentIds: [],
        topics: strArray(proposal.topics),
      });
      return { ok: true, message: `Registered journal entry for ${personCheck.entity.name}.`, logId: log.id };
    }
    case "network-follow-up": {
      const body = str(proposal.body) || "Follow-up from Network AI import.";
      const title = str(proposal.title) || autoTitleFromBody(body);
      const followUpDate = str(proposal.followUpDate).slice(0, 10);
      const log = await deps.createLog({
        kind: "follow_up",
        date: today,
        followUpDate,
        title,
        body,
        entityIds: [entityId],
        classificationStatus: resolveClassificationStatus([entityId]),
        private: false,
        source: "manual",
        attachmentIds: [],
        topics: strArray(proposal.topics),
      });
      return { ok: true, message: `Follow-up scheduled for ${followUpDate}.`, logId: log.id };
    }
    case "network-tags": {
      const incoming = strArray(proposal.tags);
      const merged = [...new Set([...(personCheck.entity.linkedTags ?? []), ...incoming])];
      await deps.updateEntity(entityId, { linkedTags: merged });
      return { ok: true, message: `Updated tags on ${personCheck.entity.name}.` };
    }
    case "network-analysis": {
      const body = str(proposal.body);
      const title = str(proposal.title) || "AI analysis";
      const log = await deps.createLog({
        kind: "log",
        date: today,
        title,
        body,
        entityIds: [entityId],
        classificationStatus: resolveClassificationStatus([entityId]),
        private: false,
        source: "manual",
        attachmentIds: [],
        topics: ["ai-analysis"],
      });
      return { ok: true, message: `Appended analysis note for ${personCheck.entity.name}.`, logId: log.id };
    }
    case "network-metrics": {
      const contactValue = normalizeContactValueKeys(strArray(proposal.contactValue));
      const myValue = normalizeMyValueKeys(strArray(proposal.myValue));
      const patch: Partial<Entity> = {};
      if (contactValue.length) patch.contactValue = contactValue;
      if (myValue.length) patch.myValue = myValue;
      await deps.updateEntity(entityId, patch);
      return { ok: true, message: `Updated relationship metrics for ${personCheck.entity.name}.` };
    }
    default:
      return { ok: false, error: `Unsupported block type: ${type}` };
  }
}
