/** Guest workstation lock — short sessions on shared / remote computers. */

export const GUEST_LOCK_COOKIE = "guest-lock-policy";
export const GUEST_SESSION_UNTIL_COOKIE = "guest-session-until";
/** Set on password login outside schedule — short “Ignore Limit” to edit settings. */
export const GUEST_LOCK_OVERRIDE_COOKIE = "guest-lock-override-until";

/** Password unlock outside schedule lasts this long, then logout again. */
export const GUEST_LOCK_PASSWORD_OVERRIDE_SECONDS = 30 * 60;

export type GuestLockPolicy = {
  enabled: boolean;
  /** Session lifetime in hours after each in-window login (1–24). */
  hours: number;
  /** Optional inclusive calendar range (local YYYY-MM-DD). */
  dateFrom?: string;
  dateTo?: string;
  /** Optional daily active window HH:MM (local). */
  dailyStart?: string;
  dailyEnd?: string;
  /** Policy stays on across logouts until turned off (sessions still expire). */
  indefinite: boolean;
};

export const DEFAULT_GUEST_LOCK_POLICY: GuestLockPolicy = {
  enabled: false,
  hours: 4,
  indefinite: true,
};

export function clampGuestHours(hours: number): number {
  if (!Number.isFinite(hours)) return 4;
  return Math.min(24, Math.max(1, Math.round(hours)));
}

export function normalizeGuestLockPolicy(parsed: Partial<GuestLockPolicy> | null | undefined): GuestLockPolicy | null {
  if (!parsed || typeof parsed.enabled !== "boolean") return null;
  return {
    enabled: parsed.enabled,
    hours: clampGuestHours(Number(parsed.hours ?? 4)),
    dateFrom: typeof parsed.dateFrom === "string" && parsed.dateFrom ? parsed.dateFrom.slice(0, 10) : undefined,
    dateTo: typeof parsed.dateTo === "string" && parsed.dateTo ? parsed.dateTo.slice(0, 10) : undefined,
    dailyStart:
      typeof parsed.dailyStart === "string" && /^\d{2}:\d{2}$/.test(parsed.dailyStart)
        ? parsed.dailyStart
        : undefined,
    dailyEnd:
      typeof parsed.dailyEnd === "string" && /^\d{2}:\d{2}$/.test(parsed.dailyEnd)
        ? parsed.dailyEnd
        : undefined,
    indefinite: parsed.indefinite !== false,
  };
}

export function parseGuestLockPolicy(raw: string | undefined | null): GuestLockPolicy | null {
  if (!raw) return null;
  try {
    return normalizeGuestLockPolicy(JSON.parse(raw) as Partial<GuestLockPolicy>);
  } catch {
    return null;
  }
}

export function serializeGuestLockPolicy(policy: GuestLockPolicy): string {
  return JSON.stringify({
    enabled: policy.enabled,
    hours: clampGuestHours(policy.hours),
    dateFrom: policy.dateFrom || undefined,
    dateTo: policy.dateTo || undefined,
    dailyStart: policy.dailyStart || undefined,
    dailyEnd: policy.dailyEnd || undefined,
    indefinite: policy.indefinite !== false,
  });
}

function minutesOfDay(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** Whether the schedule currently allows a session (date range + daily hours). */
export function isGuestLockWindowOpen(policy: GuestLockPolicy, now = new Date()): boolean {
  if (!policy.enabled) return true;

  const localDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  if (policy.dateFrom && localDay < policy.dateFrom) return false;
  if (policy.dateTo && localDay > policy.dateTo) return false;

  if (policy.dailyStart && policy.dailyEnd) {
    const mins = now.getHours() * 60 + now.getMinutes();
    const start = minutesOfDay(policy.dailyStart);
    const end = minutesOfDay(policy.dailyEnd);
    if (start <= end) {
      if (mins < start || mins > end) return false;
    } else if (mins < start && mins > end) {
      return false;
    }
  }

  return true;
}

/**
 * Soft TTL while inside an open schedule window (in-window login).
 * Outside schedule → password override only (30 minutes).
 */
export function guestSessionMaxAgeSeconds(policy: GuestLockPolicy, now = new Date()): number {
  const hoursCap = clampGuestHours(policy.hours) * 60 * 60;
  if (!policy.enabled) return 60 * 60 * 24 * 7;

  if (!isGuestLockWindowOpen(policy, now)) {
    return GUEST_LOCK_PASSWORD_OVERRIDE_SECONDS;
  }

  let untilWindowEnd = hoursCap;
  if (policy.dailyEnd) {
    const endMins = minutesOfDay(policy.dailyEnd);
    const nowMins = now.getHours() * 60 + now.getMinutes();
    let remainingMins: number;
    if (endMins >= nowMins) remainingMins = endMins - nowMins;
    else remainingMins = 24 * 60 - nowMins + endMins;
    untilWindowEnd = Math.max(60, remainingMins * 60);
  }

  if (policy.dateTo) {
    const localDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    if (localDay === policy.dateTo && !policy.dailyEnd) {
      const endOfDay =
        new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).getTime() - now.getTime();
      untilWindowEnd = Math.min(untilWindowEnd, Math.max(60, Math.floor(endOfDay / 1000)));
    }
  }

  return Math.min(hoursCap, untilWindowEnd);
}

/**
 * Seconds granted after a password login.
 * Inside schedule → timer hours (capped by window). Outside → 30 min override.
 */
export function guestLoginSessionSeconds(policy: GuestLockPolicy, now = new Date()): number {
  if (!policy.enabled) return 60 * 60 * 24 * 7;
  if (!isGuestLockWindowOpen(policy, now)) return GUEST_LOCK_PASSWORD_OVERRIDE_SECONDS;
  return guestSessionMaxAgeSeconds(policy, now);
}

export function guestSessionUntilIso(policy: GuestLockPolicy, now = new Date()): string {
  const seconds = guestLoginSessionSeconds(policy, now);
  return new Date(now.getTime() + seconds * 1000).toISOString();
}

export function isGuestOverrideActive(overrideUntilIso: string | undefined | null, now = Date.now()): boolean {
  if (!overrideUntilIso) return false;
  const ts = Date.parse(overrideUntilIso);
  return Number.isFinite(ts) && now < ts;
}

/** True when login should stamp the short password-override cookie. */
export function guestLoginNeedsOverride(policy: GuestLockPolicy, now = new Date()): boolean {
  return policy.enabled && !isGuestLockWindowOpen(policy, now);
}
