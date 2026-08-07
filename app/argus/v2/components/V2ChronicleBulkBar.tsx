"use client";

import { useState } from "react";
import { unlockArgusDeleteAction, unlockArgusDeleteAuthAction } from "@/app/auth/actions";
import { bulkDeleteLogsAction } from "@/app/argus/actions";
import { resolveLinkedDeleteUnlockMode } from "@/lib/argus/delete-unlock-mode";
import { DELETE_AUTH } from "@/lib/argus/ux-copy";
import type { V2ChronicleDeleteLockProps } from "./V2ChronicleNoteDeleteButton";

export function V2ChronicleBulkBar({
  count,
  logIds,
  returnTo,
  requiresAuthenticator = false,
  deleteUnlocked = false,
  deleteAuthUnlocked = false,
  deleteCodeConfigured = false,
  totpConfigured = false,
  deleteAuthConfigured = false,
  deleteError = false,
  deleteAuthError = false,
  onClear,
  onDone,
}: {
  count: number;
  logIds: string[];
  returnTo: string;
  onClear: () => void;
  onDone: () => void;
} & V2ChronicleDeleteLockProps) {
  const [busy, setBusy] = useState(false);
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [code, setCode] = useState("");
  const [totp, setTotp] = useState("");
  const [error, setError] = useState<string | null>(null);

  const unlockMode = resolveLinkedDeleteUnlockMode({
    linkedRequiresAuthenticator: requiresAuthenticator,
    totpConfigured,
    deleteCodeConfigured,
  });
  const [unlockAsAuth, setUnlockAsAuth] = useState(unlockMode === "totp");

  async function runDelete() {
    setBusy(true);
    setError(null);
    try {
      const result = await bulkDeleteLogsAction(logIds);
      if ("error" in result) {
        setDeleteConfirmOpen(false);
        if (result.error === "totp_not_configured") {
          // Prefer PIN path — open code unlock if available.
          if (deleteCodeConfigured) {
            setUnlockAsAuth(false);
            setUnlockOpen(true);
            return;
          }
          setError("Configure a deletion PIN in security settings.");
          return;
        }
        setUnlockAsAuth(result.error === "delete_auth_locked");
        setUnlockOpen(true);
        return;
      }
      onDone();
    } catch {
      setError("Delete failed.");
    } finally {
      setBusy(false);
    }
  }

  function requestDelete() {
    if (!deleteAuthConfigured || unlockMode === "none") {
      setDeleteConfirmOpen(true);
      return;
    }
    if (unlockMode === "totp" && !deleteAuthUnlocked) {
      setUnlockAsAuth(true);
      setUnlockOpen(true);
      return;
    }
    if (unlockMode === "pin" && !deleteUnlocked) {
      setUnlockAsAuth(false);
      setUnlockOpen(true);
      return;
    }
    setDeleteConfirmOpen(true);
  }

  const isAuthUnlock = unlockAsAuth;

  return (
    <>
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-xl border border-red-900/30 bg-red-950/15 px-3 py-2">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold text-red-200/90">{count} selected</span>
          <button type="button" onClick={onClear} className="text-zinc-500 hover:text-zinc-300">
            Clear
          </button>
        </div>
        <button
          type="button"
          disabled={busy || count === 0}
          onClick={requestDelete}
          className="rounded-lg border border-red-900/50 bg-red-950/25 px-2.5 py-1.5 text-[11px] font-semibold text-red-300 hover:bg-red-950/40 disabled:opacity-50"
        >
          Delete
        </button>
        {error ? <p className="w-full text-[11px] text-red-400">{error}</p> : null}
      </div>

      {unlockOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setUnlockOpen(false)}
        >
          <form
            action={isAuthUnlock ? unlockArgusDeleteAuthAction : unlockArgusDeleteAction}
            className="w-full max-w-sm rounded-2xl border border-zinc-700 bg-zinc-900 p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="text-sm font-medium text-zinc-100">
              {isAuthUnlock ? DELETE_AUTH.authenticatorTitle : DELETE_AUTH.codeTitle}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {isAuthUnlock
                ? DELETE_AUTH.authenticatorHint
                : `Enter deletion code — then delete ${count} note${count === 1 ? "" : "s"}.`}
            </p>
            <input type="hidden" name="returnTo" value={returnTo} />
            <input
              name={isAuthUnlock ? "totp" : "code"}
              type={isAuthUnlock ? "text" : "password"}
              inputMode={isAuthUnlock ? "numeric" : undefined}
              autoComplete={isAuthUnlock ? "one-time-code" : "off"}
              placeholder={isAuthUnlock ? "000000" : DELETE_AUTH.codePlaceholder}
              value={isAuthUnlock ? totp : code}
              onChange={(event) =>
                isAuthUnlock ? setTotp(event.target.value) : setCode(event.target.value)
              }
              className="mt-3 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
              autoFocus
            />
            {deleteAuthError && isAuthUnlock ? (
              <p className="mt-2 text-xs text-red-400">{DELETE_AUTH.wrongAuthenticator}</p>
            ) : null}
            {deleteError && !isAuthUnlock ? (
              <p className="mt-2 text-xs text-red-400">{DELETE_AUTH.wrongCode}</p>
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

      {deleteConfirmOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setDeleteConfirmOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-zinc-700 bg-zinc-900 p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="text-sm font-medium text-zinc-100">{DELETE_AUTH.deleteNote}</p>
            <p className="mt-2 text-xs text-zinc-500">{DELETE_AUTH.deleteNotesConfirm(count)}</p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void runDelete()}
                className="flex-1 rounded-lg bg-red-700 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
              >
                Delete {count}
              </button>
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
