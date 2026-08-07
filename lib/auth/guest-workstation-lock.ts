/** Guest workstation lock — short sessions on shared / remote computers. */

export const GUEST_LOCK_COOKIE = "guest-lock-policy";
export const GUEST_SESSION_UNTIL_COOKIE = "guest-session-until";
/** Set on password login outside schedule — short “Ignore Limit” to edit settings. */
export const GUEST_LOCK_OVERRIDE_COOKIE = "guest-lock-override-until";
/** Browser IANA timezone (e.g. America/Mexico_City) — schedule uses this computer's local clock. */
export const GUEST_TZ_COOKIE = "guest-tz";

/** Password unlock outside schedule lasts this long, then logout again. */
export const GUEST_LOCK_PASSWORD_OVERRIDE_SECONDS = 30 * 60;

export type GuestLockPolicy = {
  enabled: boolean;
  /** Session lifetime in hours after each in-window login (1–24). */
  hours: number;
  /** Optional inclusive calendar range (local YYYY-MM-DD). */
  dateFrom?: string;
  dateTo?: string;
  /** Optional daily active window HH:MM (local to guest-tz). */
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

/** Accept IANA names only (reject injection / garbage). */
export function normalizeGuestTimeZone(raw: string | undefined | null): string | undefined {
  if (!raw) return undefined;
  const tz = decodeURIComponent(raw).trim();
  if (!tz || tz.length > 64) return undefined;
  if (!/^[A-Za-z0-9_+\-/]+$/.test(tz)) return undefined;
  try {
    // Throws RangeError for invalid zones in modern runtimes.
    new Intl.DateTimeFormat("en-US", { timeZone: tz }).format(new Date());
    return tz;
  } catch {
    return undefined;
  }
}

function minutesOfDay(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export type GuestLocalClock = {
  localDay: string;
  mins: number;
  year: number;
  month: number;
  day: number;
};

/** Local calendar day + minutes-of-day in the given IANA zone (falls back to UTC). */
export function guestLocalClock(now = new Date(), timeZone?: string): GuestLocalClock {
  const tz = normalizeGuestTimeZone(timeZone) ?? "UTC";
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(now);
    const get = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((part) => part.type === type)?.value ?? "";
    const year = Number(get("year"));
    const month = Number(get("month"));
    const day = Number(get("day"));
    const hour = Number(get("hour"));
    const minute = Number(get("minute"));
    if (![year, month, day, hour, minute].every((n) => Number.isFinite(n))) {
      throw new Error("bad parts");
    }
    return {
      year,
      month,
      day,
      localDay: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      mins: hour * 60 + minute,
    };
  } catch {
    return {
      year: now.getUTCFullYear(),
      month: now.getUTCMonth() + 1,
      day: now.getUTCDate(),
      localDay: now.toISOString().slice(0, 10),
      mins: now.getUTCHours() * 60 + now.getUTCMinutes(),
    };
  }
}

/** Whether the schedule currently allows a session (date range + daily hours in local tz). */
export function isGuestLockWindowOpen(
  policy: GuestLockPolicy,
  now = new Date(),
  timeZone?: string
): boolean {
  if (!policy.enabled) return true;

  const { localDay, mins } = guestLocalClock(now, timeZone);

  if (policy.dateFrom && localDay < policy.dateFrom) return false;
  if (policy.dateTo && localDay > policy.dateTo) return false;

  if (policy.dailyStart && policy.dailyEnd) {
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
export function guestSessionMaxAgeSeconds(
  policy: GuestLockPolicy,
  now = new Date(),
  timeZone?: string
): number {
  const hoursCap = clampGuestHours(policy.hours) * 60 * 60;
  if (!policy.enabled) return 60 * 60 * 24 * 7;

  if (!isGuestLockWindowOpen(policy, now, timeZone)) {
    return GUEST_LOCK_PASSWORD_OVERRIDE_SECONDS;
  }

  const clock = guestLocalClock(now, timeZone);
  let untilWindowEnd = hoursCap;
  if (policy.dailyEnd) {
    const endMins = minutesOfDay(policy.dailyEnd);
    const nowMins = clock.mins;
    let remainingMins: number;
    if (endMins >= nowMins) remainingMins = endMins - nowMins;
    else remainingMins = 24 * 60 - nowMins + endMins;
    untilWindowEnd = Math.max(60, remainingMins * 60);
  }

  if (policy.dateTo && clock.localDay === policy.dateTo && !policy.dailyEnd) {
    const endOfDayMins = 24 * 60 - clock.mins;
    untilWindowEnd = Math.min(untilWindowEnd, Math.max(60, endOfDayMins * 60));
  }

  return Math.min(hoursCap, untilWindowEnd);
}

/**
 * Seconds granted after a password login.
 * Inside schedule → timer hours (capped by window). Outside → 30 min override.
 */
export function guestLoginSessionSeconds(
  policy: GuestLockPolicy,
  now = new Date(),
  timeZone?: string
): number {
  if (!policy.enabled) return 60 * 60 * 24 * 7;
  if (!isGuestLockWindowOpen(policy, now, timeZone)) return GUEST_LOCK_PASSWORD_OVERRIDE_SECONDS;
  return guestSessionMaxAgeSeconds(policy, now, timeZone);
}

export function guestSessionUntilIso(
  policy: GuestLockPolicy,
  now = new Date(),
  timeZone?: string
): string {
  const seconds = guestLoginSessionSeconds(policy, now, timeZone);
  return new Date(now.getTime() + seconds * 1000).toISOString();
}

export function isGuestOverrideActive(overrideUntilIso: string | undefined | null, now = Date.now()): boolean {
  if (!overrideUntilIso) return false;
  const ts = Date.parse(overrideUntilIso);
  return Number.isFinite(ts) && now < ts;
}

/** True when login should stamp the short password-override cookie. */
export function guestLoginNeedsOverride(
  policy: GuestLockPolicy,
  now = new Date(),
  timeZone?: string
): boolean {
  return policy.enabled && !isGuestLockWindowOpen(policy, now, timeZone);
}
