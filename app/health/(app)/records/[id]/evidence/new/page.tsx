import { EVIDENCE_TYPE_LABELS, EVIDENCE_TYPES } from "@/lib/health-vault/labels";
import { getPeople, getRecord } from "@/lib/health-vault/server-storage";
import { hasHealthSecretUnlock } from "@/lib/auth/cookies";
import { createEvidenceAction } from "@/app/health/actions";
import { EmptyState, Field, inputClass, PageHeader, textareaClass } from "@/app/health/components/ui";

export default async function NewEvidencePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const includeSecret = await hasHealthSecretUnlock();
  const record = await getRecord(id, includeSecret);
  const people = await getPeople();
  const today = new Date().toISOString().slice(0, 10);

  if (!record) {
    return (
      <>
        <PageHeader title="Record unavailable" backHref="/health/records" />
        <EmptyState message="Not found or requires secret unlock." />
      </>
    );
  }

  return (
    <>
      <PageHeader title="New evidence" subtitle={record.title} backHref={`/health/records/${id}`} />
      <form action={createEvidenceAction} className="space-y-4" encType="multipart/form-data">
        <input type="hidden" name="recordId" value={id} />
        <Field label="Type">
          <select name="type" className={inputClass} defaultValue="email">
            {EVIDENCE_TYPES.map((t) => (
              <option key={t} value={t}>
                {EVIDENCE_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Title">
          <input name="title" required className={inputClass} />
        </Field>
        <Field label="Date">
          <input name="date" type="date" required defaultValue={today} className={inputClass} />
        </Field>
        <Field label="Source">
          <input name="source" className={inputClass} placeholder="Outlook, Teams, witness..." />
        </Field>
        <Field label="Content">
          <textarea name="content" required className={textareaClass} placeholder="Paste email, message, or note..." />
        </Field>
        <Field label="Related person (optional)">
          <select name="personId" className={inputClass} defaultValue="">
            <option value="">—</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Attachment (PDF, image, doc — optional)">
          <input name="attachment" type="file" className={inputClass} accept="*/*" />
        </Field>
        <button type="submit" className="w-full rounded-xl bg-teal-600 py-3.5 font-semibold text-white">
          Save evidence
        </button>
      </form>
    </>
  );
}
