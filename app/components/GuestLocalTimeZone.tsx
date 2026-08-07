"use client";

import { useEffect, useState } from "react";
import { GUEST_TZ_COOKIE } from "@/lib/auth/guest-workstation-lock";

const TZ_MAX_AGE = 60 * 60 * 24 * 365;

function writeGuestTzCookie(timeZone: string) {
  const secure = typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${GUEST_TZ_COOKIE}=${encodeURIComponent(timeZone)}; Path=/; Max-Age=${TZ_MAX_AGE}; SameSite=Lax${secure}`;
}

/** Keeps middleware aware of this computer's IANA timezone for guest lock hours. */
export function GuestLocalTimeZoneSync() {
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz) writeGuestTzCookie(tz);
    } catch {
      // ignore
    }
  }, []);
  return null;
}

/** Hidden login field + cookie so session TTL uses this computer's local clock. */
export function GuestLocalTimeZoneField() {
  const [timeZone, setTimeZone] = useState("");

  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
      setTimeZone(tz);
      if (tz) writeGuestTzCookie(tz);
    } catch {
      // ignore
    }
  }, []);

  return <input type="hidden" name="timeZone" value={timeZone} />;
}
