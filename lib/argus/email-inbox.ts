export interface EmailInboxAttachmentInput {
  filename: string;
  contentType: string;
  size?: number;
  contentBase64: string;
}

export interface EmailInboxPayload {
  from: string;
  to?: string;
  subject?: string;
  text?: string;
  html?: string;
  receivedAt?: string;
  attachments?: EmailInboxAttachmentInput[];
}

export interface ParsedEmailInboxAttachment {
  filename: string;
  contentType: string;
  size: number;
  bytes: Buffer;
}

export interface ParsedEmailInboxPayload {
  from: string;
  to?: string;
  subject?: string;
  text: string;
  html?: string;
  receivedAt: string;
  rawEmail: string;
  attachments: ParsedEmailInboxAttachment[];
}

const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;

function trimOptional(value: unknown): string | undefined {
  if (value == null) return undefined;
  const s = String(value).trim();
  return s || undefined;
}

function parseReceivedAt(value: unknown): string | undefined {
  const raw = trimOptional(value);
  if (!raw) return undefined;
  const ms = Date.parse(raw);
  if (Number.isNaN(ms)) return undefined;
  return new Date(ms).toISOString();
}

function parseAttachment(value: unknown, index: number): ParsedEmailInboxAttachment | string {
  if (!value || typeof value !== "object") {
    return `attachments[${index}] must be an object`;
  }

  const row = value as Record<string, unknown>;
  const filename = trimOptional(row.filename);
  const contentType = trimOptional(row.contentType) ?? "application/octet-stream";
  const contentBase64 = trimOptional(row.contentBase64);

  if (!filename) return `attachments[${index}].filename is required`;
  if (!contentBase64) return `attachments[${index}].contentBase64 is required`;

  let bytes: Buffer;
  try {
    bytes = Buffer.from(contentBase64, "base64");
  } catch {
    return `attachments[${index}].contentBase64 is invalid base64`;
  }

  if (bytes.length === 0) return `attachments[${index}] is empty`;
  if (bytes.length > MAX_ATTACHMENT_BYTES) {
    return `attachments[${index}] exceeds ${MAX_ATTACHMENT_BYTES} bytes`;
  }

  const declaredSize = row.size;
  if (typeof declaredSize === "number" && Number.isFinite(declaredSize) && declaredSize !== bytes.length) {
    return `attachments[${index}].size does not match decoded content`;
  }

  return {
    filename,
    contentType,
    size: bytes.length,
    bytes,
  };
}

export function parseEmailInboxPayload(body: unknown): { ok: true; data: ParsedEmailInboxPayload } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "JSON body must be an object" };
  }

  const input = body as Record<string, unknown>;
  const from = trimOptional(input.from);
  if (!from) return { ok: false, error: "from is required" };

  const to = trimOptional(input.to);
  const subject = trimOptional(input.subject);
  const text = trimOptional(input.text) ?? "";
  const html = trimOptional(input.html);
  const receivedAt = parseReceivedAt(input.receivedAt) ?? new Date().toISOString();

  const rawAttachments = Array.isArray(input.attachments) ? input.attachments : [];
  const attachments: ParsedEmailInboxAttachment[] = [];

  for (let i = 0; i < rawAttachments.length; i++) {
    const parsed = parseAttachment(rawAttachments[i], i);
    if (typeof parsed === "string") return { ok: false, error: parsed };
    attachments.push(parsed);
  }

  if (!text && !subject && attachments.length === 0) {
    return { ok: false, error: "text, subject, or attachments required" };
  }

  const rawEmail = JSON.stringify(
    {
      from,
      to,
      subject,
      text: text || undefined,
      html,
      receivedAt,
      attachments: attachments.map(({ filename, contentType, size }) => ({
        filename,
        contentType,
        size,
      })),
    },
    null,
    2
  );

  return {
    ok: true,
    data: {
      from,
      to,
      subject,
      text: text || subject || "(email received — no plain text body)",
      html,
      receivedAt,
      rawEmail,
      attachments,
    },
  };
}
