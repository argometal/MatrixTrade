"use client";

import { useState } from "react";
import { lockArgusPrivateAction, unlockArgusPrivateAction } from "@/app/auth/actions";
import { PRIVATE } from "@/lib/argus/ux-copy";

export function PrivateLockMenu({
  configured,
  unlocked,
  privateError,
}: {
  configured: boolean;
  unlocked: boolean;
  privateError?: boolean;
}) {
  const [open, setOpen] = useState(false);

  if (!configured) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`rounded-lg p-2 text-lg transition ${
          unlocked ? "text-violet-400 hover:bg-violet-950/40" : "text-zinc-500 hover:bg-zinc-800"
        }`}
        aria-label={unlocked ? PRIVATE.hide : PRIVATE.unlock}
        title={unlocked ? PRIVATE.visible : PRIVATE.unlock}
      >
        {unlocked ? "🔓" : "🔒"}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/40 p-4 pt-16" onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-xs rounded-2xl border border-zinc-700 bg-zinc-900 p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {unlocked ? (
              <form action={lockArgusPrivateAction}>
                <p className="text-sm text-violet-300">{PRIVATE.visible}</p>
                <button
                  type="submit"
                  className="mt-3 w-full rounded-lg border border-violet-800 bg-violet-950/40 py-2 text-sm font-medium text-violet-300"
                >
                  {PRIVATE.hide}
                </button>
              </form>
            ) : (
              <form action={unlockArgusPrivateAction}>
                <p className="text-sm text-zinc-300">{PRIVATE.unlock}</p>
                <p className="mt-1 text-xs text-zinc-500">{PRIVATE.unlockHint}</p>
                <input
                  name="pin"
                  type="password"
                  placeholder="PIN"
                  className="mt-3 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
                  autoFocus
                />
                <button
                  type="submit"
                  className="mt-3 w-full rounded-lg bg-violet-700 py-2 text-sm font-medium text-white"
                >
                  Unlock
                </button>
                {privateError && <p className="mt-2 text-xs text-red-400">Wrong PIN</p>}
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
