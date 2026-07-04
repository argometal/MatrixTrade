"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { applyTradingProposal } from "@/lib/apply-trading-inbox";
import { requireTradingSession } from "@/lib/auth/require-session";
import {
  ackBridgeInboxItem,
  buildBridgeSnapshot,
  fetchBridgeInbox,
  publishSnapshotToBridge,
} from "@/lib/bridge";
import { nextSnapshotRevision } from "@/lib/snapshot-revision";
import { appendSyncHistory } from "@/lib/sync-history";
import { getSetups } from "@/lib/setups";
import {
  getLocalInboxItem,
  setLocalInboxStatus,
} from "@/lib/trading-inbox-storage";
import { createAiNotes } from "@/lib/ai-notes";
import { parseAiNotesPaste } from "@/lib/ai-notes-parse";
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
import { createTrade, closeTrade, openTrade, saveTradeReview, updateTradeMeta, getExperiment, getTrades, getRules } from "@/lib/storage";
import type { CloseTradeInput, CreateTradeInput, MistakeType, SaveReviewInput, TradeMetaInput } from "@/lib/types";

// DISABLED BY DESIGN — see lib/ai-session-disabled.ts (AI Session server actions)

export type SaveAiNotesActionResult = { count: number } | { error: string };

export type CreateAiSessionActionResult =
  | { token: string; connectUrl: string; qrDataUrl: string }
  | { error: string };

function revalidateTradingPaths() {
  revalidatePath("/");
  revalidatePath("/trades");
  revalidatePath("/stats");
  revalidatePath("/mistakes");
  revalidatePath("/playbook");
  revalidatePath("/review");
  revalidatePath("/journal");
  revalidatePath("/ai-workspace");
  revalidatePath("/inbox");
  revalidatePath("/system");
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
    revalidatePath("/ai-workspace");
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
    revalidatePath("/ai-workspace");
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
  revalidatePath("/ai-workspace");
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
  if (origin === "local") {
    const item = await getLocalInboxItem(id);
    payload = item?.payload;
  } else {
    const workerItems = await fetchBridgeInbox();
    payload = workerItems.find((item) => item.id === id)?.payload;
  }

  if (!payload) {
    redirect("/inbox?error=notfound");
  }

  const result = await applyTradingProposal(payload);
  if (!result.ok) {
    redirect(`/inbox/${id}?error=${encodeURIComponent(result.errors.join("; "))}`);
  }

  let feedback = `Review applied — ${result.message}`;

  if (origin === "worker") {
    const ack = await ackBridgeInboxItem(id, "applied");
    feedback = ack.ok
      ? `${feedback} · Worker acknowledged (HTTP ${ack.httpStatus})`
      : `${feedback} · Worker ack failed: ${ack.error ?? "unknown error"}`;
  } else {
    await setLocalInboxStatus(id, "applied");
    feedback = `${feedback} · Local inbox item marked applied`;
  }

  revalidateTradingPaths();
  redirect(`/inbox?applied=${encodeURIComponent(feedback)}`);
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
    await setLocalInboxStatus(id, "rejected");
    revalidateTradingPaths();
    redirect(`/inbox?applied=${encodeURIComponent("Inbox item rejected · Local item marked rejected")}`);
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

  const result = await updateTradeMeta(id, input);
  if (result.errors) {
    return;
  }

  revalidateTradingPaths();
  revalidatePath(`/trades/${id}`);
  redirect(`/trades/${id}?metaOk=${encodeURIComponent("Trade updated")}`);
}
