"use server";

import { revalidatePath } from "next/cache";
import { parseAiBlock } from "@/lib/ai-block";
import { isApplyImplemented } from "@/lib/ai-bridge-types";
import { formatActionError, toActionSafe } from "@/lib/server-action-error";

export type ValidateAiBlockActionResult =
  | { ok: true; type: string }
  | { ok: false; error: string; details?: string[] };

export type AcceptAiBlockActionResult =
  | {
      ok: true;
      message: string;
      type: string;
      tradeId?: string;
      playbookId?: string;
      stockFileId?: string;
      planId?: string;
      inboxItemId?: string;
      alreadyApplied?: boolean;
      verified?: boolean;
      verifyDetail?: string;
      fundingFollowUp?: import("@/lib/scout-funding-follow-up").FundingFollowUpResult;
    }
  | { ok: false; error: string; details?: string[] };

function revalidateTradingPaths() {
  revalidatePath("/");
  revalidatePath("/home-preview");
  revalidatePath("/trades");
  revalidatePath("/trades-preview");
  revalidatePath("/stats");
  revalidatePath("/mistakes");
  revalidatePath("/playbook");
  revalidatePath("/review");
  revalidatePath("/journal");
  revalidatePath("/planning");
  revalidatePath("/planning/capital");
  revalidatePath("/stock-theses");
  revalidatePath("/exchange");
  revalidatePath("/ai-bridge");
  revalidatePath("/ai-workspace");
  revalidatePath("/inbox");
  revalidatePath("/system");
}

export async function validateAiBlockAction(
  formData: FormData
): Promise<ValidateAiBlockActionResult> {
  try {
    const { requireTradingSession } = await import("@/lib/auth/require-session");
    await requireTradingSession();

    const raw = String(formData.get("aiBlock") ?? "");
    const parsed = parseAiBlock(raw);
    if (!parsed.ok) {
      return {
        ok: false,
        error: parsed.error,
        details: toActionSafe(parsed.details),
      };
    }

    return {
      ok: true,
      type: parsed.payload.type,
    };
  } catch (err) {
    return formatActionError(err, "Server-side Validate failed unexpectedly.");
  }
}

export async function acceptAiBlockAction(
  formData: FormData
): Promise<AcceptAiBlockActionResult> {
  try {
    const { requireTradingSession } = await import("@/lib/auth/require-session");
    const {
      markInboxItemStatus,
      submitToTradingInbox,
    } = await import("@/lib/trading-inbox-submit");
    const { applyTradingProposal } = await import("@/lib/apply-trading-inbox");
    const { verifyApplyPersistence } = await import("@/lib/apply-verify");

    await requireTradingSession();

    const raw = String(formData.get("aiBlock") ?? "");
    const parsed = parseAiBlock(raw);
    if (!parsed.ok) {
      return {
        ok: false,
        error: parsed.error,
        details: toActionSafe(parsed.details),
      };
    }

    if (!isApplyImplemented(parsed.payload.type)) {
      return {
        ok: false,
        error: `Apply is not implemented for type ${parsed.payload.type}.`,
      };
    }

    const inboxResult = await submitToTradingInbox({
      ...parsed.body,
      source: "ai-block",
    });

    const applyResult = await applyTradingProposal(parsed.body);
    if (!applyResult.ok) {
      return {
        ok: false,
        error: applyResult.errors.join("; "),
        details: applyResult.partial
          ? ["Follow-on sync reported partial completion."]
          : undefined,
      };
    }

    const verify = await verifyApplyPersistence(
      parsed.body as unknown as import("@/lib/bridge").TradingInboxPayload
    );
    if (!verify.ok) {
      return {
        ok: false,
        error: "Apply persisted but post-write verification failed.",
        details: [verify.detail],
      };
    }

    if (inboxResult.ok) {
      try {
        await markInboxItemStatus(
          inboxResult.inboxItemId,
          inboxResult.origin,
          "applied"
        );
      } catch {
        /* audit mark best-effort */
      }
    }

    revalidateTradingPaths();
    if (applyResult.tradeId) revalidatePath(`/trades/${applyResult.tradeId}`);
    if (applyResult.stockFileId) {
      revalidatePath(`/stock-theses/${applyResult.stockFileId}`);
    }
    if (applyResult.planId) revalidatePath("/planning");

    return {
      ok: true,
      message: applyResult.message,
      type: applyResult.type,
      tradeId: applyResult.tradeId,
      playbookId: applyResult.playbookId,
      stockFileId: applyResult.stockFileId,
      planId: applyResult.planId,
      inboxItemId: inboxResult.ok ? inboxResult.inboxItemId : undefined,
      alreadyApplied: applyResult.alreadyApplied,
      verified: verify.ok,
      verifyDetail: verify.detail,
      fundingFollowUp: toActionSafe(applyResult.fundingFollowUp),
    };
  } catch (err) {
    return formatActionError(err, "Apply failed unexpectedly.");
  }
}
