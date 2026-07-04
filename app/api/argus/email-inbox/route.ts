import { NextResponse } from "next/server";
import { parseEmailInboxPayload } from "@/lib/argus/email-inbox";
import { verifyInboxBearerToken } from "@/lib/argus/inbox-api-auth";
import { appendInboxAttachment, createInboxItem, saveAttachment } from "@/lib/argus/server-storage";

export async function POST(request: Request): Promise<NextResponse> {
  const authError = verifyInboxBearerToken(request);
  if (authError) return authError;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = parseEmailInboxPayload(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const email = parsed.data;

  try {
    const item = await createInboxItem({
      source: "email",
      rawText: email.text,
      rawEmail: email.rawEmail,
      subject: email.subject,
      from: email.from,
      to: email.to,
      attachmentIds: [],
      receivedAt: email.receivedAt,
    });

    for (const attachment of email.attachments) {
      const saved = await saveAttachment(
        attachment.filename,
        attachment.contentType,
        attachment.bytes,
        "inbox",
        item.id
      );
      await appendInboxAttachment(item.id, saved.id);
    }

    return NextResponse.json(
      {
        ok: true,
        inboxItemId: item.id,
        attachmentCount: email.attachments.length,
      },
      { status: 201 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
