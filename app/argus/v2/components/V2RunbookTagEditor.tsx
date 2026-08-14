"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { updateRunbookTagsAction } from "@/app/argus/actions";
import { V2VocabularyListEditor } from "@/app/argus/v2/components/V2VocabularyListEditor";
import { normalizeTagDisplay, tagKey } from "@/lib/argus/tag-ontology";
import { formatArgusError } from "@/lib/argus/persistence/errors";

/** Classification tags on a runbook template — same tag strings as the rest of ARGUS. */
export function V2RunbookTagEditor({
  runbookId,
  runbookTitle,
  initialTags,
  suggestedTags = [],
}: {
  runbookId: string;
  runbookTitle: string;
  initialTags: string[];
  suggestedTags?: string[];
}) {
  const router = useRouter();
  const [tags, setTags] = useState<string[]>(initialTags);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTags(initialTags);
    setDraft("");
    setError(null);
  }, [runbookId, initialTags]);

  const attachedKeys = useMemo(() => new Set(tags.map(tagKey).filter(Boolean)), [tags]);

  const suggestions = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const raw of suggestedTags) {
      const tag = normalizeTagDisplay(raw);
      const key = tagKey(tag);
      if (!tag || !key || attachedKeys.has(key) || seen.has(key)) continue;
      seen.add(key);
      out.push(tag);
    }
    return out.slice(0, 12);
  }, [suggestedTags, attachedKeys]);

  function addTag() {
    const next = normalizeTagDisplay(draft);
    if (!next || tags.some((tag) => tagKey(tag) === tagKey(next))) {
      setDraft("");
      return;
    }
    setTags((current) => [...current, next]);
    setDraft("");
  }

  const dirty =
    tags.length !== initialTags.length || tags.some((tag, index) => tag !== initialTags[index]);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await updateRunbookTagsAction(runbookId, tags);
      router.refresh();
    } catch (err) {
      const { message } = formatArgusError(err);
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="runbook-no-print rounded-2xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-3">
      <V2VocabularyListEditor
        items={tags}
        draft={draft}
        onDraftChange={setDraft}
        onAdd={addTag}
        onRemove={(item) => setTags((current) => current.filter((tag) => tag !== item))}
        copy={{
          heading: "Tags",
          hint: "Existing ARGUS tags classify this procedure. They are not evidence and do not create Patterns.",
          placeholder: "Add an existing tag…",
          add: "+ Tag",
          empty: "No tags on this runbook yet.",
          removeAria: (item) => `Remove ${item} from this runbook`,
        }}
        inputAriaLabel={`Add tag for runbook ${runbookTitle}`}
        footer={
          <div className="space-y-2">
            {suggestions.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setTags((current) => [...current, tag])}
                    className="rounded-lg border border-zinc-800 px-2 py-1 text-[11px] text-zinc-400 hover:border-lime-500/40 hover:text-lime-300"
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => void save()}
              disabled={!dirty || busy}
              className="rounded-lg bg-lime-600 px-3 py-2 text-xs font-semibold text-zinc-950 hover:bg-lime-500 disabled:opacity-40"
            >
              {busy ? "Saving…" : "Save tags"}
            </button>
            {error ? <p className="text-xs text-rose-300">{error}</p> : null}
          </div>
        }
      />
    </div>
  );
}
