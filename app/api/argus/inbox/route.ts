import { NextResponse } from "next/server";
import { createInboxItem, saveAttachment } from "@/lib/argus/server-storage";
import type { InboxSource } from "@/lib/argus/types";

function readInboxToken(request: Request): string | null {
  const auth = request.headers.get("Authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice("Bearer ".length).trim();
  return request.headers.get("X-Argus-Inbox-Token")?.trim() ?? null;
}

function unauthorized(): NextResponse {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function resolveSource(
  explicit: string | undefined,
  rawEmail: string | undefined,
  from: string | undefined,
  hasAttachment: boolean
): InboxSource {
  if (explicit === "manual" || explicit === "api" || explicit === "email" || explicit === "file") {
    return explicit;
  }
  if (rawEmail || from) return "email";
  if (hasAttachment) return "file";
  return "api";
}

export async function POST(request: Request): Promise<NextResponse> {
  const expected = process.env.ARGUS_INBOX_TOKEN;
  if (!expected) {
    return NextResponse.json({ error: "Inbox not configured" }, { status: 503 });
  }

  const token = readInboxToken(request);
  if (!token || token !== expected) {
    return unauthorized();
  }

  const contentType = request.headers.get("content-type") ?? "";
  let text = "";
  let subject: string | undefined;
  let from: string | undefined;
  let to: string | undefined;
  let rawEmail: string | undefined;
  let explicitSource: string | undefined;
  const attachmentIds: string[] = [];

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    text = String(form.get("text") ?? "").trim();
    subject = String(form.get("subject") ?? "").trim() || undefined;
    from = String(form.get("from") ?? "").trim() || undefined;
    to = String(form.get("to") ?? "").trim() || undefined;
    explicitSource = String(form.get("source") ?? "").trim() || undefined;
    rawEmail = String(form.get("rawEmail") ?? "").trim() || undefined;
    if (!rawEmail) {
      const rawField = form.get("rawEmail");
      if (rawField instanceof File && rawField.size > 0) {
        rawEmail = await rawField.text();
      }
    }

    const file = form.get("file") ?? form.get("attachment");
    if (file instanceof File && file.size > 0) {
      const bytes = Buffer.from(await file.arrayBuffer());
      const att = await saveAttachment(file.name, file.type, bytes);
      attachmentIds.push(att.id);
    }
  } else {
    try {
      const body = (await request.json()) as Record<string, unknown>;
      text = String(body.text ?? "").trim();
      subject = body.subject ? String(body.subject).trim() : undefined;
      from = body.from ? String(body.from).trim() : undefined;
      to = body.to ? String(body.to).trim() : undefined;
      rawEmail = body.rawEmail ? String(body.rawEmail) : undefined;
      explicitSource = body.source ? String(body.source).trim() : undefined;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
  }

  if (!text && !rawEmail) {
    return NextResponse.json({ error: "text or rawEmail required" }, { status: 400 });
  }

  const source = resolveSource(explicitSource, rawEmail, from, attachmentIds.length > 0);

  const item = await createInboxItem({
    source,
    rawText: text || subject || "(no preview text)",
    rawEmail,
    subject,
    from,
    to,
    attachmentIds,
  });

  return NextResponse.json({ ok: true, inboxItemId: item.id }, { status: 201 });
}
