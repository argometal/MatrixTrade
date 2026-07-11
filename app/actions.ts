"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { applyTradingProposal } from "@/lib/apply-trading-inbox";
import { verifyApplyPersistence } from "@/lib/apply-verify";
import { requireTradingSession } from "@/lib/auth/require-session";
import {
  ackBridgeInboxItem,
  buildBridgeSnapshot,
  fetchBridgeInbox,
  parseTradingInboxPayload,
  publishSnapshotToBridge,
} from "@/lib/bridge";
import { nextSnapshotRevision } from "@/lib/snapshot-revision";
import { appendSyncHistory } from "@/lib/sync-history";
import { getSetups } from "@/lib/setups";
import { parseAiBlock } from "@/lib/ai-block";
import { createAiNotes } from "@/lib/ai-notes";
import { parseAiNotesPaste } from "@/lib/ai-notes-parse";
import {
  getInboxItemFromStore,
  markInboxItemStatus,
  submitToTradingInbox,
} from "@/lib/trading-inbox-submit";
import {
  aiSessionDisabledActionError,
  isAiSessionDisabled,
} from "@/lib/ai-session-disabled";
import {
  buildAiConnectUrl,
  createAiSession,
  revokeAiSession,
} from "@/lib/ai-session";
import { createQrDataUrl } from "@/lib/qr";
import { buildScopedAiUrls, createScopedAiGrant } from "@/lib/scoped-ai-grants";
import { getTradesStoreMode } from "@/lib/trades-json";
import { createTrade, closeTrade, openTrade, saveTradeReview, updateTradeMeta, getExperiment, getTrades, getRules, saveRules } from "@/lib/storage";
import type { CloseTradeInput, CreateTradeInput, MistakeType, SaveReviewInput, TradeMetaInput } from "@/lib/types";
import { parsePlanTimeframes, savePlan, updatePlanStatus, recordPlanOutcome, recordScoutDecision, transitionProbe } from "@/lib/plans";
import type { DecisionVerdict } from "@/lib/scout-decision-types";
import { parseProbeInput } from "@/lib/scout-probe";
import { updateStockThesisFields } from "@/lib/stock-theses";
import {
  STOCK_THESIS_STATUSES,
  type StockThesisStatus,
} from "@/lib/stock-thesis-types";
import {
  PLAN_EXTERNAL_FACTORS,
  PLAN_FAIL_REASON_LABELS,
  PLAN_STATUS_LABELS,
  PLAN_TIMEFRAMES,
  type PlanFailReason,
  type PlanTimeframe,
  type TradePlan,
} from "@/lib/plan-types";

// DISABLED BY DESIGN — see lib/ai-session-disabled.ts (AI Session server actions)

export type SaveAiNotesActionResult = { count: number } | { error: string };

export type ImportAiBlockActionResult =
  | { ok: true; inboxItemId: string; origin: string }
  | { error: string; details?: string[] };

export type CreateAiSessionActionResult =
  | { token: string; connectUrl: string; qrDataUrl: string }
  | { error: string };

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
  revalidatePath("/stock-theses");
  revalidatePath("/exchange");
  revalidatePath("/ai-workspace");
  revalidatePath("/inbox");
  revalidatePath("/system");
}

export async function importAiBlockAction(formData: FormData): Promise<ImportAiBlockActionResult> {
  await requireTradingSession();

  const raw = String(formData.get("aiBlock") ?? "");
  const parsed = parseAiBlock(raw);
  if (!parsed.ok) {
    return { error: parsed.error, details: parsed.details };
  }

  const result = await submitToTradingInbox({
    ...parsed.body,
    source: "ai-block",
  });

  if (!result.ok) {
    return { error: result.error };
  }

  revalidateTradingPaths();
  return {
    ok: true,
    inboxItemId: result.inboxItemId,
    origin: result.origin,
  };
}

