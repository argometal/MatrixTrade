"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { saveUnifiedCreateFlowAction } from "@/app/argus/actions";
import { formatArgusError } from "@/lib/argus/persistence/errors";

export function V2RunbookCreateStrip({
  entityId,
  projectId,
  onCreated,
  onCancel,
}: {
  /** Preferred — org / project / topic / event to link on create. */
  entityId?: string;
  /** @deprecated use entityId */
  projectId?: string;
  onCreated?: (runbookId: string) => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const linkId = entityId ?? projectId ?? "";

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!linkId) {
      setError("Missing entity to link.");
      return;
    }
    startTransition(async () => {
      try {
        const result = await saveUnifiedCreateFlowAction({
          mode: "create",
          itemKind: "runbook",
          name: title,
          title: "",
          body,
          notes: "",
          eventDate: "",
          tags: [],
          entryType: "log",
          linkedEntityIds: [linkId],
          linkedLogIds: [],
        });
        setTitle("");
        setBody("");
        onCreated?.(result.id);
        router.refresh();
      } catch (err) {
        const { layer, message } = formatArgusError(err);
        setError(`${layer.toUpperCase()}: ${message}`);
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-4 rounded-2xl border border-dashed border-lime-500/25 bg-lime-500/5 p-4"
    >
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-lime-300/80">New runbook</p>
      <label className="mb-3 block">
        <span className="mb-1 block text-[11px] text-zinc-500">Title</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={isPending}
          placeholder="Weekly checklist"
          className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-lime-500/40 focus:outline-none"
        />
      </label>
      <label className="mb-3 block">
        <span className="mb-1 block text-[11px] text-zinc-500">Checks (one line = one check)</span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          disabled={isPending}
          rows={5}
          placeholder={"Confirm stakeholders\nReview scope\n\n# Follow-up\nSend summary"}
          className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 font-mono text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-lime-500/40 focus:outline-none"
        />
      </label>
      {error ? (
        <p className="mb-3 rounded-lg border border-rose-500/30 bg-rose-950/20 px-3 py-2 text-xs text-rose-200">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={isPending || !title.trim() || !body.trim()}
          className="rounded-xl bg-lime-500/15 px-4 py-2 text-sm font-medium text-lime-300 ring-1 ring-lime-500/30 hover:bg-lime-500/25 disabled:opacity-40"
        >
          {isPending ? "Creating…" : "Create runbook"}
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="rounded-xl px-4 py-2 text-sm text-zinc-500 hover:text-zinc-300"
          >
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}
