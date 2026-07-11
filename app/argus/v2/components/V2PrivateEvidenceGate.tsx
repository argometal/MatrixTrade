"use client";

import { unlockArgusPrivateAction } from "@/app/auth/actions";
import { PRIVATE } from "@/lib/argus/ux-copy";

/** Blocks detail content when protected evidence exists and private unlock is off. */
export function V2PrivateEvidenceGate({
  locked,
  privateConfigured,
  returnTo,
  children,
}: {
  locked: boolean;
  privateConfigured: boolean;
  returnTo: string;
  children: React.ReactNode;
}) {
  if (!locked) return <>{children}</>;

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 px-5 py-8 text-center">
      <p className="text-base font-medium text-amber-100">Protected evidence</p>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-amber-200/80">
        This record includes secret or private evidence. Enter your PIN to view linked data.
      </p>
      {privateConfigured ? (
        <form action={unlockArgusPrivateAction} className="mx-auto mt-5 max-w-xs text-left">
          <input type="hidden" name="returnTo" value={returnTo} />
          <label className="block text-xs text-zinc-500">{PRIVATE.unlock}</label>
          <input
            name="pin"
            type="password"
            inputMode="numeric"
            placeholder="PIN"
            className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100"
            autoFocus
            required
          />
          <button
            type="submit"
            className="mt-3 w-full rounded-lg bg-violet-600 py-2.5 text-sm font-medium text-white hover:bg-violet-500"
          >
            {PRIVATE.unlock}
          </button>
        </form>
      ) : (
        <p className="mt-4 text-xs text-zinc-500">Set ARGUS_PRIVATE_PIN to enable protected records.</p>
      )}
    </div>
  );
}