export async function importStockCaseBlockAction(
  raw: string
): Promise<{ error?: string; details?: string[]; thesisId?: string }> {
  await requireTradingSession();

  const parsed = parseAiBlock(raw);
  if (!parsed.ok) {
    return { error: parsed.error, details: parsed.details };
  }
  if (parsed.payload.type !== "stock-case-create") {
    return { error: "Expected a stock-case-create block." };
  }

  const result = await applyTradingProposal(parsed.body as Record<string, unknown>);
  if (!result.ok) {
    return { error: result.errors.join(" ") };
  }

  revalidateTradingPaths();
  if (result.stockFileId) {
    revalidatePath(`/stock-theses/${result.stockFileId}`);
  }
  return { thesisId: result.stockFileId };
}

export async function saveAiNotesAction(formData: FormData): Promise<SaveAiNotesActionResult> {
  await requireTradingSession();

  const pasteJson = String(formData.get("pasteJson") ?? "");
  const revisionRaw = Number(formData.get("snapshotRevision"));
  const snapshotRevision = Number.isFinite(revisionRaw) ? revisionRaw : 0;

  const parsed = parseAiNotesPaste(pasteJson);
  if (!parsed.ok) {
    return { error: parsed.error };
  }

  try {
    await createAiNotes(
      parsed.notes.map((note) => ({
        tradeId: note.tradeId,
        snapshotRevision,
        date: note.date,
        noteType: note.noteType,
        body: note.body,
        proposalJson: note.proposalJson,
      }))
    );
    revalidateTradingPaths();
    return { count: parsed.notes.length };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to save AI notes",
    };
  }
}

export async function createAiSessionAction(
  formData: FormData
): Promise<CreateAiSessionActionResult> {
  if (isAiSessionDisabled()) return aiSessionDisabledActionError();
  await requireTradingSession();

  const ttlRaw = Number(formData.get("ttlMinutes"));
  const ttlMinutes =
    Number.isFinite(ttlRaw) && ttlRaw >= 5 && ttlRaw <= 1440 ? ttlRaw : 60;
  const label = String(formData.get("label") ?? "").trim() || undefined;

  try {
    const { token } = await createAiSession({ ttlMinutes, label });
    const connectUrl = buildAiConnectUrl(token);
    const qrDataUrl = await createQrDataUrl(connectUrl);
    revalidateTradingPaths();
    return { token, connectUrl, qrDataUrl };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to create AI session",
    };
  }
}

export async function revokeAiSessionAction(formData: FormData): Promise<void> {
  if (isAiSessionDisabled()) return;
  await requireTradingSession();
  const sessionId = String(formData.get("sessionId") ?? "").trim();
  if (sessionId) {
    await revokeAiSession(sessionId);
  }
  revalidateTradingPaths();
}

export async function syncBridgeFormAction(): Promise<void> {
  await requireTradingSession();
  const result = await syncBridgeAction();
  if ("error" in result) {
    redirect(`/system?syncError=${encodeURIComponent(result.error)}`);
  }
  const message = `Snapshot synced (HTTP ${result.httpStatus}) · revision ${result.snapshotRevision} · ${result.updatedAt}`;
  redirect(`/system?syncOk=${encodeURIComponent(message)}`);
}

export async function syncBridgeAction(): Promise<
  | { ok: true; updatedAt: string; snapshotRevision: number; httpStatus: number }
  | { error: string; httpStatus?: number }
> {
  await requireTradingSession();
  const [experiment, trades, rules, setups] = await Promise.all([
    getExperiment(),
    getTrades(),
    getRules(),
    getSetups(),
  ]);

  const snapshotRevision = await nextSnapshotRevision();
  const body = buildBridgeSnapshot(experiment, trades, rules, setups, snapshotRevision);
  const result = await publishSnapshotToBridge(body);
  revalidateTradingPaths();

  if ("error" in result) {
    await appendSyncHistory({
      at: new Date().toISOString(),
      ok: false,
      httpStatus: result.httpStatus,
      error: result.error,
    });
    return result;
  }

  await appendSyncHistory({
    at: new Date().toISOString(),
    ok: true,
    httpStatus: result.httpStatus,
    snapshotRevision: result.snapshotRevision,
    updatedAt: result.updatedAt,
  });

  return result;
}

