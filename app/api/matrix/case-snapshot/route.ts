import { NextResponse } from "next/server";
import { requireTradingSession } from "@/lib/auth/require-session";
import { buildCaseSnapshot, buildPlanSnapshot } from "@/lib/case-snapshot";

export async function GET(request: Request): Promise<NextResponse> {
  await requireTradingSession();

  const url = new URL(request.url);
  const caseId = url.searchParams.get("case")?.trim();
  const kind = url.searchParams.get("kind")?.trim().toLowerCase() === "plan"
    ? "plan"
    : "case";
  if (!caseId) {
    return NextResponse.json({ error: "case query parameter is required" }, { status: 400 });
  }

  const snapshot =
    kind === "plan"
      ? await buildPlanSnapshot(caseId)
      : await buildCaseSnapshot(caseId);
  if (!snapshot) {
    return NextResponse.json(
      {
        error:
          kind === "plan"
            ? `Plan snapshot not available for ${caseId}`
            : `Case snapshot not found for ${caseId}`,
      },
      { status: 404 }
    );
  }

  const headers = new Headers({
    "content-type": "text/plain; charset=utf-8",
    "cache-control": "no-store",
  });
  if (url.searchParams.get("download") === "1") {
    const safe = caseId.toUpperCase().replace(/[^A-Z0-9:_-]+/g, "_").replace(/:/g, "_");
    headers.set("content-disposition", `attachment; filename=\"${safe}.case-snapshot.txt\"`);
  }

  return new NextResponse(snapshot, { status: 200, headers });
}
