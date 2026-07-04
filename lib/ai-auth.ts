import { NextResponse } from "next/server";
import type { AiSessionRecord } from "./ai-session-types";
import { isAiSessionTokenFormat } from "./ai-session-crypto";
import { validateAiSession } from "./ai-session";

export function readBearerToken(request: Request): string | null {
  const auth = request.headers.get("Authorization");
  if (auth?.startsWith("Bearer ")) {
    const token = auth.slice("Bearer ".length).trim();
    return token || null;
  }
  const header = request.headers.get("X-Matrixtrade-Ai-Token")?.trim();
  return header || null;
}

export function readQueryToken(request: Request): string | null {
  const url = new URL(request.url);
  const t = url.searchParams.get("t")?.trim() || url.searchParams.get("token")?.trim();
  return t || null;
}

export function aiUnauthorized(message = "Unauthorized"): NextResponse {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function aiForbidden(message = "Forbidden"): NextResponse {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function hasAiScope(session: AiSessionRecord, scope: string): boolean {
  return session.scopes.includes(scope);
}

export function hasAnyAiScope(session: AiSessionRecord, scopes: string[]): boolean {
  return scopes.some((scope) => hasAiScope(session, scope));
}

export async function requireAiSession(
  request: Request,
  requiredScopes: string[],
  options: { allowQueryToken?: boolean } = {}
): Promise<AiSessionRecord | NextResponse> {
  let token = readBearerToken(request);
  if (!token && options.allowQueryToken) {
    token = readQueryToken(request);
  }

  if (!token || !isAiSessionTokenFormat(token)) {
    return aiUnauthorized("Valid AI session token required");
  }

  const session = await validateAiSession(token);
  if (!session) {
    return aiUnauthorized("AI session expired, revoked, or invalid");
  }

  if (requiredScopes.length > 0 && !hasAnyAiScope(session, requiredScopes)) {
    return aiForbidden(`Missing required scope: ${requiredScopes.join(" or ")}`);
  }

  return session;
}

export function isAiSessionError(
  result: AiSessionRecord | NextResponse
): result is NextResponse {
  return result instanceof NextResponse;
}

/** Proposal write requires create:proposal or create:review-proposal for trade-review payloads. */
export function canCreateProposal(session: AiSessionRecord, proposalType: string): boolean {
  if (hasAiScope(session, "create:proposal")) return true;
  if (proposalType === "trade-review" && hasAiScope(session, "create:review-proposal")) {
    return true;
  }
  return false;
}
