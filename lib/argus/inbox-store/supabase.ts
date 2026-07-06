import { inboxStatusAfterLinkReplace } from "../inbox-store/set-linked-entities";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { isArgusInboxPrivateColumnReady, isArgusSoftDeleteSchemaReady } from "../supabase-protection/schema-ready";
import type { Attachment, AttachmentParentType, InboxItem, InboxItemInput } from "../types";
import { ARGUS_FILES_BUCKET } from "./config";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

type InboxRow = {
  id: string;
  received_at: string;
  source: InboxItem["source"];
  raw_text: string;
  raw_email: string | null;
  subject: string | null;
  from_address: string | null;
  to_address: string | null;
  attachment_ids: string[] | null;
  linked_entity_ids: string[] | null;
  private?: boolean | null;
  status: InboxItem["status"];
  converted_log_id: string | null;
  created_at: string;
  deleted_at?: string | null;
};

type AttachmentRow = {
  id: string;
  file_name: string;
  mime_type: string;
  created_at: string;
  parent_type: AttachmentParentType;
  parent_id: string;
  storage_key: string;
  deleted_at?: string | null;
};

function rowToInboxItem(row: InboxRow): InboxItem {
  return {
    id: row.id,
    receivedAt: row.received_at,
    source: row.source,
    rawText: row.raw_text,
    rawEmail: row.raw_email ?? undefined,
    subject: row.subject ?? undefined,
    from: row.from_address ?? undefined,
    to: row.to_address ?? undefined,
    attachmentIds: row.attachment_ids ?? [],
    linkedEntityIds: row.linked_entity_ids ?? [],
    private: row.private ?? false,
    status: row.status,
    convertedLogId: row.converted_log_id ?? undefined,
    createdAt: row.created_at,
    deletedAt: row.deleted_at ?? undefined,
  };
}

function rowToAttachment(row: AttachmentRow): Attachment {
  return {
    id: row.id,
    fileName: row.file_name,
    mimeType: row.mime_type,
    createdAt: row.created_at,
    parentType: row.parent_type,
    parentId: row.parent_id,
    deletedAt: row.deleted_at ?? undefined,
  };
}

function isRowActive(row: { deleted_at?: string | null }): boolean {
  return !row.deleted_at;
}

function inboxToInsertRow(
  item: InboxItem,
  softDeleteReady: boolean,
  privateReady: boolean
): Record<string, unknown> {
  const row: Record<string, unknown> = {
    id: item.id,
    received_at: item.receivedAt,
    source: item.source,
    raw_text: item.rawText,
    raw_email: item.rawEmail ?? null,
    subject: item.subject ?? null,
    from_address: item.from ?? null,
    to_address: item.to ?? null,
    attachment_ids: item.attachmentIds,
    linked_entity_ids: item.linkedEntityIds ?? [],
    status: item.status,
    converted_log_id: item.convertedLogId ?? null,
    created_at: item.createdAt,
  };
  if (privateReady) row.private = item.private ?? false;
  if (softDeleteReady) row.deleted_at = null;
  return row;
}

export async function getInboxItems(
  status?: "pending" | "converted" | "archived"
): Promise<InboxItem[]> {
  const softDeleteReady = await isArgusSoftDeleteSchemaReady();
  const supabase = createSupabaseAdmin();
  let query = supabase.from("argus_inbox_items").select("*").order("received_at", { ascending: false });
  if (softDeleteReady) query = query.is("deleted_at", null);
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) throw new Error(`Supabase inbox list failed: ${error.message}`);
  return (data as InboxRow[]).filter(isRowActive).map(rowToInboxItem);
}

export async function getPendingInboxCount(): Promise<number> {
  const softDeleteReady = await isArgusSoftDeleteSchemaReady();
  const supabase = createSupabaseAdmin();
  let query = supabase
    .from("argus_inbox_items")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");
  if (softDeleteReady) query = query.is("deleted_at", null);
  const { count, error } = await query;
  if (error) throw new Error(`Supabase inbox count failed: ${error.message}`);
  return count ?? 0;
}

export async function getInboxItem(id: string): Promise<InboxItem | undefined> {
  const softDeleteReady = await isArgusSoftDeleteSchemaReady();
  const supabase = createSupabaseAdmin();
  let query = supabase.from("argus_inbox_items").select("*").eq("id", id);
  if (softDeleteReady) query = query.is("deleted_at", null);
  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(`Supabase inbox read failed: ${error.message}`);
  if (!data || !isRowActive(data as InboxRow)) return undefined;
  return rowToInboxItem(data as InboxRow);
}

export async function createInboxItem(
  input: InboxItemInput & { status?: InboxItem["status"]; receivedAt?: string }
): Promise<InboxItem> {
  const now = new Date().toISOString();
  const item: InboxItem = {
    id: generateId(),
    receivedAt: input.receivedAt ?? now,
    source: input.source,
    rawText: input.rawText,
    rawEmail: input.rawEmail,
    subject: input.subject,
    from: input.from,
    to: input.to,
    attachmentIds: input.attachmentIds ?? [],
    linkedEntityIds: input.linkedEntityIds ?? [],
    private: input.private ?? false,
    status: input.status ?? "pending",
    createdAt: now,
  };

  const softDeleteReady = await isArgusSoftDeleteSchemaReady();
  const privateReady = await isArgusInboxPrivateColumnReady();
  const supabase = createSupabaseAdmin();
  const { error } = await supabase
    .from("argus_inbox_items")
    .insert(inboxToInsertRow(item, softDeleteReady, privateReady));
  if (error) throw new Error(`Supabase inbox create failed: ${error.message}`);
  return item;
}

