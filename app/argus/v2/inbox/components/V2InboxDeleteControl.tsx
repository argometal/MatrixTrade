"use client";

import { useState } from "react";
import { unlockArgusDeleteAction } from "@/app/auth/actions";
import { deleteInboxAction } from "@/app/argus/actions";
import { TESTING } from "@/lib/argus/ux-copy";

export function V2InboxDeleteControl({
  inboxId,
  returnTo,
  deleteUnlocked,
  privateConfigured,
  deleteError,
}: {
  inboxId: string;
  returnTo: string;
  deleteUnlocked: boolean;
  privateConfigured: boolean;
  deleteError?: boolean;
}) {
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pin, setPin] = useState("");

  if (!privateConfigured) {
    return (
      <form
        action={deleteInboxAction}
        className="inline"
        onSubmit={(e) => {
          if (!confirm(TESTING.deleteInboxConfirm)) e.preventDefault();
        }}
      >
        <input type="hidden" name="inboxId" value={inboxId} />
        <input type="hidden" name="returnTo" value={returnTo} />
        <button
          type="submit"
          className="rounded-xl border border-red-900/50 bg-red-950/20 px-4 py-2.5 text-sm font-medium text-red-300 hover:bg-red-950/40"
        >
          {TESTING.deleteInbox}
        </button>
      </form>
    );
  }

  if (!deleteUnlocked) {
    return (
      <>
        <button
          type="button"
          onClick={() => setUnlockOpen(true)}
          className="rounded-xl border border-red-900/40 bg-red-950/15 px-4 py-2.5 text-sm font-medium text-red-300/90 hover:bg-red-950/30"
        >
          Unlock delete (5 min)
        </button>
        {unlockOpen ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setUnlockOpen(false)}
          >
            <form
              action={unlockArgusDeleteAction}
              className="w-full max-w-sm rounded-2xl border border-zinc-700 bg-zinc-900 p-5 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-sm font-medium text-zinc-100">Enable delete for 5 minutes</p>
              <p className="mt-1 text-xs text-zinc-500">
                Enter your PIN once — then you can delete emails until the window expires.
              </p>
              <input type="hidden" name="returnTo" value={returnTo} />
              <input
                name="pin"
                type="password"
                placeholder="PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="mt-3 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
                autoFocus
              />
              {deleteError ? <p className="mt-2 text-xs text-red-400">Wrong PIN</p> : null}
              <div className="mt-4 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-red-700 py-2 text-sm font-medium text-white hover:bg-red-600"
                >
                  Unlock
                </button>
                <button
                  type="button"
                  onClick={() => setUnlockOpen(false)}
                  className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        ) : null}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        className="rounded-xl border border-red-900/50 bg-red-950/20 px-4 py-2.5 text-sm font-medium text-red-300 hover:bg-red-950/40"
      >
        {TESTING.deleteInbox}
      </button>
      {confirmOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setConfirmOpen(false)}
        >
          <form
            action={deleteInboxAction}
            className="w-full max-w-sm rounded-2xl border border-zinc-700 bg-zinc-900 p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-medium text-zinc-100">{TESTING.deleteInbox}</p>
            <p className="mt-2 text-xs text-zinc-500">{TESTING.deleteInboxConfirm}</p>
            <input type="hidden" name="inboxId" value={inboxId} />
            <input type="hidden" name="returnTo" value={returnTo} />
            <div className="mt-4 flex gap-2">
              <button
                type="submit"
                className="flex-1 rounded-lg bg-red-700 py-2 text-sm font-medium text-white hover:bg-red-600"
              >
                Delete
              </button>
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
