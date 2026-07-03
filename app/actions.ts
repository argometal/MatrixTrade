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
import { getSetups } from "@/lib/setups";
import {
  getLocalInboxItem,
  setLocalInboxStatus,
} from "@/lib/trading-inbox-storage";
import { createTrade, closeTrade, openTrade, saveTradeReview, getExperiment, getTrades, getRules } from "@/lib/storage";
import type { CloseTradeInput, CreateTradeInput, MistakeType, SaveReviewInput } from "@/lib/types";

function revalidateTradingPaths() {
  revalidatePath("/");
  revalidatePath("/trades");
  revalidatePath("/stats");
  revalidatePath("/mistakes");
  revalidatePath("/inbox");
  revalidatePath("/connect");
}

export async function syncBridgeFormAction(): Promise<void> {
  await syncBridgeAction();
}

export async function syncBridgeAction(): Promise<{ ok?: boolean; error?: string; updatedAt?: string }> {
  await requireTradingSession();
  const [experiment, trades, rules, setups] = await Promise.all([
    getExperiment(),
    getTrades(),
    getRules(),
    getSetups(),
  ]);

  const body = buildBridgeSnapshot(experiment, trades, rules, setups);
  const result = await publishSnapshotToBridge(body);
  revalidateTradingPaths();

  if ("error" in result) {
    return { error: result.error };
  }
  return { ok: true, updatedAt: result.updatedAt };
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

  if (origin === "worker") {
    await ackBridgeInboxItem(id, "applied");
  } else {
    await setLocalInboxStatus(id, "applied");
  }

  revalidateTradingPaths();
  redirect(`/inbox?applied=${encodeURIComponent(result.message)}`);
}

export async function rejectInboxItemAction(formData: FormData): Promise<void> {
  await requireTradingSession();
  const id = String(formData.get("id") ?? "");
  const origin = String(formData.get("origin") ?? "worker");

  if (origin === "worker") {
    await ackBridgeInboxItem(id, "rejected");
  } else {
    await setLocalInboxStatus(id, "rejected");
  }

  revalidateTradingPaths();
  redirect("/inbox");
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
