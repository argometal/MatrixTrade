"use server";

import { revalidatePath } from "next/cache";

export type ImprovementHypothesisActionResult = {
  ok: boolean;
  error?: string;
  hypothesisId?: string;
};

function improvementActionError(
  err: unknown
): ImprovementHypothesisActionResult {
  const message = err instanceof Error ? err.message : String(err);
  return {
    ok: false,
    error: message.includes("MXT_READ_ONLY")
      ? `${message} Persistence is read-only in this runtime — no production write.`
      : message,
  };
}

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

export async function createImprovementHypothesisAction(
  formData: FormData
): Promise<ImprovementHypothesisActionResult> {
  try {
    const { createImprovementHypothesisFromAcceptedMaf } = await import(
      "@/lib/improvement-hypothesis-apply"
    );
    const originPlanId = String(formData.get("originPlanId") ?? "").trim();
    const result = await createImprovementHypothesisFromAcceptedMaf({
      originPlanId,
      mafExperimentId:
        String(formData.get("mafExperimentId") ?? "").trim() || undefined,
      notes: String(formData.get("notes") ?? "").trim() || undefined,
    });
    if (result.errors?.length) {
      return { ok: false, error: result.errors.join(" ") };
    }
    revalidateTradingPaths();
    revalidatePath("/stats");
    return { ok: true, hypothesisId: result.hypothesis?.id };
  } catch (err) {
    return improvementActionError(err);
  }
}

export async function authorizeImprovementHypothesisTestingAction(
  formData: FormData
): Promise<ImprovementHypothesisActionResult> {
  try {
    const { authorizeImprovementHypothesisForTesting } = await import(
      "@/lib/improvement-hypothesis-apply"
    );
    const hypothesisId = String(formData.get("hypothesisId") ?? "").trim();
    const result = await authorizeImprovementHypothesisForTesting(hypothesisId);
    if (result.errors?.length) {
      return { ok: false, error: result.errors.join(" ") };
    }
    revalidateTradingPaths();
    revalidatePath("/stats");
    return { ok: true, hypothesisId: result.hypothesis?.id };
  } catch (err) {
    return improvementActionError(err);
  }
}

export async function setImprovementHypothesisVerdictAction(
  formData: FormData
): Promise<ImprovementHypothesisActionResult> {
  try {
    const { setImprovementHypothesisEvidenceVerdict } = await import(
      "@/lib/improvement-hypothesis-apply"
    );
    const hypothesisId = String(formData.get("hypothesisId") ?? "").trim();
    const statusRaw = String(formData.get("status") ?? "").trim();
    const status =
      statusRaw === "supported" ||
      statusRaw === "rejected" ||
      statusRaw === "insufficient_evidence"
        ? statusRaw
        : null;
    if (!status) return { ok: false, error: "Invalid evidence verdict." };
    const result = await setImprovementHypothesisEvidenceVerdict({
      hypothesisId,
      status,
      note: String(formData.get("note") ?? "").trim() || undefined,
    });
    if (result.errors?.length) {
      return { ok: false, error: result.errors.join(" ") };
    }
    revalidateTradingPaths();
    revalidatePath("/stats");
    return { ok: true, hypothesisId: result.hypothesis?.id };
  } catch (err) {
    return improvementActionError(err);
  }
}

export async function authorizeImprovementMethodChangeAction(
  formData: FormData
): Promise<ImprovementHypothesisActionResult> {
  try {
    const { authorizeImprovementMethodChange } = await import(
      "@/lib/improvement-hypothesis-apply"
    );
    const hypothesisId = String(formData.get("hypothesisId") ?? "").trim();
    const result = await authorizeImprovementMethodChange({
      hypothesisId,
      note: String(formData.get("note") ?? "").trim() || undefined,
    });
    if (result.errors?.length) {
      return { ok: false, error: result.errors.join(" ") };
    }
    revalidateTradingPaths();
    revalidatePath("/stats");
    return { ok: true, hypothesisId: result.hypothesis?.id };
  } catch (err) {
    return improvementActionError(err);
  }
}

export async function linkPlanToImprovementHypothesisAction(
  formData: FormData
): Promise<ImprovementHypothesisActionResult> {
  try {
    const { linkPlanToImprovementHypothesis } = await import(
      "@/lib/improvement-hypothesis-apply"
    );
    const hypothesisId = String(formData.get("hypothesisId") ?? "").trim();
    const planId = String(formData.get("planId") ?? "").trim();
    const result = await linkPlanToImprovementHypothesis({
      hypothesisId,
      planId,
    });
    if (result.errors?.length) {
      return { ok: false, error: result.errors.join(" ") };
    }
    revalidateTradingPaths();
    revalidatePath("/stats");
    return { ok: true, hypothesisId: result.hypothesis?.id };
  } catch (err) {
    return improvementActionError(err);
  }
}
