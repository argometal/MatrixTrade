import { NextResponse } from "next/server";

/**
 * ------------------------------------------------------------
 * DISABLED BY DESIGN
 *
 * This feature was implemented to allow ChatGPT to authenticate
 * directly against MatrixTrade using temporary AI session tokens.
 *
 * After validation we confirmed that the current ChatGPT client
 * cannot initiate authenticated HTTP requests to custom APIs from
 * this conversation.
 *
 * Therefore this architecture cannot achieve its intended purpose.
 *
 * The backend is intentionally disabled rather than extended.
 *
 * Future work should only resume if ChatGPT (or another supported
 * AI client) gains native authenticated API access.
 *
 * Current supported workflow:
 *
 * MatrixTrade
 * → Copy Snapshot
 * → ChatGPT
 * → Proposal JSON
 * → Paste Proposal
 * → Inbox
 * → Apply
 *
 * Do not continue implementing AI Session features until this
 * platform limitation changes.
 *
 * Status: Blocked by ChatGPT platform capability, not by MatrixTrade.
 * ------------------------------------------------------------
 */

export const AI_SESSION_DISABLED = true;

export const AI_SESSION_DISABLED_MESSAGE =
  "AI Session / QR workflow is disabled — blocked by ChatGPT platform capability, not by MatrixTrade.";

export const AI_SESSION_DISABLED_DETAIL =
  "Supported workflow: Copy Snapshot → your AI → AI Block → Import → Inbox → Apply.";

export function isAiSessionDisabled(): boolean {
  return AI_SESSION_DISABLED;
}

export function aiSessionDisabledResponse(): NextResponse {
  return NextResponse.json(
    {
      ok: false,
      error: AI_SESSION_DISABLED_MESSAGE,
      detail: AI_SESSION_DISABLED_DETAIL,
      status: "blocked_by_platform_capability",
    },
    { status: 503 }
  );
}

export function aiSessionDisabledActionError(): { error: string } {
  return { error: AI_SESSION_DISABLED_MESSAGE };
}
