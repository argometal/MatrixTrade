/**
 * DISABLED BY DESIGN — see lib/ai-session-disabled.ts
 * Blocked by ChatGPT platform capability, not by MatrixTrade.
 */
import { NextResponse } from "next/server";
import { aiSessionDisabledResponse, isAiSessionDisabled } from "@/lib/ai-session-disabled";
import { buildAiApiManifest, getPublicAppBaseUrl } from "@/lib/ai-session";
import { isAiSessionError, requireAiSession } from "@/lib/ai-auth";

export async function GET(request: Request): Promise<NextResponse> {
  if (isAiSessionDisabled()) return aiSessionDisabledResponse();

  const session = await requireAiSession(request, [], { allowQueryToken: true });
  if (isAiSessionError(session)) return session;

  const baseUrl = getPublicAppBaseUrl();
  return NextResponse.json({
    ok: true,
    session: {
      id: session.id,
      scopes: session.scopes,
      expiresAt: session.expiresAt,
    },
    manifest: buildAiApiManifest(baseUrl),
    instructions: [
      "Use Authorization: Bearer <session_token> on all /api/ai/* requests.",
      "POST /api/ai/proposals creates Inbox items only — human Apply required.",
      "Do not request Supabase or bridge tokens.",
    ],
  });
}
