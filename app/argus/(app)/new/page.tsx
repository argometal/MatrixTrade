import Link from "next/link";
import { ENTITY_TYPES, ENTITY_TYPE_LABELS, JOURNAL_KINDS, JOURNAL_KIND_LABELS } from "@/lib/argus/labels";
import { searchEntities } from "@/lib/argus/server-storage";
import { createLogAction } from "@/app/argus/actions";
import { Field, inputClass, PageHeader, textareaClass } from "@/app/argus/components/ui";

export default async function NewLogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; kind?: string }>;
}) {
  const { q, kind } = await searchParams;
  const entities = await searchEntities(q ?? "");
  const today = new Date().toISOString().slice(0, 10);
  const defaultKind = JOURNAL_KINDS.includes(kind as (typeof JOURNAL_KINDS)[number])
    ? kind
    : "log";

  return (
    <>
      <PageHeader title="New journal entry" subtitle="Link at least one entity" backHref="/argus/journal" />

      <div className="mb-5 flex gap-2">
        <form action="/argus/new" method="get" className="flex flex-1 gap-2">
          <input name="q" defaultValue={q ?? ""} placeholder="Search entities..." className={inputClass} />
          <button type="submit" className="shrink-0 rounded-xl bg-zinc-700 px-4 py-2 text-sm text-white">
            Search
          </button>
        </form>
      </div>

      <form action={createLogAction} className="space-y-5">
        <Field label="Type">
          <select name="kind" className={inputClass} defaultValue={defaultKind}>
            {JOURNAL_KINDS.map((k) => (
              <option key={k} value={k}>
                {JOURNAL_KIND_LABELS[k]}
              </option>
            ))}
          </select>
        </Field>

        {entities.length > 0 && (
          <Field label="Link entities">
            <div className="max-h-48 space-y-2 overflow-y-auto rounded-xl border border-zinc-800 p-3">
              {entities.map((e) => (
                <label key={e.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="entityIds" value={e.id} />
                  <span className="text-zinc-300">
                    {ENTITY_TYPE_LABELS[e.type]} · {e.name}
                  </span>
                </label>
              ))}
            </div>
          </Field>
        )}

        {entities.length === 0 && q && (
          <p className="text-sm text-zinc-500">No entities match. Create one below.</p>
        )}

        <details className="rounded-xl border border-zinc-800 p-3" open={entities.length === 0}>
          <summary className="cursor-pointer text-sm font-medium text-zinc-300">Create new entity</summary>
          <div className="mt-3 space-y-3">
            <Field label="Name">
              <input name="newEntityName" className={inputClass} placeholder="Person, company, or project" />
            </Field>
            <Field label="Type">
              <select name="newEntityType" className={inputClass} defaultValue="person">
                {ENTITY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {ENTITY_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Notes (optional)">
              <input name="newEntityNotes" className={inputClass} placeholder="Context..." />
            </Field>
          </div>
        </details>

        <Field label="Title">
          <input name="title" required className={inputClass} placeholder="What happened?" />
        </Field>
        <Field label="Date">
          <input name="date" type="date" required defaultValue={today} className={inputClass} />
        </Field>
        <Field label="Follow-up date (for follow-up type)">
          <input name="followUpDate" type="date" className={inputClass} />
        </Field>
        <Field label="What happened">
          <textarea
            name="body"
            required
            className={textareaClass}
            placeholder="Facts only. Who, what, when, where."
          />
        </Field>
        <Field label="Topics (comma-separated)">
          <input name="topics" className={inputClass} placeholder="networking, project-x, intro..." />
        </Field>
        <Field label="Attachment (optional)">
          <input name="attachment" type="file" className={inputClass} accept="*/*" />
        </Field>
        <label className="flex items-center gap-2 rounded-xl border border-violet-900/50 bg-violet-950/20 p-3 text-sm text-violet-200">
          <input type="checkbox" name="private" />
          Private
        </label>
        <input type="hidden" name="source" value="manual" />
        <button type="submit" className="w-full rounded-xl bg-teal-600 py-3.5 font-semibold text-white">
          Save
        </button>
      </form>

      <p className="mt-4 text-center text-xs text-zinc-600">
        <Link href="/argus/search" className="underline">
          Browse all entities
        </Link>
      </p>
    </>
  );
}
