import { NextResponse } from "next/server";
import { validateScopedAiGrant, validateScopedProposalAsync } from "@/lib/scoped-ai-grants";
import { submitToTradingInbox } from "@/lib/trading-inbox-submit";

export async function POST(
  request: Request,
  context: { params: Promise<{ grantId: string }> }
): Promise<NextResponse> {
  const { grantId } = await context.params;
  const validation = await validateScopedAiGrant(grantId, "propose");
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: validation.status });
  }

  let body: Record<string, unknown>;
  try {
    const parsed = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return NextResponse.json({ error: "Body must be a JSON object" }, { status: 400 });
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const scoped = await validateScopedProposalAsync(validation.grant, body);
  if (!scoped.ok) {
    return NextResponse.json({ error: "Validation failed", details: scoped.errors }, { status: 400 });
  }

  const enriched = {
    ...body,
    source: `scoped-ai:${validation.grant.id}`,
  };

  const result = await submitToTradingInbox(enriched);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  return NextResponse.json(
    {
      ok: true,
      inboxItemId: result.inboxItemId,
      receivedAt: result.receivedAt,
      origin: result.origin,
      type: scoped.payload.type,
      stockProfileId: validation.grant.stockProfileId,
      message: "Proposal queued. Human Apply required in /inbox.",
    },
    { status: 201 }
  );
}