export async function applyInboxItemAction(formData: FormData): Promise<void> {
  await requireTradingSession();
  const id = String(formData.get("id") ?? "");
  const origin = String(formData.get("origin") ?? "worker");

  let payload: Record<string, unknown> | undefined;
  if (origin === "worker") {
    const workerItems = await fetchBridgeInbox();
    payload = workerItems.find((item) => item.id === id)?.payload;
  } else {
    const item = await getInboxItemFromStore(id, origin);
    payload = item?.payload;
  }

  if (!payload) {
    redirect("/inbox?error=notfound");
  }

  const parsed = parseTradingInboxPayload(payload);
  if (!parsed) {
    redirect(
      `/inbox/${id}?origin=${origin}&error=${encodeURIComponent("Invalid inbox payload shape.")}`
    );
  }

  const result = await applyTradingProposal(payload);
  if (!result.ok) {
    redirect(`/inbox/${id}?origin=${origin}&error=${encodeURIComponent(result.errors.join("; "))}`);
  }

  let inboxError: string | undefined;
  if (origin === "worker") {
    const ack = await ackBridgeInboxItem(id, "applied");
    if (!ack.ok) {
      inboxError = `Worker ack failed: ${ack.error ?? "unknown error"}`;
    }
  } else {
    try {
      const marked = await markInboxItemStatus(id, origin, "applied");
      if (!marked) {
        inboxError = `Inbox item was not marked applied (${origin}).`;
      }
    } catch (err) {
      inboxError = err instanceof Error ? err.message : "Inbox status update failed.";
    }
  }

  const verify = await verifyApplyPersistence(parsed);
  const params = new URLSearchParams({
    applied: "1",
    origin,
    type: result.type,
    tradeId: result.tradeId ?? "",
    playbookId: result.playbookId ?? "",
    store: getTradesStoreMode(),
    verified: verify.ok ? "1" : "0",
    message: result.message,
  });
  if (verify.detail) params.set("verifyDetail", verify.detail);
  if (inboxError) params.set("inboxError", inboxError);

  revalidateTradingPaths();
  if (result.tradeId) revalidatePath(`/trades/${result.tradeId}`);
  if (result.stockFileId) revalidatePath(`/stock-theses/${result.stockFileId}`);
  if (result.planId) revalidatePath("/planning");
  redirect(`/inbox/${id}?${params.toString()}`);
}

export async function rejectInboxItemAction(formData: FormData): Promise<void> {
  await requireTradingSession();
  const id = String(formData.get("id") ?? "");
  const origin = String(formData.get("origin") ?? "worker");

  if (origin === "worker") {
    const ack = await ackBridgeInboxItem(id, "rejected");
    const msg = ack.ok
      ? `Inbox item rejected · Worker acknowledged (HTTP ${ack.httpStatus})`
      : `Inbox item rejected · Worker ack failed: ${ack.error ?? "unknown error"}`;
    revalidateTradingPaths();
    redirect(`/inbox?applied=${encodeURIComponent(msg)}`);
  } else {
    await markInboxItemStatus(id, origin, "rejected");
    revalidateTradingPaths();
    redirect(
      `/inbox?applied=${encodeURIComponent(`Inbox item rejected · marked rejected (${origin})`)}`
    );
  }
}

export async function createTradeAction(formData: FormData): Promise<void> {
  await requireTradingSession();
  const input: CreateTradeInput = {
    id: String(formData.get("id") ?? "").trim(),
    ticker: String(formData.get("ticker") ?? "").trim(),
    entry: Number(formData.get("entry")),
    stop: Number(formData.get("stop")),
    shares: Number(formData.get("shares")),
  };

  const targetRaw = formData.get("target");
  if (targetRaw && String(targetRaw).trim()) {
    input.target = Number(targetRaw);
  }

  const setupRaw = formData.get("setupId");
  if (setupRaw && String(setupRaw).trim()) {
    input.setupId = String(setupRaw).trim();
  }

  const playbookRaw = formData.get("playbookId");
  if (playbookRaw && String(playbookRaw).trim()) {
    input.playbookId = String(playbookRaw).trim();
  }

  const result = await createTrade(input);

  if (result.errors) {
    return;
  }

  revalidateTradingPaths();
  redirect("/trades");
}