export async function appendInboxAttachment(inboxId: string, attachmentId: string): Promise<void> {
  const item = await getInboxItem(inboxId);
  if (!item) throw new Error("Inbox item not found");
  if (item.attachmentIds.includes(attachmentId)) return;

  const softDeleteReady = await isArgusSoftDeleteSchemaReady();
  const supabase = createSupabaseAdmin();
  let query = supabase
    .from("argus_inbox_items")
    .update({ attachment_ids: [...item.attachmentIds, attachmentId] })
    .eq("id", inboxId);
  if (softDeleteReady) query = query.is("deleted_at", null);
  const { error } = await query;
  if (error) throw new Error(`Supabase inbox attachment link failed: ${error.message}`);
}

export async function markInboxConverted(
  inboxId: string,
  logId: string,
  entityIds: string[],
  isPrivate = false
): Promise<InboxItem> {
  const item = await getInboxItem(inboxId);
  if (!item) throw new Error("Inbox item not found");
  if (item.status !== "pending" && item.status !== "linked") {
    throw new Error("Inbox item cannot be converted");
  }

  const mergedEntityIds = [...new Set([...(item.linkedEntityIds ?? []), ...entityIds.filter(Boolean)])];
  const softDeleteReady = await isArgusSoftDeleteSchemaReady();
  const privateReady = await isArgusInboxPrivateColumnReady();
  const supabase = createSupabaseAdmin();
  const updatePayload: Record<string, unknown> = {
    status: "converted",
    converted_log_id: logId,
    linked_entity_ids: mergedEntityIds,
  };
  if (privateReady) updatePayload.private = isPrivate;
  let query = supabase.from("argus_inbox_items").update(updatePayload).eq("id", inboxId);
  if (softDeleteReady) query = query.is("deleted_at", null);
  const { data, error } = await query.select("*").single();
  if (error) throw new Error(`Supabase inbox convert failed: ${error.message}`);
  return rowToInboxItem(data as InboxRow);
}

export async function reassignAttachmentParent(
  attachmentId: string,
  parentType: AttachmentParentType,
  parentId: string
): Promise<void> {
  const softDeleteReady = await isArgusSoftDeleteSchemaReady();
  const supabase = createSupabaseAdmin();
  let query = supabase
    .from("argus_attachments")
    .update({ parent_type: parentType, parent_id: parentId })
    .eq("id", attachmentId);
  if (softDeleteReady) query = query.is("deleted_at", null);
  const { error } = await query;
  if (error) throw new Error(`Supabase attachment reassign failed: ${error.message}`);
}

export async function linkInboxToEntities(inboxId: string, entityIds: string[]): Promise<InboxItem> {
  const unique = [...new Set(entityIds.filter(Boolean))];
  if (unique.length === 0) throw new Error("Select at least one reference");

  const item = await getInboxItem(inboxId);
  if (!item) throw new Error("Inbox item not found");
  if (item.status === "archived") throw new Error("Inbox item is archived");

  const merged = [...new Set([...(item.linkedEntityIds ?? []), ...unique])];
  const status = item.status === "converted" ? "converted" : "linked";

  const softDeleteReady = await isArgusSoftDeleteSchemaReady();
  const supabase = createSupabaseAdmin();
  let query = supabase
    .from("argus_inbox_items")
    .update({ linked_entity_ids: merged, status })
    .eq("id", inboxId);
  if (softDeleteReady) query = query.is("deleted_at", null);
  const { data, error } = await query.select("*").single();
  if (error) throw new Error(`Supabase inbox link failed: ${error.message}`);
  return rowToInboxItem(data as InboxRow);
}

export async function setInboxLinkedEntities(inboxId: string, entityIds: string[]): Promise<InboxItem> {
  const unique = [...new Set(entityIds.filter(Boolean))];

  const item = await getInboxItem(inboxId);
  if (!item) throw new Error("Inbox item not found");
  if (item.status === "archived") throw new Error("Inbox item is archived");

  const status = inboxStatusAfterLinkReplace(item, unique.length);

  const softDeleteReady = await isArgusSoftDeleteSchemaReady();
  const supabase = createSupabaseAdmin();
  let query = supabase
    .from("argus_inbox_items")
    .update({ linked_entity_ids: unique, status })
    .eq("id", inboxId);
  if (softDeleteReady) query = query.is("deleted_at", null);
  const { data, error } = await query.select("*").single();
  if (error) throw new Error(`Supabase inbox set links failed: ${error.message}`);
  return rowToInboxItem(data as InboxRow);
}

