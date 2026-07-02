"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  archiveInboxItem,
  convertInboxToLog,
  createEntity,
  createLog,
  saveAttachment,
} from "@/lib/argus/server-storage";
import type { EntityType, JournalKind, LogSource } from "@/lib/argus/types";
import { JOURNAL_KINDS } from "@/lib/argus/labels";
import { inferJournalKind, resolveLogDate } from "@/lib/argus/journal-helpers";

function revalidateArgus(): void {
  revalidatePath("/argus");
  revalidatePath("/argus/journal");
  revalidatePath("/argus/network");
  revalidatePath("/argus/search");
  revalidatePath("/argus/inbox");
}

function parseTopics(raw: string): string[] {
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

function parseJournalInput(formData: FormData) {
  const today = new Date().toISOString().slice(0, 10);
  const eventDate = String(formData.get("eventDate") ?? "").slice(0, 10);
  const followUpRaw = String(formData.get("followUpDate") ?? "").slice(0, 10);
  const overrideRaw = String(formData.get("kindOverride") ?? "").trim();
  const kindOverride = JOURNAL_KINDS.includes(overrideRaw as JournalKind)
    ? (overrideRaw as JournalKind)
    : undefined;

  const kind = inferJournalKind({
    followUpDate: followUpRaw || undefined,
    eventDate: eventDate || undefined,
    kindOverride,
  });
  const date = resolveLogDate(kind, eventDate, today);

  return {
    kind,
    date,
    title: String(formData.get("title") ?? "").trim(),
    body: String(formData.get("body") ?? "").trim(),
    private: formData.get("private") === "on",
    source: String(formData.get("source") ?? "manual") as LogSource,
    followUpDate: kind === "follow_up" && followUpRaw ? followUpRaw : undefined,
    topics: parseTopics(String(formData.get("topics") ?? "")),
  };
}

async function resolveEntityIds(formData: FormData): Promise<string[]> {
  const entityIds = formData.getAll("entityIds").map(String).filter(Boolean);
  const newEntityName = String(formData.get("newEntityName") ?? "").trim();
  if (newEntityName) {
    const entity = await createEntity({
      type: String(formData.get("newEntityType") ?? "person") as EntityType,
      name: newEntityName,
      notes: String(formData.get("newEntityNotes") ?? "").trim(),
    });
    entityIds.push(entity.id);
  }
  return entityIds;
}

export async function createLogAction(formData: FormData): Promise<void> {
  const entityIds = await resolveEntityIds(formData);
  if (entityIds.length === 0) {
    throw new Error("Select or create at least one entity");
  }

  const attachmentIds: string[] = [];
  const file = formData.get("attachment");
  if (file instanceof File && file.size > 0) {
    const bytes = Buffer.from(await file.arrayBuffer());
    const att = await saveAttachment(file.name, file.type || "application/octet-stream", bytes);
    attachmentIds.push(att.id);
  }

  const input = parseJournalInput(formData);
  const log = await createLog({
    ...input,
    entityIds,
    attachmentIds,
  });

  revalidateArgus();
  redirect(`/argus/logs/${log.id}`);
}

export async function convertInboxAction(formData: FormData): Promise<void> {
  const inboxId = String(formData.get("inboxId") ?? "");
  const entityIds = await resolveEntityIds(formData);
  if (entityIds.length === 0) {
    throw new Error("Assign at least one entity");
  }

  const input = parseJournalInput(formData);
  const { log } = await convertInboxToLog(inboxId, {
    ...input,
    entityIds,
  });

  revalidateArgus();
  revalidatePath(`/argus/inbox/${inboxId}`);
  redirect(`/argus/logs/${log.id}`);
}

export async function archiveInboxAction(formData: FormData): Promise<void> {
  const inboxId = String(formData.get("inboxId") ?? "");
  await archiveInboxItem(inboxId);
  revalidateArgus();
  redirect("/argus/inbox");
}
