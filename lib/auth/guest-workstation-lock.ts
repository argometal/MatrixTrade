/** Guest workstation lock — short sessions on shared / remote computers. */

export const GUEST_LOCK_COOKIE = "guest-lock-policy";
export const GUEST_SESSION_UNTIL_COOKIE = "guest-session-until";

export type GuestLockPolicy = {
  enabled: boolean;
  /** Session lifetime in hours after each login (1–24). */
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

export function parseGuestLockPolicy(raw: string | undefined | null): GuestLockPolicy | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<GuestLockPolicy>;
    if (typeof parsed.enabled !== "boolean") return null;
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

  const day = now.toISOString().slice(0, 10);
  // Use local calendar date for range/hours
  const localDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const useDay = localDay || day;

  if (policy.dateFrom && useDay < policy.dateFrom) return false;
  if (policy.dateTo && useDay > policy.dateTo) return false;

  if (policy.dailyStart && policy.dailyEnd) {
    const mins = now.getHours() * 60 + now.getMinutes();
    const start = minutesOfDay(policy.dailyStart);
    const end = minutesOfDay(policy.dailyEnd);
    if (start <= end) {
      if (mins < start || mins > end) return false;
    } else {
      // Overnight window e.g. 22:00–06:00
      if (mins < start && mins > end) return false;
    }
  }

  return true;
}

/** Seconds until daily window ends (or hours cap), whichever is sooner. */
export function guestSessionMaxAgeSeconds(policy: GuestLockPolicy, now = new Date()): number {
  const hoursCap = clampGuestHours(policy.hours) * 60 * 60;
  if (!policy.enabled) return 60 * 60 * 24 * 7;

  if (!isGuestLockWindowOpen(policy, now)) return 0;

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
    if (localDay === policy.dateTo && policy.dailyEnd) {
      /* already capped by daily end */
    } else if (localDay === policy.dateTo) {
      const endOfDay =
        new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).getTime() - now.getTime();
      untilWindowEnd = Math.min(untilWindowEnd, Math.max(60, Math.floor(endOfDay / 1000)));
    }
  }

  return Math.min(hoursCap, untilWindowEnd);
}

export function guestSessionUntilIso(policy: GuestLockPolicy, now = new Date()): string {
  const seconds = guestSessionMaxAgeSeconds(policy, now);
  return new Date(now.getTime() + seconds * 1000).toISOString();
}
