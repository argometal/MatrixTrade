import { NextResponse } from "next/server";
import { buildStockCaseBootPackage } from "@/lib/stock-case-boot";

/** Public boot package for new stock cases — no grant required to read. */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    ok: true,
    text: buildStockCaseBootPackage(),
    allowedProposalTypes: ["stock-case-create"],
    hint: "For POST proposals use a bootstrap grant from /stock-theses/new or Apply via /inbox.",
  });
}
