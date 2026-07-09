"use client";

import { useState } from "react";
import { unlockArgusDeleteAction } from "@/app/auth/actions";
import {
  bulkArchiveInboxAction,
  bulkDeleteInboxAction,
  bulkMergeInboxTopicsAction,
} from "@/app/argus/actions";
import { TagPickerModal, type TagBuckets } from "@/app/argus/components/TagPickerModal";
import { TESTING } from "@/lib/argus/ux-copy";

export function V2InboxBulkBar({
  count,
  inboxIds,
  tagBuckets,
  deleteUnlocked,
  privateConfigured,
  returnTo,
  onClear,
  onDone,
}: {
  count: number;
  inboxIds: string[];
  tagBuckets: TagBuckets;
  deleteUnlocked: boolean;
  privateConfigured: boolean;
  returnTo: string;
  onClear: () => void;
  onDone: () => void;
}) {
  const [tagOpen, setTagOpen] = useState(false);
  const [pendingTags, setPendingTags] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [pin, setPin] = useState("");
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
      if ("error" in result && result.error === "delete_locked") {
        setDeleteConfirmOpen(false);
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
    if (privateConfigured && !deleteUnlocked) {
      setUnlockOpen(true);
      return;
    }
    setDeleteConfirmOpen(true);
  }

  return (
    <>
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-violet-500/25 bg-violet-500/10 px-4 py-2.5 lg:px-5">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold text-violet-200">
            {count} selected
          </span>
          <button
            type="button"
            onClick={onClear}
            className="text-zinc-500 hover:text-zinc-300"
          >
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
            action={unlockArgusDeleteAction}
            className="w-full max-w-sm rounded-2xl border border-zinc-700 bg-zinc-900 p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-medium text-zinc-100">Enable delete for 5 minutes</p>
            <p className="mt-1 text-xs text-zinc-500">
              Enter your PIN once — then you can delete {count} item{count === 1 ? "" : "s"}.
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

      {deleteConfirmOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setDeleteConfirmOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-zinc-700 bg-zinc-900 p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-medium text-zinc-100">{TESTING.deleteInbox}</p>
            <p className="mt-2 text-xs text-zinc-500">
              Delete {count} email{count === 1 ? "" : "s"}? Soft-delete — recoverable from backup.
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
