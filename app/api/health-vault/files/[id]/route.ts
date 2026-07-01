import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { HV_AUTH } from "@/lib/auth/cookies";
import { readEvidenceAttachment, readVault } from "@/lib/health-vault/server-storage";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const jar = await cookies();
  if (jar.get(HV_AUTH)?.value !== "1") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const vault = await readVault();
  const item = vault.evidence.find((e) => e.id === id);
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