export async function closeTradeAction(id: string, formData: FormData): Promise<void> {
  await requireTradingSession();
  const input: CloseTradeInput = {
    exit: Number(formData.get("exit")),
  };

  const result = await closeTrade(id, input);

  if (result.errors) {
    return;
  }

  revalidateTradingPaths();
  revalidatePath(`/trades/${id}`);
  redirect(`/trades/${id}/review`);
}

export async function openTradeAction(id: string, _formData: FormData): Promise<void> {
  await requireTradingSession();
  const result = await openTrade(id);

  if (result.errors) {
    return;
  }

  revalidateTradingPaths();
  revalidatePath(`/trades/${id}`);
}

export async function saveReviewAction(id: string, formData: FormData): Promise<void> {
  await requireTradingSession();

  const mistakesRaw = formData.getAll("mistakes").map(String) as MistakeType[];
  const input: SaveReviewInput = {
    mistakes: mistakesRaw.length > 0 ? mistakesRaw : ["none"],
    qualityEntry: Number(formData.get("qualityEntry")),
    qualityExit: Number(formData.get("qualityExit")),
    qualityMgmt: Number(formData.get("qualityMgmt")),
    lesson: String(formData.get("lesson") ?? "").trim() || undefined,
    actionItem: String(formData.get("actionItem") ?? "").trim() || undefined,
  };

  const result = await saveTradeReview(id, input);

  if (result.errors) {
    return;
  }

  revalidateTradingPaths();
  revalidatePath(`/trades/${id}`);
  redirect(`/trades/${id}`);
}

export async function updateTradeMetaAction(id: string, formData: FormData): Promise<void> {
  await requireTradingSession();

  const directionRaw = String(formData.get("direction") ?? "").trim();
  const input: TradeMetaInput = {
    playbookId: String(formData.get("playbookId") ?? ""),
    setupId: String(formData.get("setupId") ?? ""),
    setup: String(formData.get("setup") ?? "").trim() || undefined,
    direction: directionRaw === "long" || directionRaw === "short" ? directionRaw : undefined,
  };

  const plannedRisk = formData.get("plannedRisk");
  if (plannedRisk && String(plannedRisk).trim()) {
    input.plannedRisk = Number(plannedRisk);
  }
  const actualRisk = formData.get("actualRisk");
  if (actualRisk && String(actualRisk).trim()) {
    input.actualRisk = Number(actualRisk);
  }
  const rrPlanned = formData.get("riskRewardPlanned");
  if (rrPlanned && String(rrPlanned).trim()) {
    input.riskRewardPlanned = Number(rrPlanned);
  }
  const rrActual = formData.get("riskRewardActual");
  if (rrActual && String(rrActual).trim()) {
    input.riskRewardActual = Number(rrActual);
  }

  const closedAtRaw = String(formData.get("closedAt") ?? "").trim();
  if (closedAtRaw) {
    const parsed = Date.parse(`${closedAtRaw}T12:00:00`);
    if (Number.isFinite(parsed)) {
      input.closedAt = new Date(parsed).toISOString();
    }
  }

  const result = await updateTradeMeta(id, input);
  if (result.errors) {
    return;
  }

  revalidateTradingPaths();
  revalidatePath(`/trades/${id}`);
  redirect(`/trades/${id}?metaOk=${encodeURIComponent("Trade updated")}`);
}

export async function saveRulesAction(
  formData: FormData
): Promise<{ ok: true } | { error: string }> {
  await requireTradingSession();

  const monthlyLossLimit = Number(formData.get("monthlyLossLimit"));
  const maxLossPerTicker = Number(formData.get("maxLossPerTicker"));
  const carryoverEnabled = formData.get("carryoverEnabled") === "on";

  const result = await saveRules({ monthlyLossLimit, maxLossPerTicker, carryoverEnabled });
  if (result.errors?.length) {
    return { error: result.errors.join(" ") };
  }

  revalidateTradingPaths();
  return { ok: true };
}

export type SavePlanActionResult =
  | { ok: true; planId: string; warning?: string }
  | { error: string };

