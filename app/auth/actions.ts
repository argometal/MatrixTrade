"use server";

import { redirect } from "next/navigation";
import { verifyArgusPassword, verifyArgusPrivatePin, verifyTradingPassword } from "@/lib/auth/passwords";
import {
  clearAllSessions,
  clearArgusPrivateUnlock,
  setArgusPrivateUnlock,
  setArgusSession,
  setTradingSession,
} from "@/lib/auth/cookies";

export async function loginTradingAction(formData: FormData): Promise<void> {
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/");

  if (!verifyTradingPassword(password)) {
    redirect(`/login?error=1&next=${encodeURIComponent(next)}`);
  }

  await setTradingSession();
  redirect(next.startsWith("/") ? next : "/");
}

export async function loginArgusAction(formData: FormData): Promise<void> {
  const password = String(formData.get("password") ?? "");

  if (!verifyArgusPassword(password)) {
    redirect("/argus/login?error=1");
  }

  await setArgusSession();
  redirect("/argus/v2");
}

export async function unlockArgusPrivateAction(formData: FormData): Promise<void> {
  const pin = String(formData.get("pin") ?? "");

  if (!verifyArgusPrivatePin(pin)) {
    redirect("/argus/v2?private_error=1");
  }

  await setArgusPrivateUnlock();
  redirect("/argus/v2");
}

export async function lockArgusPrivateAction(): Promise<void> {
  await clearArgusPrivateUnlock();
  redirect("/argus/v2");
}

export async function logoutAction(): Promise<void> {
  await clearAllSessions();
  redirect("/login");
}
