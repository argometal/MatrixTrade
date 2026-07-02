"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createContact,
  createEntry,
  createEvidence,
  saveEvidenceAttachment,
} from "@/lib/argus/server-storage";
import type { EntryStatus, EntryType, EvidenceType, InteractionKind } from "@/lib/argus/types";

export async function createContactAction(formData: FormData): Promise<void> {
  await createContact({
    name: String(formData.get("name") ?? "").trim(),
    role: String(formData.get("role") ?? "").trim(),
    department: String(formData.get("department") ?? "").trim(),
    relationship: String(formData.get("relationship") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    notes: String(formData.get("notes") ?? "").trim(),
  });
  revalidatePath("/argus/contacts");
  redirect("/argus/contacts");
}

export async function createEntryAction(formData: FormData): Promise<void> {
  const type = String(formData.get("type") ?? "note") as EntryType;
  const contactIds = formData.getAll("contactIds").map(String);
  const tags = String(formData.get("tags") ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const interactionRaw = formData.get("interactionKind");
  const entry = await createEntry({
    type,
    title: String(formData.get("title") ?? "").trim(),
    date: String(formData.get("date") ?? "").slice(0, 10),
    description: String(formData.get("description") ?? "").trim(),
    contactIds,
    status: String(formData.get("status") ?? "open") as EntryStatus,
    interactionKind:
      type === "interaction" && interactionRaw
        ? (String(interactionRaw) as InteractionKind)
        : undefined,
    tags,
    private: formData.get("private") === "on",
  });
  revalidatePath("/argus");
  revalidatePath("/argus/entries");
  redirect(`/argus/entries/${entry.id}`);
}

export async function createEvidenceAction(formData: FormData): Promise<void> {
  const entryId = String(formData.get("entryId") ?? "");
  const item = await createEvidence({
    entryId,
    type: String(formData.get("type") ?? "note") as EvidenceType,
    title: String(formData.get("title") ?? "").trim(),
    date: String(formData.get("date") ?? "").slice(0, 10),
    content: String(formData.get("content") ?? "").trim(),
    source: String(formData.get("source") ?? "").trim(),
    contactId: String(formData.get("contactId") ?? "") || undefined,
  });

  const file = formData.get("attachment");
  if (file instanceof File && file.size > 0) {
    const bytes = Buffer.from(await file.arrayBuffer());
    await saveEvidenceAttachment(item.id, file.name, file.type || "application/octet-stream", bytes);
  }

  revalidatePath(`/argus/entries/${entryId}`);
  revalidatePath("/argus");
  redirect(`/argus/entries/${entryId}`);
}
