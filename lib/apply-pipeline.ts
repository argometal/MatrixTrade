/**
 * Canonical Apply pipeline — shared by Control Accept and Inbox Apply.
 *
 * Contract:
 *   Parse → Apply → Verify persistence → (caller) Inbox ack → Revalidate → Return
 *
 * A successful result means the operation executed AND persistence was confirmed.
 * AUDIT FINDING 001 / Sprint Continuation 001.
 */
import {
  applyTradingProposal,
  type ApplyTradingProposalResult,
} from "./apply-trading-inbox";
import {
  verifyApplyPersistence,
  type ApplyVerifyResult,
} from "./apply-verify";
import {
  parseTradingInboxPayload,
  type TradingInboxPayload,
} from "./bridge";

export type CanonicalApplyStage = "parse" | "apply" | "verify";

export type CanonicalApplySuccess = {
  ok: true;
  parsed: TradingInboxPayload;
  apply: Extract<ApplyTradingProposalResult, { ok: true }>;
  verify: ApplyVerifyResult & { ok: true };
};

export type CanonicalApplyFailure = {
  ok: false;
  stage: CanonicalApplyStage;
  error: string;
  details?: string[];
  parsed?: TradingInboxPayload;
  apply?: ApplyTradingProposalResult;
  verify?: ApplyVerifyResult;
};

export type CanonicalApplyResult = CanonicalApplySuccess | CanonicalApplyFailure;

/**
 * Run Apply + persistence verification for a parsed/raw AI Block payload.
 * Does not touch Inbox status or Next.js revalidation — callers own those.
 */
export async function runCanonicalApplyPipeline(
  payload: Record<string, unknown>
): Promise<CanonicalApplyResult> {
  const parsed = parseTradingInboxPayload(payload);
  if (!parsed) {
    return {
      ok: false,
      stage: "parse",
      error: "Invalid inbox payload shape.",
    };
  }

  let apply: ApplyTradingProposalResult;
  try {
    apply = await applyTradingProposal(payload);
  } catch (err) {
    return {
      ok: false,
      stage: "apply",
      error: err instanceof Error ? err.message : "Apply failed unexpectedly.",
      parsed,
    };
  }

  if (!apply.ok) {
    return {
      ok: false,
      stage: "apply",
      error: apply.errors.join("; "),
      details: apply.errors,
      parsed,
      apply,
    };
  }

  const verify = await verifyApplyPersistence(parsed);
  if (!verify.ok) {
    return {
      ok: false,
      stage: "verify",
      error: `Persistence verification failed: ${verify.detail}`,
      details: [verify.detail],
      parsed,
      apply,
      verify,
    };
  }

  return {
    ok: true,
    parsed,
    apply,
    verify: { ok: true, detail: verify.detail },
  };
}