export async function savePlanAction(formData: FormData): Promise<SavePlanActionResult> {
  await requireTradingSession();

  const analysisTimeframes = parsePlanTimeframes(formData.getAll("analysisTimeframes"));
  const entryRaw = String(formData.get("entryTimeframe") ?? "5m").trim();
  const entryTimeframe = (PLAN_TIMEFRAMES as readonly string[]).includes(entryRaw)
    ? (entryRaw as PlanTimeframe)
    : "5m";

  const result = await savePlan({
    id: String(formData.get("id") ?? "").trim() || undefined,
    ticker: String(formData.get("ticker") ?? ""),
    playbookId: String(formData.get("playbookId") ?? "").trim() || undefined,
    stockThesisId: String(formData.get("stockThesisId") ?? "").trim() || undefined,
    analysisTimeframes,
    entryTimeframe,
    plannedEntry: Number(formData.get("plannedEntry")),
    supportLevel: Number(formData.get("supportLevel")),
    stopPrice: Number(formData.get("stopPrice")),
    targetPrice: Number(formData.get("targetPrice")),
    plannedRR: Number(formData.get("plannedRR")),
    validFrom: String(formData.get("validFrom") ?? "").trim() || undefined,
    validUntil: String(formData.get("validUntil") ?? "").trim() || undefined,
    thesis: String(formData.get("thesis") ?? ""),
    chatNotes: String(formData.get("chatNotes") ?? ""),
  });

  if (result.errors?.length) {
    return { error: result.errors.join(" ") };
  }

  revalidateTradingPaths();
  return {
    ok: true,
    planId: result.plan!.id,
    warning: result.warnings?.join(" "),
  };
}

export type SaveStockThesisActionResult = { ok: true } | { error: string };

export type CreateScopedAiGrantActionResult =
  | {
      grantId: string;
      humanPageUrl: string;
      contextUrl: string;
      inboxUrl: string;
      expiresAt: string;
    }
  | { error: string };

export async function createScopedAiGrantAction(
  formData: FormData
): Promise<CreateScopedAiGrantActionResult> {
  await requireTradingSession();

  const stockProfileId = String(formData.get("stockProfileId") ?? "").trim();
  if (!stockProfileId) return { error: "Stock profile id is required." };

  const planIdRaw = String(formData.get("planId") ?? "").trim();
  const result = await createScopedAiGrant({
    stockProfileId,
    planId: planIdRaw || undefined,
  });
  if (result.errors?.length) return { error: result.errors.join(" ") };

  const grant = result.grant!;
  const urls = buildScopedAiUrls(grant.id);
  revalidatePath(`/stock-theses/${stockProfileId}`);

  return {
    grantId: grant.id,
    expiresAt: grant.expiresAt,
    ...urls,
  };
}

export async function saveStockThesisAction(
  formData: FormData
): Promise<SaveStockThesisActionResult> {
  await requireTradingSession();

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "Stock thesis id is required." };

  const statusRaw = String(formData.get("status") ?? "").trim();
  const status = (STOCK_THESIS_STATUSES as readonly string[]).includes(statusRaw)
    ? (statusRaw as StockThesisStatus)
    : undefined;

  const result = await updateStockThesisFields(id, {
    status,
    currentHypothesis: String(formData.get("currentHypothesis") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  });

  if (result.errors?.length) {
    return { error: result.errors.join(" ") };
  }

  revalidateTradingPaths();
  revalidatePath(`/stock-theses/${id}`);
  return { ok: true };
}

export async function updatePlanStatusAction(
  planId: string,
  status: TradePlan["status"],
  linkedTradeId?: string
): Promise<{ error?: string }> {
  await requireTradingSession();
  const result = await updatePlanStatus(planId, status, linkedTradeId);
  if (result.errors?.length) return { error: result.errors.join(" ") };
  revalidateTradingPaths();
  revalidatePath("/planning");
  return {};
}

