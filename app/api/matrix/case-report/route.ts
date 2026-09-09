import { NextResponse } from "next/server";
import { requireTradingSession } from "@/lib/auth/require-session";
import { buildFocusedCaseReport } from "@/lib/focused-case-report";

export async function GET(request: Request): Promise<NextResponse> {
  await requireTradingSession();

  const url = new URL(request.url);
  const caseId = url.searchParams.get("case")?.trim();
  if (!caseId) {
    return NextResponse.json(
      { error: "case query parameter is required" },
      { status: 400 }
    );
  }

  const report = await buildFocusedCaseReport(caseId);
  if (!report) {
    return NextResponse.json(
      { error: `Focused case report not found for ${caseId}` },
      { status: 404 }
    );
  }

  return NextResponse.json(report, {
    headers: { "cache-control": "no-store" },
  });
}
