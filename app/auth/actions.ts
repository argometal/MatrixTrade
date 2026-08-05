"use server";

import { redirect } from "next/navigation";
import { verifyArgusPassword, verifyArgusPrivatePin, verifyDeletionCode, verifyTradingPassword } from "@/lib/auth/passwords";
import {
  clearAllSessions,
  clearArgusPrivateUnlock,
  setArgusDeleteAuthUnlock,
  setArgusDeleteUnlock,
  setArgusPrivateUnlock,
  setArgusSession,
  setTradingSession,
} from "@/lib/auth/cookies";
import { verifyArgusTotp } from "@/lib/auth/totp";

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
  const returnTo = String(formData.get("returnTo") ?? "/argus/v2");

  if (!verifyArgusPrivatePin(pin)) {
    const separator = returnTo.includes("?") ? "&" : "?";
    redirect(`${returnTo}${separator}private_error=1`);
  }

  await setArgusPrivateUnlock();
  await setArgusDeleteUnlock();
  redirect(returnTo.startsWith("/") ? returnTo : "/argus/v2");
}

export async function unlockArgusDeleteAction(formData: FormData): Promise<void> {
  const code = String(formData.get("code") ?? formData.get("pin") ?? "");
  const returnTo = String(formData.get("returnTo") ?? "/argus/v2/inbox");

  if (!verifyDeletionCode(code)) {
    const separator = returnTo.includes("?") ? "&" : "?";
    redirect(`${returnTo}${separator}delete_error=1`);
  }

  await setArgusDeleteUnlock();
  redirect(returnTo.startsWith("/") ? returnTo : "/argus/v2/inbox");
}

/** Authenticator (TOTP) unlock — required to delete evidence linked to topic/event/org. */
export async function unlockArgusDeleteAuthAction(formData: FormData): Promise<void> {
  const totp = String(formData.get("totp") ?? formData.get("code") ?? "");
  const returnTo = String(formData.get("returnTo") ?? "/argus/v2/inbox");

  if (!verifyArgusTotp(totp)) {
    const separator = returnTo.includes("?") ? "&" : "?";
    redirect(`${returnTo}${separator}delete_auth_error=1`);
  }

  await setArgusDeleteAuthUnlock();
  redirect(returnTo.startsWith("/") ? returnTo : "/argus/v2/inbox");
}

export async function lockArgusPrivateAction(): Promise<void> {
  await clearArgusPrivateUnlock();
  redirect("/argus/v2");
}

export async function logoutAction(): Promise<void> {
  await clearAllSessions();
  redirect("/login");
}

export async function saveGuestWorkstationLockAction(formData: FormData): Promise<void> {
  const returnTo = String(formData.get("returnTo") ?? "/settings/security");
  const password = String(formData.get("password") ?? "");
  const enabled = String(formData.get("enabled") ?? "") === "1";

  const tradingSet = Boolean(process.env.MATRIXTRADE_PASSWORD);
  const argusSet = Boolean(process.env.ARGUS_PASSWORD ?? process.env.HEALTH_VAULT_PASSWORD);
  const ok =
    (!tradingSet && !argusSet) ||
    (tradingSet && verifyTradingPassword(password)) ||
    (argusSet && verifyArgusPassword(password));

  if (!ok) {
    redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}error=password`);
  }

  const { writeGuestLockPolicy } = await import("@/lib/auth/cookies");
  const { clampGuestHours } = await import("@/lib/auth/guest-workstation-lock");

  await writeGuestLockPolicy({
    enabled,
    hours: clampGuestHours(Number(formData.get("hours") ?? 4)),
    dateFrom: String(formData.get("dateFrom") ?? "").trim().slice(0, 10) || undefined,
    dateTo: String(formData.get("dateTo") ?? "").trim().slice(0, 10) || undefined,
    dailyStart: String(formData.get("dailyStart") ?? "").trim() || undefined,
    dailyEnd: String(formData.get("dailyEnd") ?? "").trim() || undefined,
    indefinite: String(formData.get("indefinite") ?? "1") === "1",
  });

  // Re-stamp session TTLs under the new policy when enabling
  if (enabled) {
    await setTradingSession();
    await setArgusSession();
  }

  redirect(returnTo.startsWith("/") ? returnTo : "/settings/security");
}
