"use client";

import { useState } from "react";
import { unlockArgusDeleteAction, unlockArgusDeleteAuthAction } from "@/app/auth/actions";
import { deleteInboxAction } from "@/app/argus/actions";
import { resolveLinkedDeleteUnlockMode } from "@/lib/argus/delete-unlock-mode";
import { DELETE_AUTH } from "@/lib/argus/ux-copy";

export function V2InboxDeleteControl({
  inboxId,
  returnTo,
  requiresAuthenticator,
  deleteUnlocked,
  deleteAuthUnlocked,
  deleteCodeConfigured,
  totpConfigured,
  deleteAuthConfigured,
  deleteError,
  deleteAuthError,
  totpRequired,
}: {
  inboxId: string;
  returnTo: string;
  requiresAuthenticator: boolean;
  deleteUnlocked: boolean;
  deleteAuthUnlocked: boolean;
  deleteCodeConfigured: boolean;
  totpConfigured: boolean;
  deleteAuthConfigured: boolean;
  deleteError?: boolean;
  deleteAuthError?: boolean;
  totpRequired?: boolean;
}) {
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [code, setCode] = useState("");
  const [totp, setTotp] = useState("");

  const unlockMode = resolveLinkedDeleteUnlockMode({
    linkedRequiresAuthenticator: requiresAuthenticator,
    totpConfigured,
    deleteCodeConfigured,
  });
  const useAuth = unlockMode === "totp";
  const needsUnlock =
    unlockMode === "totp"
      ? !deleteAuthUnlocked
      : unlockMode === "pin"
        ? !deleteUnlocked
        : false;

  if (!deleteAuthConfigured || unlockMode === "none") {
    return (
      <form
        action={deleteInboxAction}
        className="inline"
        onSubmit={(e) => {
          if (!confirm(DELETE_AUTH.deleteInboxConfirm)) e.preventDefault();
        }}
      >
        <input type="hidden" name="inboxId" value={inboxId} />
        <input type="hidden" name="returnTo" value={returnTo} />
        <button
          type="submit"
          className="rounded-xl border border-red-900/50 bg-red-950/20 px-4 py-2.5 text-sm font-medium text-red-300 hover:bg-red-950/40"
        >
          {DELETE_AUTH.deleteInbox}
        </button>
      </form>
    );
  }

  if (needsUnlock) {
    return (
      <>
        <button
          type="button"
          onClick={() => setUnlockOpen(true)}
          className="rounded-xl border border-red-900/40 bg-red-950/15 px-4 py-2.5 text-sm font-medium text-red-300/90 hover:bg-red-950/30"
        >
          {useAuth ? DELETE_AUTH.unlockAuthenticator : DELETE_AUTH.unlockCode}
        </button>
        {unlockOpen ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setUnlockOpen(false)}
          >
            <form
              action={useAuth ? unlockArgusDeleteAuthAction : unlockArgusDeleteAction}
              className="w-full max-w-sm rounded-2xl border border-zinc-700 bg-zinc-900 p-5 shadow-xl"
              onClick={(event) => event.stopPropagation()}
            >
              <p className="text-sm font-medium text-zinc-100">
                {useAuth ? DELETE_AUTH.authenticatorTitle : DELETE_AUTH.codeTitle}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                {useAuth ? DELETE_AUTH.authenticatorHint : DELETE_AUTH.codeHint}
              </p>
              <input type="hidden" name="returnTo" value={returnTo} />
              <input
                name={useAuth ? "totp" : "code"}
                type={useAuth ? "text" : "password"}
                inputMode={useAuth ? "numeric" : undefined}
                autoComplete={useAuth ? "one-time-code" : "off"}
                placeholder={useAuth ? "000000" : DELETE_AUTH.codePlaceholder}
                value={useAuth ? totp : code}
                onChange={(event) =>
                  useAuth ? setTotp(event.target.value) : setCode(event.target.value)
                }
                className="mt-3 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
                autoFocus
                required
              />
              {deleteAuthError && useAuth ? (
                <p className="mt-2 text-xs text-red-400">{DELETE_AUTH.wrongAuthenticator}</p>
              ) : null}
              {deleteError && !useAuth ? (
                <p className="mt-2 text-xs text-red-400">{DELETE_AUTH.wrongCode}</p>
              ) : null}
              {totpRequired && useAuth ? (
                <p className="mt-2 text-xs text-amber-400">{DELETE_AUTH.linkedRequiresAuth}</p>
              ) : null}
              <div className="mt-4 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-red-700 py-2 text-sm font-medium text-white hover:bg-red-600"
                >
                  {DELETE_AUTH.unlockButton}
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
        {DELETE_AUTH.deleteInbox}
      </button>
      {confirmOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setConfirmOpen(false)}
        >
          <form
            action={deleteInboxAction}
            className="w-full max-w-sm rounded-2xl border border-zinc-700 bg-zinc-900 p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="text-sm font-medium text-zinc-100">{DELETE_AUTH.deleteInbox}</p>
            <p className="mt-2 text-xs text-zinc-500">{DELETE_AUTH.deleteInboxConfirm}</p>
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
