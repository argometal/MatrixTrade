"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { saveUnifiedCreateFlowAction } from "@/app/argus/actions";
import { formatArgusError } from "@/lib/argus/persistence/errors";
import { normalizeTagList } from "@/lib/argus/tag-ontology";

export function V2RunbookCreateStrip({
  entityId,
  initialTags = [],
  onCreated,
  onCancel,
}: {
  /** Org / project / topic / event to link on create. */
  entityId?: string;
  /** Classification tags to prefill (e.g. tags that caused a suggestion match). */
  initialTags?: string[];
  onCreated?: (runbookId: string) => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState<string[]>(() => normalizeTagList(initialTags));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const linkId = entityId ?? "";

  useEffect(() => {
    setTags(normalizeTagList(initialTags));
  }, [initialTags]);

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
          tags: normalizeTagList(tags),
          entryType: "log",
          linkedEntityIds: [linkId],
          linkedLogIds: [],
        });
        setTitle("");
        setBody("");
        setTags([]);
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
      {tags.length > 0 ? (
        <div className="mb-3">
          <p className="mb-1 text-[11px] text-zinc-500">Classification tags (from match)</p>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-lg border border-lime-500/25 bg-lime-500/10 px-2 py-1 text-[11px] text-lime-200"
              >
                #{tag}
              </span>
            ))}
          </div>
          <p className="mt-1.5 text-[10px] text-zinc-600">
            Saved on the library template only — Assign stays a separate, explicit step.
          </p>
        </div>
      ) : null}
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
