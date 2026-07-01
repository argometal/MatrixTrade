"use server";

import { redirect } from "next/navigation";
import { isHealthEnvConfigured, isTradingEnvConfigured } from "@/lib/auth/env";
import {
  clearHealthLoginFailures,
  getHealthLoginLockRemainingMs,
  isHealthLoginLocked,
  recordHealthLoginFailure,
} from "@/lib/auth/health-login-lock";
import { verifyHealthTotp } from "@/lib/auth/health-totp";
import { verifyHealthSecret, verifyTradingPassword } from "@/lib/auth/passwords";
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

  if (await isHealthLoginLocked()) {
    redirect("/health/login?locked=1");
  }

  const code = String(formData.get("code") ?? "");

  if (!verifyHealthTotp(code)) {
    const result = await recordHealthLoginFailure();
    if (result.locked) {
      redirect("/health/login?locked=1");
    }
    redirect("/health/login?error=1");
  }

  await clearHealthLoginFailures();
  await setHealthSession();
  redirect("/health");
}

function verifySecretUnlock(code: string): boolean {
  if (verifyHealthTotp(code)) return true;
  if (verifyHealthSecret(code)) return true;
  return false;
}

export async function unlockHealthSecretAction(formData: FormData): Promise<void> {
  if (!isHealthEnvConfigured()) {
    redirect("/health/login?config=health");
  }

  const code = String(formData.get("code") ?? "");

  if (!verifySecretUnlock(code)) {
    redirect("/health?secret_error=1");
  }

  await setHealthSecretUnlock();
  redirect("/health");
}

export async function lockHealthSecretAction(): Promise<void> {
  await clearHealthSecretUnlock();
  redirect("/health");
}

export async function getHealthLockRemainingMinutes(): Promise<number> {
  const ms = await getHealthLoginLockRemainingMs();
  return Math.ceil(ms / 60000);
}
