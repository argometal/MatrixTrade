import { EVIDENCE_TYPE_LABELS, EVIDENCE_TYPES } from "@/lib/argus/labels";
import { getContacts, getEntry } from "@/lib/argus/server-storage";
import { hasArgusPrivateUnlock } from "@/lib/auth/cookies";
import { createEvidenceAction } from "@/app/argus/actions";
import { EmptyState, Field, inputClass, PageHeader, textareaClass } from "@/app/argus/components/ui";

export default async function NewEvidencePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const includePrivate = await hasArgusPrivateUnlock();
  const entry = await getEntry(id, includePrivate);
  const contacts = await getContacts();
  const today = new Date().toISOString().slice(0, 10);

  if (!entry) {
    return (
      <>
        <PageHeader title="Entry unavailable" backHref="/argus/entries" />
        <EmptyState message="Not found or requires private unlock." />
      </>
    );
  }

  return (
    <>
      <PageHeader title="New evidence" subtitle={entry.title} backHref={`/argus/entries/${id}`} />
      <form action={createEvidenceAction} className="space-y-4" encType="multipart/form-data">
        <input type="hidden" name="entryId" value={id} />
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
          <input name="source" className={inputClass} placeholder="Outlook, Teams, phone recording..." />
        </Field>
        <Field label="Content">
          <textarea name="content" required className={textareaClass} placeholder="Paste email, message, or transcript..." />
        </Field>
        <Field label="Related contact (optional)">
          <select name="contactId" className={inputClass} defaultValue="">
            <option value="">—</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Attachment (PDF, image, audio — optional)">
          <input name="attachment" type="file" className={inputClass} accept="*/*" />
        </Field>
        <button type="submit" className="w-full rounded-xl bg-teal-600 py-3.5 font-semibold text-white">
          Save evidence
        </button>
      </form>
    </>
  );
}
