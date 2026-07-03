import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ARGUS_AUTH } from "@/lib/auth/cookies";
import { canPreviewInline } from "@/lib/argus/email-view";
import { getAttachment, readAttachmentBytes } from "@/lib/argus/server-storage";

function contentDisposition(fileName: string, inline: boolean): string {
  const safe = fileName.replace(/[\r\n"]/g, "_");
  const type = inline ? "inline" : "attachment";
  return `${type}; filename="${safe}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const jar = await cookies();
  if (jar.get(ARGUS_AUTH)?.value !== "1") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const attachment = await getAttachment(id);
  if (!attachment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const bytes = await readAttachmentBytes(id);
  if (!bytes) {
    return NextResponse.json({ error: "File missing" }, { status: 404 });
  }

  const inlineRequested = new URL(request.url).searchParams.get("inline") === "1";
  const inline = inlineRequested && canPreviewInline(attachment.mimeType);

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": attachment.mimeType,
      "Content-Length": String(bytes.length),
      "Content-Disposition": contentDisposition(attachment.fileName, inline),
      "Cache-Control": "private, max-age=3600",
    },
  });
}
