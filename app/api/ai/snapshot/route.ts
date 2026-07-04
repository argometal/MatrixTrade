/**
 * DISABLED BY DESIGN — see lib/ai-session-disabled.ts
 * Blocked by ChatGPT platform capability, not by MatrixTrade.
 */
import { NextResponse } from "next/server";
import { buildBridgeSnapshot } from "@/lib/bridge";
import { aiSessionDisabledResponse, isAiSessionDisabled } from "@/lib/ai-session-disabled";
import { isAiSessionError, requireAiSession } from "@/lib/ai-auth";
import { getExperiment, getRules, getTrades } from "@/lib/storage";
import { getSetups } from "@/lib/setups";

export async function GET(request: Request): Promise<NextResponse> {
  if (isAiSessionDisabled()) return aiSessionDisabledResponse();

  const session = await requireAiSession(request, [
    "read:trades",
    "read:stats",
    "read:playbook",
  ]);
  if (isAiSessionError(session)) return session;

  const [experiment, trades, rules, setups] = await Promise.all([
    getExperiment(),
    getTrades(),
    getRules(),
    getSetups(),
  ]);

  const snapshot = buildBridgeSnapshot(experiment, trades, rules, setups, 0);
  return NextResponse.json({
    ok: true,
    snapshot,
    session: { id: session.id, expiresAt: session.expiresAt },
  });
}
