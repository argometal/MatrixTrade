"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { applyInboxItemAction, rejectInboxItemAction } from "@/app/actions";

export function InboxApplyActions({
  id,
  origin,
  applyReady,
}: {
  id: string;
  origin: string;
  applyReady: boolean;
}) {
  const router = useRouter();
  const [applyError, setApplyError] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);
  const [pending, startTransition] = useTransition();
  const applyingRef = useRef(false);

  function handleApply() {
    if (!applyReady || pending || applyingRef.current || applied) return;
    applyingRef.current = true;
    setApplyError(null);
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("id", id);
        formData.set("origin", origin);
        await applyInboxItemAction(formData);
        setApplied(true);
        router.refresh();
      } catch (err) {
        setApplyError(err instanceof Error ? err.message : "Apply failed.");
        applyingRef.current = false;
      }
    });
  }

  if (applied) {
    return (
      <div className="space-y-3">
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-200">
          Apply submitted. Refresh History if needed — duplicates are blocked.
          server-side.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {applyError ? (
        <div className="rounded-lg border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          {applyError}
        </div>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={!applyReady || pending}
          onClick={handleApply}
          className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Applying…" : "Apply to MatrixTrade"}
        </button>
        <form action={rejectInboxItemAction}>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="origin" value={origin} />
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 hover:border-zinc-600 hover:bg-zinc-900 disabled:opacity-50"
          >
            Reject
          </button>
        </form>
      </div>
    </div>
  );
}
