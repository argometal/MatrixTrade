import { NextResponse } from "next/server";
import { buildBridgeSnapshot } from "@/lib/bridge";
import { isAiSessionError, requireAiSession } from "@/lib/ai-auth";
import { getExperiment, getRules, getTrades } from "@/lib/storage";
import { getSetups } from "@/lib/setups";

export async function GET(request: Request): Promise<NextResponse> {
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
