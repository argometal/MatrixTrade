import { NextResponse } from "next/server";
import { loadDeliverShare } from "@/lib/argus/export/deliver-shares";

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params;
  const share = await loadDeliverShare(token);
  if (!share) {
    return new NextResponse("Share link not found or expired.", { status: 404 });
  }

  return new NextResponse(share.html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, max-age=300",
    },
  });
}
