"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTradingSession } from "@/lib/auth/require-session";
import { createTrade, closeTrade, openTrade } from "@/lib/storage";
import type { CloseTradeInput, CreateTradeInput } from "@/lib/types";

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

  const result = await createTrade(input);

  if (result.errors) {
    return;
  }

  revalidatePath("/");
  revalidatePath("/trades");
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

  revalidatePath("/");
  revalidatePath("/trades");
  revalidatePath(`/trades/${id}`);
}

export async function openTradeAction(id: string, _formData: FormData): Promise<void> {
  await requireTradingSession();
  const result = await openTrade(id);

  if (result.errors) {
    return;
  }

  revalidatePath("/");
  revalidatePath("/trades");
  revalidatePath(`/trades/${id}`);
}
