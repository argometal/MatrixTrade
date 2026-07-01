"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createEvidence,
  createPerson,
  createRecord,
  saveEvidenceAttachment,
} from "@/lib/health-vault/server-storage";
import type { EvidenceType, RecordType } from "@/lib/health-vault/types";

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
  await logIntakeAction(formData);
}

/** Single-step intake: record + optional attachment. */
export async function logIntakeAction(formData: FormData): Promise<void> {
  const description = String(formData.get("description") ?? "").trim();
  if (!description) {
    redirect("/health?error=1");
  }

  let title = String(formData.get("title") ?? "").trim();
  if (!title) {
    title = description.split("\n")[0].slice(0, 80).trim() || "Registro";
  }

  const type = String(formData.get("type") ?? "queja") as RecordType;
  const personId = String(formData.get("personId") ?? "").trim();
  const personIds = personId ? [personId] : [];

  const record = await createRecord({
    type,
    title,
    date: String(formData.get("date") ?? "").slice(0, 10) || new Date().toISOString().slice(0, 10),
    description,
    personIds,
    status: "documentado",
    tags: [],
    secret: formData.get("secret") === "on",
  });

  const file = formData.get("attachment");
  if (file instanceof File && file.size > 0) {
    const item = await createEvidence({
      recordId: record.id,
      type: "documento",
      title: file.name,
      date: record.date,
      content: "",
      source: "adjunto",
      personId: personId || undefined,
    });
    const bytes = Buffer.from(await file.arrayBuffer());
    await saveEvidenceAttachment(item.id, file.name, file.type || "application/octet-stream", bytes);
  }

  revalidatePath("/health");
  revalidatePath("/health/records");
  redirect("/health?saved=1");
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
