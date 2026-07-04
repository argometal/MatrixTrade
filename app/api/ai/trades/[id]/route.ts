/**
 * DISABLED BY DESIGN — see lib/ai-session-disabled.ts
 * Blocked by ChatGPT platform capability, not by MatrixTrade.
 */
import { NextResponse } from "next/server";
import { toAiTradeDto } from "@/lib/ai-api-serialize";
import { aiSessionDisabledResponse, isAiSessionDisabled } from "@/lib/ai-session-disabled";
import { isAiSessionError, requireAiSession } from "@/lib/ai-auth";
import { getTradeById } from "@/lib/storage";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  if (isAiSessionDisabled()) return aiSessionDisabledResponse();

  const session = await requireAiSession(request, ["read:trades"]);
  if (isAiSessionError(session)) return session;

  const { id } = await context.params;
  const trade = await getTradeById(id);
  if (!trade) {
    return NextResponse.json({ error: "Trade not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, trade: toAiTradeDto(trade) });
}
