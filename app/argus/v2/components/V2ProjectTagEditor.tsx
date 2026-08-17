"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { updateProjectTagsAction } from "@/app/argus/actions";
import { V2VocabularyListEditor } from "@/app/argus/v2/components/V2VocabularyListEditor";
import { TAG_MANAGE_LIST_CLASS, TAG_MANAGE_ROW_CLASS } from "@/app/argus/v2/components/tag-manage-list";

function normalizeDisplayTag(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function tagKey(value: string): string {
  return normalizeDisplayTag(value).toLowerCase();
}

export function V2ProjectTagEditor({
  projectId,
  projectName,
  initialTags,
  returnTo,
  suggestedFromNotes = [],
  signalTags = [],
}: {
  projectId: string;
  projectName: string;
  initialTags: string[];
  returnTo: string;
  suggestedFromNotes?: string[];
  /** Journal Trackers — passive ⚑ on binder rows (Home Tags watch list). */
  signalTags?: string[];
}) {
  const router = useRouter();
  const [matchTags, setMatchTags] = useState<string[]>(initialTags);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setMatchTags(initialTags);
    setDraft("");
  }, [projectId, initialTags]);

  const attachedKeys = useMemo(
    () => new Set(matchTags.map(tagKey).filter(Boolean)),
    [matchTags]
  );

  const trackedKeys = useMemo(
    () => new Set(signalTags.map(tagKey).filter(Boolean)),
    [signalTags]
  );

  const suggestions = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const raw of suggestedFromNotes) {
      const tag = normalizeDisplayTag(raw);
      const key = tagKey(tag);
      if (!tag || !key || attachedKeys.has(key) || seen.has(key)) continue;
      seen.add(key);
      out.push(tag);
    }
    return out.sort((a, b) => a.localeCompare(b));
  }, [suggestedFromNotes, attachedKeys]);

  function addMatchTag() {
    const next = normalizeDisplayTag(draft);
    if (!next || matchTags.some((tag) => tagKey(tag) === tagKey(next))) {
      setDraft("");
      return;
    }
    setMatchTags((current) => [...current, next]);
    setDraft("");
  }

  function attachSuggestion(tag: string) {
    const next = normalizeDisplayTag(tag);
    if (!next || matchTags.some((t) => tagKey(t) === tagKey(next))) return;
    setMatchTags((current) => [...current, next]);
  }

  function removeMatchTag(tag: string) {
    setMatchTags((current) => current.filter((value) => value !== tag));
  }

  async function saveMatchTags() {
    setBusy(true);
    try {
      const formData = new FormData();
      formData.set("entityId", projectId);
      formData.set("projectTags", matchTags.join(", "));
      formData.set("returnTo", returnTo);
      await updateProjectTagsAction(formData);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const dirty =
    matchTags.length !== initialTags.length ||
    matchTags.some((tag, index) => tag !== initialTags[index]);

  return (
    <div>
      <V2VocabularyListEditor
        items={matchTags}
        draft={draft}
        onDraftChange={setDraft}
        onAdd={addMatchTag}
        onRemove={removeMatchTag}
        copy={{
          placeholder: "Add a tag linked to this Project…",
          add: "+ Add Tag",
          empty: "No tags linked to this Project yet — add one below.",
          removeAria: (item) => `Remove ${item} from Project Tags`,
        }}
        orientation="stack"
        trackedKeys={trackedKeys}
        inputAriaLabel={`Add Project Tag for ${projectName}`}
        footer={
          <button
            type="button"
            onClick={() => void saveMatchTags()}
            disabled={!dirty || busy}
            className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-40"
          >
            {busy ? "Saving…" : "Save Tags"}
          </button>
        }
      />

      {suggestions.length > 0 ? (
        <div className="mt-3 rounded-xl border border-sky-500/25 bg-sky-950/20 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-200/90">
            On Notes — attach to this Project
          </p>
          <ul className={`mt-2 ${TAG_MANAGE_LIST_CLASS}`} aria-label="Evidence Tags to attach">
            {suggestions.map((tag) => (
              <li key={tag}>
                <button
                  type="button"
                  onClick={() => attachSuggestion(tag)}
                  className={`${TAG_MANAGE_ROW_CLASS} hover:border-sky-500/40`}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-600/20 text-xs font-bold text-sky-100">
                    #
                  </span>
                  <span className="min-w-0 flex-1 truncate font-semibold text-zinc-100">{tag}</span>
                  <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-sky-300/90">
                    Attach
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