export async function recordPlanOutcomeAction(
  planId: string,
  formData: FormData
): Promise<{ error?: string }> {
  await requireTradingSession();

  const reasonRaw = String(formData.get("reason") ?? "").trim();
  const reason = (Object.keys(PLAN_FAIL_REASON_LABELS) as PlanFailReason[]).includes(
    reasonRaw as PlanFailReason
  )
    ? (reasonRaw as PlanFailReason)
    : undefined;

  const strategyStillValid = formData.get("strategyStillValid") === "yes";
  const externalFactors = formData
    .getAll("externalFactors")
    .map((v) => String(v).trim())
    .filter((v) => (PLAN_EXTERNAL_FACTORS as readonly string[]).includes(v));

  const result = await recordPlanOutcome(planId, {
    reason,
    strategyStillValid,
    externalFactors,
    lesson: String(formData.get("lesson") ?? ""),
  });

  if (result.errors?.length) return { error: result.errors.join(" ") };
  revalidateTradingPaths();
  revalidatePath("/planning");
  return {};
}

export type RecordScoutDecisionActionResult = { ok: true; planId: string } | { error: string };

export async function recordScoutDecisionAction(
  formData: FormData
): Promise<RecordScoutDecisionActionResult> {
  await requireTradingSession();

  const planId = String(formData.get("planId") ?? "").trim();
  if (!planId) return { error: "Plan id is required." };

  const verdictRaw = String(formData.get("verdict") ?? "").trim();
  const verdicts: DecisionVerdict[] = ["wait", "probe", "go", "no"];
  if (!verdicts.includes(verdictRaw as DecisionVerdict)) {
    return { error: "Invalid verdict." };
  }
  const verdict = verdictRaw as DecisionVerdict;

  const confidence = Number(formData.get("decisionConfidence"));
  const challenges = formData
    .getAll("challenges")
    .map((c) => String(c).trim())
    .filter(Boolean);
  if (!challenges.length) {
    const challengeText = String(formData.get("challengeText") ?? "").trim();
    if (challengeText) challenges.push(challengeText);
  }

  const probeInput =
    verdict === "probe"
      ? parseProbeInput({
          trigger: formData.get("probeTrigger"),
          expires: formData.get("probeExpires"),
          riskPercent: formData.get("probeRiskPercent") || 0.1,
          allocationPercent: formData.get("probeAllocationPercent"),
          reason: formData.get("probeReason"),
        })
      : undefined;

  const result = await recordScoutDecision(
    planId,
    {
      verdict,
      decisionConfidence: confidence,
      challenges,
      reasoning: String(formData.get("reasoning") ?? "").trim() || undefined,
      decidedBy: "human",
    },
    probeInput
  );

  if (result.errors?.length) return { error: result.errors.join(" ") };

  revalidateTradingPaths();
  revalidatePath("/planning");
  if (result.plan?.stockThesisId) {
    revalidatePath(`/stock-theses/${result.plan.stockThesisId}`);
  }
  return { ok: true, planId: result.plan!.id };
}

export async function activateProbeAction(planId: string): Promise<{ error?: string }> {
  await requireTradingSession();
  const result = await transitionProbe(planId, "activate");
  if (result.errors?.length) return { error: result.errors.join(" ") };
  revalidateTradingPaths();
  revalidatePath("/planning");
  if (result.plan?.stockThesisId) revalidatePath(`/stock-theses/${result.plan.stockThesisId}`);
  return {};
}

export async function cancelProbeAction(planId: string): Promise<{ error?: string }> {
  await requireTradingSession();
  const result = await transitionProbe(planId, "cancel");
  if (result.errors?.length) return { error: result.errors.join(" ") };
  revalidateTradingPaths();
  revalidatePath("/planning");
  if (result.plan?.stockThesisId) revalidatePath(`/stock-theses/${result.plan.stockThesisId}`);
  return {};
}

export async function stopProbeAction(planId: string): Promise<{ error?: string }> {
  await requireTradingSession();
  const result = await transitionProbe(planId, "stop");
  if (result.errors?.length) return { error: result.errors.join(" ") };
  revalidateTradingPaths();
  revalidatePath("/planning");
  if (result.plan?.stockThesisId) revalidatePath(`/stock-theses/${result.plan.stockThesisId}`);
  return {};
}
