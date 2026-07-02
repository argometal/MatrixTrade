import {
  ENTRY_STATUSES,
  ENTRY_STATUS_LABELS,
  ENTRY_TYPE_LABELS,
  ENTRY_TYPES,
  INTERACTION_KINDS,
  INTERACTION_LABELS,
} from "@/lib/argus/labels";
import { getContacts } from "@/lib/argus/server-storage";
import { createEntryAction } from "@/app/argus/actions";
import { Field, inputClass, PageHeader, textareaClass } from "@/app/argus/components/ui";

export default async function NewEntryPage() {
  const contacts = await getContacts();
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <PageHeader title="New entry" subtitle="Objective facts. Attach evidence later." backHref="/argus/entries" />
      <form action={createEntryAction} className="space-y-4">
        <Field label="Type">
          <select name="type" className={inputClass} defaultValue="note">
            {ENTRY_TYPES.map((t) => (
              <option key={t} value={t}>
                {ENTRY_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Title">
          <input name="title" required className={inputClass} placeholder="What happened?" />
        </Field>
        <Field label="Date">
          <input name="date" type="date" required defaultValue={today} className={inputClass} />
        </Field>
        <Field label="Description">
          <textarea
            name="description"
            required
            className={textareaClass}
            placeholder="Who, what, when, where. Stick to facts."
          />
        </Field>
        <Field label="Status">
          <select name="status" className={inputClass} defaultValue="open">
            {ENTRY_STATUSES.map((s) => (
              <option key={s} value={s}>
                {ENTRY_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Interaction tone (if type is Interaction)">
          <select name="interactionKind" className={inputClass} defaultValue="">
            <option value="">—</option>
            {INTERACTION_KINDS.map((k) => (
              <option key={k} value={k}>
                {INTERACTION_LABELS[k]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Tags (comma-separated)">
          <input name="tags" className={inputClass} placeholder="networking, follow-up, slb..." />
        </Field>
        {contacts.length > 0 && (
          <Field label="Related contacts">
            <div className="space-y-2 rounded-xl border border-zinc-800 p-3">
              {contacts.map((c) => (
                <label key={c.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="contactIds" value={c.id} />
                  {c.name} · {c.relationship}
                </label>
              ))}
            </div>
          </Field>
        )}
        <label className="flex items-center gap-2 rounded-xl border border-violet-900/50 bg-violet-950/20 p-3 text-sm text-violet-200">
          <input type="checkbox" name="private" />
          Private entry (PIN required to view)
        </label>
        <button type="submit" className="w-full rounded-xl bg-teal-600 py-3.5 font-semibold text-white">
          Save entry
        </button>
      </form>
    </>
  );
}
