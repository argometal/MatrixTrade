import { NextResponse } from "next/server";
import { parseTradingInboxPayload, validateProposalPayload } from "@/lib/bridge";
import { createLocalInboxItem } from "@/lib/trading-inbox-storage";

function readInboxToken(request: Request): string | null {
  const auth = request.headers.get("Authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice("Bearer ".length).trim();
  return request.headers.get("X-Matrixtrade-Inbox-Token")?.trim() ?? null;
}

function unauthorized(): NextResponse {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function POST(request: Request): Promise<NextResponse> {
  const expected = process.env.MATRIXTRADE_INBOX_TOKEN;
  if (!expected) {
    return NextResponse.json({ error: "Trading inbox not configured" }, { status: 503 });
  }

  const token = readInboxToken(request);
  if (!token || token !== expected) {
    return unauthorized();
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

  const payload = parseTradingInboxPayload(body);
  if (!payload) {
    return NextResponse.json(
      { error: "Invalid payload. Expected type + proposal object." },
      { status: 400 }
    );
  }

  const validation = validateProposalPayload(payload);
  if (!validation.ok) {
    return NextResponse.json({ error: "Validation failed", details: validation.errors }, { status: 400 });
  }

  const item = await createLocalInboxItem({
    ...body,
    source: body.source ?? "api",
  });

  return NextResponse.json(
    { ok: true, inboxItemId: item.id, receivedAt: item.receivedAt, status: item.status },
    { status: 201 }
  );
}
