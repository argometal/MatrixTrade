"use client";

import { useState } from "react";
import { unlockArgusDeleteAction, unlockArgusDeleteAuthAction } from "@/app/auth/actions";
import {
  bulkArchiveInboxAction,
  bulkDeleteInboxAction,
  bulkMergeInboxTopicsAction,
} from "@/app/argus/actions";
import { TagPickerModal, type TagBuckets } from "@/app/argus/components/TagPickerModal";
import { DELETE_AUTH } from "@/lib/argus/ux-copy";

export function V2InboxBulkBar({
  count,
  inboxIds,
  tagBuckets,
  requiresAuthenticator,
  deleteUnlocked,
  deleteAuthUnlocked,
  deleteCodeConfigured,
  totpConfigured,
  deleteAuthConfigured,
  returnTo,
  deleteError,
  deleteAuthError,
  onClear,
  onDone,
}: {
  count: number;
  inboxIds: string[];
  tagBuckets: TagBuckets;
  requiresAuthenticator: boolean;
  deleteUnlocked: boolean;
  deleteAuthUnlocked: boolean;
  deleteCodeConfigured: boolean;
  totpConfigured: boolean;
  deleteAuthConfigured: boolean;
  returnTo: string;
  deleteError?: boolean;
  deleteAuthError?: boolean;
  onClear: () => void;
  onDone: () => void;
}) {
  const [tagOpen, setTagOpen] = useState(false);
  const [pendingTags, setPendingTags] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [code, setCode] = useState("");
  const [totp, setTotp] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function runArchive() {
    setBusy(true);
    setError(null);
    try {
      await bulkArchiveInboxAction(inboxIds);
      onDone();
    } catch {
      setError("Archive failed.");
    } finally {
      setBusy(false);
    }
  }

  async function applyTags(tags: string[]) {
    if (tags.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      await bulkMergeInboxTopicsAction(inboxIds, tags);
      setTagOpen(false);
      setPendingTags([]);
      onDone();
    } catch {
      setError("Could not assign tags.");
    } finally {
      setBusy(false);
    }
  }

  async function runDelete() {
    setBusy(true);
    setError(null);
    try {
      const result = await bulkDeleteInboxAction(inboxIds);
      if ("error" in result) {
        setDeleteConfirmOpen(false);
        if (result.error === "totp_not_configured") {
          setError(DELETE_AUTH.totpNotConfigured);
          return;
        }
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
    if (!deleteAuthConfigured) {
      setDeleteConfirmOpen(true);
      return;
    }
    if (requiresAuthenticator && !totpConfigured) {
      setError(DELETE_AUTH.totpNotConfigured);
      return;
    }
    const needsUnlock = requiresAuthenticator ? !deleteAuthUnlocked : deleteCodeConfigured && !deleteUnlocked;
    if (needsUnlock) {
      setUnlockOpen(true);
      return;
    }
    setDeleteConfirmOpen(true);
  }

  const isAuthUnlock = requiresAuthenticator;

  return (
    <>
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-violet-500/25 bg-violet-500/10 px-4 py-2.5 lg:px-5">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold text-violet-200">{count} selected</span>
          <button type="button" onClick={onClear} className="text-zinc-500 hover:text-zinc-300">
            Clear
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setPendingTags([]);
              setTagOpen(true);
            }}
            className="rounded-lg border border-violet-500/35 bg-violet-600/15 px-2.5 py-1.5 text-[11px] font-semibold text-violet-200 hover:bg-violet-600/25 disabled:opacity-50"
          >
            Assign topic
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void runArchive()}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-[11px] font-semibold text-zinc-200 hover:bg-zinc-700 disabled:opacity-50"
          >
            Archive
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={requestDelete}
            className="rounded-lg border border-red-900/50 bg-red-950/25 px-2.5 py-1.5 text-[11px] font-semibold text-red-300 hover:bg-red-950/40 disabled:opacity-50"
          >
            Delete
          </button>
        </div>
        {error ? <p className="w-full text-[11px] text-red-400">{error}</p> : null}
      </div>

      <TagPickerModal
        open={tagOpen}
        buckets={tagBuckets}
        selectedTags={pendingTags}
        onChange={setPendingTags}
        onClose={() => setTagOpen(false)}
        onConfirm={(tags) => void applyTags(tags)}
        confirmLabel={`Apply to ${count}`}
      />

      {unlockOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setUnlockOpen(false)}
        >
          <form
            action={isAuthUnlock ? unlockArgusDeleteAuthAction : unlockArgusDeleteAction}
            className="w-full max-w-sm rounded-2xl border border-zinc-700 bg-zinc-900 p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-medium text-zinc-100">
              {isAuthUnlock ? DELETE_AUTH.authenticatorTitle : DELETE_AUTH.codeTitle}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {isAuthUnlock
                ? DELETE_AUTH.authenticatorHint
                : `Enter deletion code — then delete ${count} item${count === 1 ? "" : "s"}.`}
            </p>
            <input type="hidden" name="returnTo" value={returnTo} />
            <input
              name={isAuthUnlock ? "totp" : "code"}
              type={isAuthUnlock ? "text" : "password"}
              inputMode={isAuthUnlock ? "numeric" : undefined}
              autoComplete={isAuthUnlock ? "one-time-code" : "off"}
              placeholder={isAuthUnlock ? "000000" : DELETE_AUTH.codePlaceholder}
              value={isAuthUnlock ? totp : code}
              onChange={(e) => (isAuthUnlock ? setTotp(e.target.value) : setCode(e.target.value))}
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
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-medium text-zinc-100">{DELETE_AUTH.deleteInbox}</p>
            <p className="mt-2 text-xs text-zinc-500">
              {requiresAuthenticator
                ? DELETE_AUTH.deleteLinkedConfirm
                : `Delete ${count} email${count === 1 ? "" : "s"}? Soft-delete — recoverable from backup.`}
            </p>
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
