import { NextResponse } from "next/server";
import { toAiTradesDto } from "@/lib/ai-api-serialize";
import { isAiSessionError, requireAiSession } from "@/lib/ai-auth";
import { getTrades } from "@/lib/storage";

export async function GET(request: Request): Promise<NextResponse> {
  const session = await requireAiSession(request, ["read:trades"]);
  if (isAiSessionError(session)) return session;

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  let trades = await getTrades();

  if (status === "open" || status === "closed") {
    trades = trades.filter((t) => t.status === status);
  }

  return NextResponse.json({
    ok: true,
    count: trades.length,
    trades: toAiTradesDto(trades),
  });
}
