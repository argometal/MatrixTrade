import { NextResponse } from "next/server";
import { getPlaybooks } from "@/lib/playbooks";
import { getMonthlyRisk, getTrades } from "@/lib/storage";
import { buildTradeBootPackage } from "@/lib/trade-boot";
import { suggestNextTradeId } from "@/lib/trades-workspace";

/** Public boot package for new trades — no grant required to read. */
export async function GET(): Promise<NextResponse> {
  const [trades, playbooks, monthly] = await Promise.all([
    getTrades(),
    getPlaybooks(),
    getMonthlyRisk(),
  ]);

  return NextResponse.json({
    ok: true,
    text: buildTradeBootPackage({
      suggestedTradeId: suggestNextTradeId(trades),
      playbooks: playbooks.map((p) => ({ id: p.id, name: p.name })),
      monthlyLossRoom: monthly.monthlyLossRoom,
    }),
    allowedProposalTypes: ["trade-proposal"],
    hint: "Paste AI output in Control → Update, or Scout war room boot package.",
  });
}
