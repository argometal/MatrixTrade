"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  appendLogAttachment,
  archiveInboxItem,
  classifyLog,
  clearAllArgusData,
  convertInboxToLog,
  createEntity,
  createLog,
  deleteEntity,
  deleteInboxItem,
  deleteLog,
  linkInboxToEntities,
  saveAttachment,
  updateEntity,
  updateLog,
} from "@/lib/argus/server-storage";
import type { EntityType, JournalKind, LogSource, StrategicValue } from "@/lib/argus/types";
import { JOURNAL_KINDS } from "@/lib/argus/labels";
import { inferJournalKind, resolveLogDate, autoTitleFromBody } from "@/lib/argus/journal-helpers";
import { resolveClassificationStatus } from "@/lib/argus/normalize";
import { ArgusWriteBlockedError, isDestructiveAllowed } from "@/lib/argus/data-safety";

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

function redirectStorageBlocked(fallback: string): never {
  redirect(`${fallback}?error=storage`);
}

function handleWriteError(err: unknown, fallback: string): never {
  if (err instanceof ArgusWriteBlockedError) redirectStorageBlocked(fallback);
  throw err;
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
    followUpDate: followUpRaw ? followUpRaw : undefined,
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
      alias: "",
      strategicValue: 3,
    });
    entityIds.push(entity.id);
  }
  return entityIds;
}

export async function createLogAction(formData: FormData): Promise<void> {
  try {
    const entityIds = await resolveEntityIds(formData);
    const input = parseJournalInput(formData);
    if (!input.body) {
      redirect("/argus/journal?capture=1&error=content");
    }

    const title = input.title || autoTitleFromBody(input.body);

    const log = await createLog({
      ...input,
      title,
      entityIds,
      classificationStatus: resolveClassificationStatus(entityIds),
      attachmentIds: [],
    });

    const file = formData.get("attachment");
    if (file instanceof File && file.size > 0) {
      const bytes = Buffer.from(await file.arrayBuffer());
      const att = await saveAttachment(
        file.name,
        file.type || "application/octet-stream",
        bytes,
        "journal",
        log.id
      );
      await appendLogAttachment(log.id, att.id);
    }

    revalidateArgus();
    const returnTo = String(formData.get("returnTo") ?? "log");
    redirect(returnTo === "journal" ? "/argus/journal" : `/argus/logs/${log.id}`);
  } catch (err) {
    handleWriteError(err, "/argus/journal");
  }
}

export async function updateLogAction(formData: FormData): Promise<void> {
  const logId = String(formData.get("logId") ?? "");
  const entityIds = await resolveEntityIds(formData);
  const input = parseJournalInput(formData);
  if (!input.body) {
    redirect(`/argus/logs/${logId}?error=content`);
  }

  const title = input.title || autoTitleFromBody(input.body);

  await updateLog(logId, {
    title,
    body: input.body,
    kind: input.kind,
    date: input.date,
    followUpDate: input.followUpDate,
    entityIds,
    topics: input.topics,
  });

  revalidateArgus();
  revalidatePath(`/argus/logs/${logId}`);
  redirect(`/argus/logs/${logId}`);
}

export async function classifyLogAction(formData: FormData): Promise<void> {
  const logId = String(formData.get("logId") ?? "");
  const entityIds = await resolveEntityIds(formData);
  if (entityIds.length === 0) {
    redirect(`/argus/logs/${logId}?error=entity`);
  }
  await classifyLog(logId, entityIds);
  revalidateArgus();
  redirect(`/argus/logs/${logId}`);
}

export async function linkInboxAction(formData: FormData): Promise<void> {
  const inboxId = String(formData.get("inboxId") ?? "");
  const entityIds = await resolveEntityIds(formData);
  if (entityIds.length === 0) {
    redirect(`/argus/inbox/${inboxId}?error=reference`);
  }
  await linkInboxToEntities(inboxId, entityIds);
  revalidateArgus();
  revalidatePath(`/argus/inbox/${inboxId}`);
  redirect(`/argus/inbox/${inboxId}`);
}

export async function convertInboxAction(formData: FormData): Promise<void> {
  const inboxId = String(formData.get("inboxId") ?? "");
  const entityIds = await resolveEntityIds(formData);
  const input = parseJournalInput(formData);
  if (!input.body) {
    redirect(`/argus/inbox/${inboxId}?error=content`);
  }

  const title = input.title || autoTitleFromBody(input.body);

  const { log } = await convertInboxToLog(inboxId, {
    ...input,
    title,
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

export async function updateEntityAction(formData: FormData): Promise<void> {
  const entityId = String(formData.get("entityId") ?? "");
  const rawValue = Number(formData.get("strategicValue") ?? 3);
  const strategicValue = (
    rawValue >= 1 && rawValue <= 5 ? rawValue : 3
  ) as StrategicValue;

  await updateEntity(entityId, {
    strategicValue,
    alias: String(formData.get("alias") ?? "").trim(),
    notes: String(formData.get("notes") ?? "").trim(),
  });

  revalidateArgus();
  revalidatePath(`/argus/network/${entityId}`);
  redirect(`/argus/network/${entityId}`);
}

export async function updateProjectAction(formData: FormData): Promise<void> {
  const entityId = String(formData.get("entityId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    redirect(`/argus/projects/${entityId}?error=name`);
  }

  const startDate = String(formData.get("startDate") ?? "").trim();
  const endDate = String(formData.get("endDate") ?? "").trim();
  const linkedPersonIds = formData.getAll("linkedPersonIds").map(String);
  const linkedTags = parseTopics(String(formData.get("linkedTags") ?? ""));

  await updateEntity(entityId, {
    name,
    startDate,
    endDate,
    linkedPersonIds,
    linkedTags,
  });

  revalidateArgus();
  revalidatePath(`/argus/projects/${entityId}`);
  redirect(`/argus/projects/${entityId}`);
}

export async function deleteLogAction(formData: FormData): Promise<void> {
  const logId = String(formData.get("logId") ?? "");
  await deleteLog(logId);
  revalidateArgus();
  redirect("/argus/journal");
}

export async function deleteEntityAction(formData: FormData): Promise<void> {
  const entityId = String(formData.get("entityId") ?? "");
  await deleteEntity(entityId);
  revalidateArgus();
  revalidatePath(`/argus/projects/${entityId}`);
  redirect("/argus/network");
}

export async function deleteInboxAction(formData: FormData): Promise<void> {
  const inboxId = String(formData.get("inboxId") ?? "");
  await deleteInboxItem(inboxId);
  revalidateArgus();
  const returnTo = String(formData.get("returnTo") ?? "inbox");
  redirect(returnTo === "journal" ? "/argus/journal" : "/argus/inbox");
}

export async function clearAllArgusDataAction(): Promise<void> {
  if (!isDestructiveAllowed()) {
    redirect("/argus/journal?error=destructive");
  }
  try {
    await clearAllArgusData();
  } catch (err) {
    if (err instanceof Error && err.message.includes("Supabase")) {
      redirect("/argus/journal?error=supabase-destructive");
    }
    throw err;
  }
  revalidateArgus();
  redirect("/argus/journal");
}
