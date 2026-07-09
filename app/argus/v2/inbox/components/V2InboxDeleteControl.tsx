"use client";

import { useState } from "react";
import { unlockArgusDeleteAction, unlockArgusDeleteAuthAction } from "@/app/auth/actions";
import { deleteInboxAction } from "@/app/argus/actions";
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

  if (!deleteAuthConfigured) {
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

  if (requiresAuthenticator && !totpConfigured) {
    return (
      <div className="rounded-xl border border-amber-900/40 bg-amber-950/20 px-4 py-2.5 text-xs text-amber-200/90">
        {DELETE_AUTH.totpNotConfigured}
      </div>
    );
  }

  const needsUnlock = requiresAuthenticator ? !deleteAuthUnlocked : deleteCodeConfigured && !deleteUnlocked;

  if (needsUnlock) {
    const isAuth = requiresAuthenticator;
    return (
      <>
        <button
          type="button"
          onClick={() => setUnlockOpen(true)}
          className="rounded-xl border border-red-900/40 bg-red-950/15 px-4 py-2.5 text-sm font-medium text-red-300/90 hover:bg-red-950/30"
        >
          {isAuth ? DELETE_AUTH.unlockAuthenticator : DELETE_AUTH.unlockCode}
        </button>
        {unlockOpen ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setUnlockOpen(false)}
          >
            <form
              action={isAuth ? unlockArgusDeleteAuthAction : unlockArgusDeleteAction}
              className="w-full max-w-sm rounded-2xl border border-zinc-700 bg-zinc-900 p-5 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-sm font-medium text-zinc-100">
                {isAuth ? DELETE_AUTH.authenticatorTitle : DELETE_AUTH.codeTitle}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                {isAuth ? DELETE_AUTH.authenticatorHint : DELETE_AUTH.codeHint}
              </p>
              <input type="hidden" name="returnTo" value={returnTo} />
              <input
                name={isAuth ? "totp" : "code"}
                type={isAuth ? "text" : "password"}
                inputMode={isAuth ? "numeric" : undefined}
                autoComplete={isAuth ? "one-time-code" : "off"}
                placeholder={isAuth ? "000000" : DELETE_AUTH.codePlaceholder}
                value={isAuth ? totp : code}
                onChange={(e) => (isAuth ? setTotp(e.target.value) : setCode(e.target.value))}
                className="mt-3 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
                autoFocus
              />
              {deleteAuthError && isAuth ? (
                <p className="mt-2 text-xs text-red-400">{DELETE_AUTH.wrongAuthenticator}</p>
              ) : null}
              {deleteError && !isAuth ? (
                <p className="mt-2 text-xs text-red-400">{DELETE_AUTH.wrongCode}</p>
              ) : null}
              {totpRequired && isAuth ? (
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
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-medium text-zinc-100">{DELETE_AUTH.deleteInbox}</p>
            <p className="mt-2 text-xs text-zinc-500">
              {requiresAuthenticator ? DELETE_AUTH.deleteLinkedConfirm : DELETE_AUTH.deleteInboxConfirm}
            </p>
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
