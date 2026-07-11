import { NextResponse } from "next/server";
import { loadScopedScoutContext } from "@/lib/load-scoped-scout-context";
import { validateScopedAiGrant } from "@/lib/scoped-ai-grants";

export async function GET(
  _request: Request,
  context: { params: Promise<{ grantId: string }> }
): Promise<NextResponse> {
  const { grantId } = await context.params;
  const validation = await validateScopedAiGrant(grantId, "read");
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: validation.status });
  }

  try {
    const { text, meta } = await loadScopedScoutContext(validation.grant);
    return NextResponse.json({
      ok: true,
      grantId: validation.grant.id,
      text,
      meta,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load scoped context." },
      { status: 500 }
    );
  }
}
