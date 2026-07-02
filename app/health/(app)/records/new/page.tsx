import {
  BEHAVIOR_KINDS,
  BEHAVIOR_LABELS,
  RECORD_STATUSES,
  RECORD_STATUS_LABELS,
  RECORD_TYPE_LABELS,
  RECORD_TYPES,
} from "@/lib/health-vault/labels";
import { getPeople } from "@/lib/health-vault/server-storage";
import { createRecordAction } from "@/app/health/actions";
import { Field, inputClass, PageHeader, textareaClass } from "@/app/health/components/ui";

export default async function NewRecordPage() {
  const people = await getPeople();
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <PageHeader title="New record" backHref="/health/records" />
      <form action={createRecordAction} className="space-y-4">
        <Field label="Type">
          <select name="type" className={inputClass} defaultValue="queja">
            {RECORD_TYPES.map((t) => (
              <option key={t} value={t}>
                {RECORD_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Title">
          <input name="title" required className={inputClass} />
        </Field>
        <Field label="Date of event">
          <input name="date" type="date" required defaultValue={today} className={inputClass} />
        </Field>
        <Field label="Description">
          <textarea name="description" required className={textareaClass} />
        </Field>
        <Field label="Status">
          <select name="status" className={inputClass} defaultValue="abierto">
            {RECORD_STATUSES.map((s) => (
              <option key={s} value={s}>
                {RECORD_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Behavior (if applicable)">
          <select name="behaviorKind" className={inputClass} defaultValue="">
            <option value="">—</option>
            {BEHAVIOR_KINDS.map((b) => (
              <option key={b} value={b}>
                {BEHAVIOR_LABELS[b]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Tags (comma-separated)">
          <input name="tags" className={inputClass} placeholder="hr, meeting, ..." />
        </Field>
        {people.length > 0 && (
          <Field label="People involved">
            <div className="space-y-2 rounded-xl border border-zinc-800 p-3">
              {people.map((p) => (
                <label key={p.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="personIds" value={p.id} />
                  {p.name} · {p.relationship}
                </label>
              ))}
            </div>
          </Field>
        )}
        <label className="flex items-center gap-2 rounded-xl border border-violet-900/50 bg-violet-950/20 p-3 text-sm text-violet-200">
          <input type="checkbox" name="secret" />
          Secret record (PIN required to view)
        </label>
        <button type="submit" className="w-full rounded-xl bg-teal-600 py-3.5 font-semibold text-white">
          Save record
        </button>
      </form>
    </>
  );
}
