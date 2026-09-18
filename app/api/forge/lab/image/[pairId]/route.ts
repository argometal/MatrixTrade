import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ARGUS_AUTH } from "@/lib/auth/cookies";
import { readTrainingLab, readTrainingLabImageBytes, mimeFromBasename } from "@/lib/argus/lab/storage";

export async function GET(_request: Request, { params }: { params: Promise<{ pairId: string }> }) {
  const jar = await cookies();
  if (jar.get(ARGUS_AUTH)?.value !== "1") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { pairId } = await params;
  const data = await readTrainingLab();
  const pair = data.pairs.find((p) => p.id === pairId);
  if (!pair) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const bytes = await readTrainingLabImageBytes(pair.imageBasename);
  if (!bytes) {
    return NextResponse.json({ error: "File missing" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": mimeFromBasename(pair.imageBasename),
      "Content-Length": String(bytes.length),
      "Cache-Control": "private, max-age=3600",
    },
  });
}
