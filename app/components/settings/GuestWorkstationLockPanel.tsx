"use client";

import { useState } from "react";
import { saveGuestWorkstationLockAction } from "@/app/auth/actions";
import type { GuestLockPolicy } from "@/lib/auth/guest-workstation-lock";

export function GuestWorkstationLockPanel({
  initialPolicy,
  passwordsConfigured,
  returnTo = "/settings/security",
}: {
  initialPolicy: GuestLockPolicy;
  passwordsConfigured: boolean;
  /** Where to return after save (Argus or Trading settings path). */
  returnTo?: string;
}) {
  const [enabled, setEnabled] = useState(initialPolicy.enabled);
  const [hours, setHours] = useState(initialPolicy.hours);
  const [dateFrom, setDateFrom] = useState(initialPolicy.dateFrom ?? "");
  const [dateTo, setDateTo] = useState(initialPolicy.dateTo ?? "");
  const [dailyStart, setDailyStart] = useState(initialPolicy.dailyStart ?? "");
  const [dailyEnd, setDailyEnd] = useState(initialPolicy.dailyEnd ?? "");
  const [indefinite, setIndefinite] = useState(initialPolicy.indefinite);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const form = new FormData(event.currentTarget);
    form.set("enabled", enabled ? "1" : "0");
    form.set("indefinite", indefinite ? "1" : "0");
    form.set("returnTo", returnTo);
    await saveGuestWorkstationLockAction(form);
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="mx-auto max-w-xl space-y-6 px-4 py-8">
      <header>
        <h1 className="text-2xl font-bold text-zinc-50">Guest workstation lock</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Like Apple Screen Time: auto-locks after a timer or outside daily hours / date range. The correct
          password always unlocks again for the configured hours (Ignore Limit), even outside the schedule.
          Same data — not a separate guest user.
        </p>
      </header>

      {!passwordsConfigured ? (
        <p className="rounded-xl border border-amber-500/30 bg-amber-950/30 px-4 py-3 text-sm text-amber-100">
          App passwords are not configured in this environment. Guest lock cannot secure an open deploy — set
          MATRIXTRADE_PASSWORD / ARGUS_PASSWORD first.
        </p>
      ) : null}

      <label className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="rounded border-zinc-600"
        />
        <span>
          <span className="block text-sm font-medium text-zinc-100">Enable guest workstation lock</span>
          <span className="block text-xs text-zinc-500">Off keeps the normal 7-day session cookies.</span>
        </span>
      </label>

      <fieldset disabled={!enabled} className="space-y-4 disabled:opacity-50">
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">Session timer (hours)</span>
          <input
            name="hours"
            type="number"
            min={1}
            max={24}
            value={hours}
            onChange={(e) => setHours(Number(e.target.value) || 4)}
            className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100"
          />
          <span className="mt-1 block text-[11px] text-zinc-600">Each login lasts this long (1–24h), unless daily hours end sooner.</span>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">Active from</span>
            <input
              name="dateFrom"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">Active until</span>
            <input
              name="dateTo"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100"
            />
          </label>
        </div>
        <p className="text-[11px] text-zinc-600">Leave dates empty for no calendar limit. Outside the range → login required.</p>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">Daily start</span>
            <input
              name="dailyStart"
              type="time"
              value={dailyStart}
              onChange={(e) => setDailyStart(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">Daily end</span>
            <input
              name="dailyEnd"
              type="time"
              value={dailyEnd}
              onChange={(e) => setDailyEnd(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100"
            />
          </label>
        </div>
        <p className="text-[11px] text-zinc-600">Optional work window (local time). Outside hours → login required.</p>

        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={indefinite}
            onChange={(e) => setIndefinite(e.target.checked)}
            className="rounded border-zinc-600"
          />
          <span className="text-sm text-zinc-300">
            Keep policy on until I turn it off (sessions still expire on the timer)
          </span>
        </label>
      </fieldset>

      <label className="block">
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">Confirm with password</span>
        <input
          name="password"
          type="password"
          required={passwordsConfigured}
          autoComplete="current-password"
          className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100"
          placeholder="Trading or Argus password"
        />
      </label>

      <button
        type="submit"
        disabled={busy || !passwordsConfigured}
        className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
      >
        {busy ? "Saving…" : "Save guest lock"}
      </button>

      <p className="text-xs text-zinc-600">
        Applies to both MatrixTrade and Argus. Outside the daily window, password still works — it
        starts a timed override for the hours above.
      </p>
    </form>
  );
}
