"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { updateTopicAliasesAction } from "@/app/argus/actions";
import { TOPIC_ALIASES } from "@/lib/argus/ux-copy";

function normalizeAlias(value: string): string {
  return value.trim().toLowerCase();
}

export function V2TopicAliasEditor({
  topicId,
  topicName,
  initialAliases,
  returnTo,
}: {
  topicId: string;
  topicName: string;
  initialAliases: string[];
  returnTo: string;
}) {
  const router = useRouter();
  const [aliases, setAliases] = useState<string[]>(initialAliases);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setAliases(initialAliases);
    setDraft("");
  }, [topicId, initialAliases]);

  function addAlias() {
    const next = normalizeAlias(draft);
    if (!next || aliases.some((alias) => alias.toLowerCase() === next)) {
      setDraft("");
      return;
    }
    setAliases((current) => [...current, next]);
    setDraft("");
  }

  function removeAlias(alias: string) {
    setAliases((current) => current.filter((value) => value !== alias));
  }

  async function saveAliases() {
    setBusy(true);
    try {
      const formData = new FormData();
      formData.set("entityId", topicId);
      formData.set("linkedTags", aliases.join(", "));
      formData.set("returnTo", returnTo);
      await updateTopicAliasesAction(formData);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const dirty =
    aliases.length !== initialAliases.length ||
    aliases.some((alias, index) => alias !== initialAliases[index]);

  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-4">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-zinc-100">{TOPIC_ALIASES.heading}</h3>
        <p className="mt-1 text-xs leading-relaxed text-zinc-500">{TOPIC_ALIASES.hint}</p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {aliases.map((alias) => (
          <span
            key={alias}
            className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-200"
          >
            {alias}
            <button
              type="button"
              onClick={() => removeAlias(alias)}
              className="text-amber-400/70 hover:text-amber-100"
              aria-label={`Remove alias ${alias}`}
            >
              ×
            </button>
          </span>
        ))}
        {aliases.length === 0 ? (
          <p className="text-xs text-zinc-600">{TOPIC_ALIASES.empty}</p>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addAlias();
            }
          }}
          placeholder={TOPIC_ALIASES.placeholder}
          className="min-w-[10rem] flex-1 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600"
          aria-label={`Add alias for ${topicName}`}
        />
        <button
          type="button"
          onClick={addAlias}
          disabled={!draft.trim()}
          className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"
        >
          {TOPIC_ALIASES.add}
        </button>
        <button
          type="button"
          onClick={() => void saveAliases()}
          disabled={!dirty || busy}
          className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-40"
        >
          {busy ? "Saving…" : TOPIC_ALIASES.save}
        </button>
      </div>
    </div>
  );
}
