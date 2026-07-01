"use server";

import { redirect } from "next/navigation";
import {
  isHealthEnvConfigured,
  isTradingEnvConfigured,
} from "@/lib/auth/env";
import { verifyHealthPassword, verifyHealthSecret, verifyTradingPassword } from "@/lib/auth/passwords";
import {
  clearHealthSecretUnlock,
  setHealthSecretUnlock,
  setHealthSession,
  setTradingSession,
} from "@/lib/auth/cookies";

export async function loginTradingAction(formData: FormData): Promise<void> {
  const next = String(formData.get("next") ?? "/");

  if (!isTradingEnvConfigured()) {
    redirect(`/login?config=trading&next=${encodeURIComponent(next)}`);
  }

  const password = String(formData.get("password") ?? "");

  if (!verifyTradingPassword(password)) {
    redirect(`/login?error=1&next=${encodeURIComponent(next)}`);
  }

  await setTradingSession();
  redirect(next.startsWith("/") ? next : "/");
}

export async function loginHealthAction(formData: FormData): Promise<void> {
  if (!isHealthEnvConfigured()) {
    redirect("/health/login?config=health");
  }

  const password = String(formData.get("password") ?? "");

  if (!verifyHealthPassword(password)) {
    redirect("/health/login?error=1");
  }

  await setHealthSession();
  redirect("/health");
}

export async function unlockHealthSecretAction(formData: FormData): Promise<void> {
  if (!isHealthEnvConfigured()) {
    redirect("/health/login?config=health");
  }

  const pin = String(formData.get("pin") ?? "");

  if (!verifyHealthSecret(pin)) {
    redirect("/health?secret_error=1");
  }

  await setHealthSecretUnlock();
  redirect("/health");
}

export async function lockHealthSecretAction(): Promise<void> {
  await clearHealthSecretUnlock();
  redirect("/health");
}
