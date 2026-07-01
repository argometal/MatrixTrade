"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hasHealthSecretUnlock } from "@/lib/auth/cookies";
import {
  createEvidence,
  createPerson,
  createRecord,
  saveEvidenceAttachment,
} from "@/lib/health-vault/server-storage";
import type { BehaviorKind, EvidenceType, RecordStatus, RecordType } from "@/lib/health-vault/types";

async function includeSecret(): Promise<boolean> {
  return hasHealthSecretUnlock();
}

export async function createPersonAction(formData: FormData): Promise<void> {
  await createPerson({
    name: String(formData.get("name") ?? "").trim(),
    role: String(formData.get("role") ?? "").trim(),
    department: String(formData.get("department") ?? "").trim(),
    relationship: String(formData.get("relationship") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    notes: String(formData.get("notes") ?? "").trim(),
  });
  revalidatePath("/health/people");
  redirect("/health/people");
}

export async function createRecordAction(formData: FormData): Promise<void> {
  const type = String(formData.get("type") ?? "queja") as RecordType;
  const personIds = formData.getAll("personIds").map(String);
  const tags = String(formData.get("tags") ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const behaviorRaw = formData.get("behaviorKind");
  const record = await createRecord({
    type,
    title: String(formData.get("title") ?? "").trim(),
    date: String(formData.get("date") ?? "").slice(0, 10),
    description: String(formData.get("description") ?? "").trim(),
    personIds,
    status: String(formData.get("status") ?? "abierto") as RecordStatus,
    behaviorKind:
      type === "comportamiento" && behaviorRaw
        ? (String(behaviorRaw) as BehaviorKind)
        : undefined,
    tags,
    secret: formData.get("secret") === "on",
  });
  revalidatePath("/health");
  revalidatePath("/health/records");
  redirect(`/health/records/${record.id}`);
}

export async function createEvidenceAction(formData: FormData): Promise<void> {
  const recordId = String(formData.get("recordId") ?? "");
  const item = await createEvidence({
    recordId,
    type: String(formData.get("type") ?? "nota") as EvidenceType,
    title: String(formData.get("title") ?? "").trim(),
    date: String(formData.get("date") ?? "").slice(0, 10),
    content: String(formData.get("content") ?? "").trim(),
    source: String(formData.get("source") ?? "").trim(),
    personId: String(formData.get("personId") ?? "") || undefined,
  });

  const file = formData.get("attachment");
  if (file instanceof File && file.size > 0) {
    const bytes = Buffer.from(await file.arrayBuffer());
    await saveEvidenceAttachment(item.id, file.name, file.type || "application/octet-stream", bytes);
  }

  revalidatePath(`/health/records/${recordId}`);
  revalidatePath("/health");
  redirect(`/health/records/${recordId}`);
}
