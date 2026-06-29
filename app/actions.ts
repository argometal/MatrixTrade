"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createTrade, closeTrade, openTrade } from "@/lib/storage";
import type { CloseTradeInput, CreateTradeInput } from "@/lib/types";

export async function createTradeAction(formData: FormData) {
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
    return { errors: result.errors };
  }

  revalidatePath("/");
  revalidatePath("/trades");
  redirect("/trades");
}

export async function closeTradeAction(id: string, formData: FormData) {
  const input: CloseTradeInput = {
    exit: Number(formData.get("exit")),
  };

  const result = await closeTrade(id, input);

  if (result.errors) {
    return { errors: result.errors };
  }

  revalidatePath("/");
  revalidatePath("/trades");
  revalidatePath(`/trades/${id}`);
}

export async function openTradeAction(id: string) {
  const result = await openTrade(id);

  if (result.errors) {
    return { errors: result.errors };
  }

  revalidatePath("/");
  revalidatePath("/trades");
  revalidatePath(`/trades/${id}`);
}