export async function setInboxPrivate(inboxId: string, isPrivate: boolean): Promise<InboxItem> {
  const item = await getInboxItem(inboxId);
  if (!item) throw new Error("Inbox item not found");

  const softDeleteReady = await isArgusSoftDeleteSchemaReady();
  const privateReady = await isArgusInboxPrivateColumnReady();
  if (!privateReady) {
    throw new Error("Inbox protect requires argus_inbox_items.private — run supabase/argus-setup.sql");
  }
  const supabase = createSupabaseAdmin();
  let query = supabase.from("argus_inbox_items").update({ private: isPrivate }).eq("id", inboxId);
  if (softDeleteReady) query = query.is("deleted_at", null);
  const { data, error } = await query.select("*").single();
  if (error) throw new Error(`Supabase inbox protect failed: ${error.message}`);
  return rowToInboxItem(data as InboxRow);
}

export async function archiveInboxItem(id: string): Promise<InboxItem | undefined> {
  const softDeleteReady = await isArgusSoftDeleteSchemaReady();
  const supabase = createSupabaseAdmin();
  let query = supabase.from("argus_inbox_items").update({ status: "archived" }).eq("id", id);
  if (softDeleteReady) query = query.is("deleted_at", null);
  const { data, error } = await query.select("*").maybeSingle();
  if (error) throw new Error(`Supabase inbox archive failed: ${error.message}`);
  return data ? rowToInboxItem(data as InboxRow) : undefined;
}

export async function saveInboxAttachment(
  fileName: string,
  mimeType: string,
  bytes: Buffer,
  parentId: string
): Promise<Attachment> {
  const id = generateId();
  const safeName = fileName.replace(/[^\w.\-() ]/g, "_").slice(0, 120);
  const storageKey = `${id}`;
  const now = new Date().toISOString();

  const supabase = createSupabaseAdmin();
  const { error: uploadError } = await supabase.storage
    .from(ARGUS_FILES_BUCKET)
    .upload(storageKey, bytes, {
      contentType: mimeType || "application/octet-stream",
      upsert: true,
    });
  if (uploadError) {
    throw new Error(`Supabase attachment upload failed: ${uploadError.message}`);
  }

  const softDeleteReady = await isArgusSoftDeleteSchemaReady();
  const row: Record<string, unknown> = {
    id,
    file_name: safeName,
    mime_type: mimeType || "application/octet-stream",
    created_at: now,
    parent_type: "inbox",
    parent_id: parentId,
    storage_key: storageKey,
  };
  if (softDeleteReady) row.deleted_at = null;

  const { error: insertError } = await supabase.from("argus_attachments").insert(row);
  if (insertError) {
    throw new Error(`Supabase attachment metadata failed: ${insertError.message}`);
  }

  return rowToAttachment(row as AttachmentRow);
}

export async function getInboxAttachment(id: string): Promise<Attachment | undefined> {
  const softDeleteReady = await isArgusSoftDeleteSchemaReady();
  const supabase = createSupabaseAdmin();
  let query = supabase.from("argus_attachments").select("*").eq("id", id);
  if (softDeleteReady) query = query.is("deleted_at", null);
  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(`Supabase attachment read failed: ${error.message}`);
  if (!data || !isRowActive(data as AttachmentRow)) return undefined;
  return rowToAttachment(data as AttachmentRow);
}

export async function readInboxAttachmentBytes(id: string): Promise<Buffer | null> {
  const softDeleteReady = await isArgusSoftDeleteSchemaReady();
  const supabase = createSupabaseAdmin();
  let query = supabase.from("argus_attachments").select("storage_key").eq("id", id);
  if (softDeleteReady) query = query.is("deleted_at", null);
  const { data: row, error: metaError } = await query.maybeSingle();
  if (metaError) throw new Error(`Supabase attachment lookup failed: ${metaError.message}`);
  if (!row) return null;

  const { data, error } = await supabase.storage.from(ARGUS_FILES_BUCKET).download(row.storage_key);
  if (error || !data) return null;
  return Buffer.from(await data.arrayBuffer());
}

/** Soft delete — sets deleted_at when schema ready; otherwise archives (pre-migration fallback). */
export async function softDeleteInboxItem(id: string): Promise<boolean> {
  const item = await getInboxItem(id);
  if (!item) return false;

  const softDeleteReady = await isArgusSoftDeleteSchemaReady();
  if (!softDeleteReady) {
    return (await archiveInboxItem(id)) !== undefined;
  }

  const now = new Date().toISOString();
  const supabase = createSupabaseAdmin();

  for (const aid of item.attachmentIds) {
    await supabase.from("argus_attachments").update({ deleted_at: now }).eq("id", aid).is("deleted_at", null);
  }

  const { error } = await supabase
    .from("argus_inbox_items")
    .update({ deleted_at: now })
    .eq("id", id)
    .is("deleted_at", null);
  if (error) throw new Error(`Supabase inbox soft delete failed: ${error.message}`);
  return true;
}

/** @deprecated Use softDeleteInboxItem — hard delete blocked after argus-protection.sql. */
export async function deleteInboxItem(id: string): Promise<boolean> {
  return softDeleteInboxItem(id);
}
