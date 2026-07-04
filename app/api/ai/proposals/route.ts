import { NextResponse } from "next/server";
import { submitInboxProposal } from "@/lib/ai-inbox-submit";
import { canCreateProposal, isAiSessionError, requireAiSession } from "@/lib/ai-auth";
import { parseTradingInboxPayload, validateProposalPayload } from "@/lib/bridge";

export async function POST(request: Request): Promise<NextResponse> {
  const session = await requireAiSession(request, []);
  if (isAiSessionError(session)) return session;

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

  const payload = parseTradingInboxPayload(body);
  if (!payload) {
    return NextResponse.json(
      { error: "Invalid payload. Expected type + proposal object." },
      { status: 400 }
    );
  }

  if (!canCreateProposal(session, payload.type)) {
    return NextResponse.json(
      { error: "Missing create:proposal or create:review-proposal scope" },
      { status: 403 }
    );
  }

  const validation = validateProposalPayload(payload);
  if (!validation.ok) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.errors },
      { status: 400 }
    );
  }

  const result = await submitInboxProposal({
    ...body,
    source: typeof body.source === "string" ? body.source : "ai-api",
    aiSessionId: session.id,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  return NextResponse.json(
    {
      ok: true,
      inboxItemId: result.inboxItemId,
      receivedAt: result.receivedAt,
      origin: result.origin,
      status: "pending",
      message: "Proposal queued for human review in Inbox. Not applied automatically.",
    },
    { status: 201 }
  );
}
