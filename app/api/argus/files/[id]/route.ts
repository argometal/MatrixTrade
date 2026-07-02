import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ARGUS_AUTH } from "@/lib/auth/cookies";
import { readArgus, readEvidenceAttachment } from "@/lib/argus/server-storage";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const jar = await cookies();
  if (jar.get(ARGUS_AUTH)?.value !== "1") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const data = await readArgus();
  const item = data.evidence.find((e) => e.id === id);
  if (!item?.attachmentName) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const bytes = await readEvidenceAttachment(id);
  if (!bytes) {
    return NextResponse.json({ error: "File missing" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": item.attachmentMime ?? "application/octet-stream",
      "Content-Disposition": `attachment; filename="${item.attachmentName}"`,
    },
  });
}
