import { NextResponse } from "next/server";
import { hasHealthSecretUnlock, hasHealthSession } from "@/lib/auth/cookies";
import { readEvidenceAttachment, readVault } from "@/lib/health-vault/server-storage";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await hasHealthSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const vault = await readVault();
  const item = vault.evidence.find((e) => e.id === id);
  if (!item?.attachmentName) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const record = vault.records.find((r) => r.id === item.recordId);
  if (record?.secret && !(await hasHealthSecretUnlock())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
