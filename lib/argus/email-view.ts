import type { InboxItem } from "./types";

export interface StoredEmailPayload {
  from?: string;
  to?: string;
  subject?: string;
  text?: string;
  html?: string;
  receivedAt?: string;
  attachments?: Array<{ filename: string; contentType: string; size?: number }>;
}

export interface EmailViewModel {
  from: string;
  to?: string;
  subject?: string;
  receivedAt: string;
  textBody: string;
  htmlBody?: string;
  rawEmail?: string;
}

export interface AttachmentViewModel {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

export function parseStoredEmailPayload(rawEmail?: string): StoredEmailPayload | null {
  if (!rawEmail?.trim()) return null;
  try {
    const parsed = JSON.parse(rawEmail) as StoredEmailPayload;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

/** Build a human-readable email view from inbox item + preserved rawEmail JSON. */
export function buildEmailView(item: InboxItem): EmailViewModel {
  const stored = parseStoredEmailPayload(item.rawEmail);

  return {
    from: item.from ?? stored?.from ?? "Unknown sender",
    to: item.to ?? stored?.to,
    subject: item.subject ?? stored?.subject,
    receivedAt: item.receivedAt ?? stored?.receivedAt ?? item.createdAt,
    textBody: stored?.text?.trim() || item.rawText.trim() || "(No plain text body)",
    htmlBody: stored?.html?.trim() || undefined,
    rawEmail: item.rawEmail,
  };
}

export function attachmentSizeFromStored(
  fileName: string,
  stored: StoredEmailPayload | null,
  fallbackBytes: number
): number {
  const match = stored?.attachments?.find((a) => a.filename === fileName);
  if (typeof match?.size === "number" && match.size > 0) return match.size;
  return fallbackBytes;
}

export function formatFileSize(bytes: number): string {
  if (bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function attachmentDownloadUrl(id: string): string {
  return `/api/argus/files/${id}`;
}

export function attachmentPreviewUrl(id: string): string {
  return `/api/argus/files/${id}?inline=1`;
}

export function canPreviewInline(mimeType: string): boolean {
  return mimeType.startsWith("image/") || mimeType === "application/pdf";
}
