import { RELATIONSHIPS } from "@/lib/argus/labels";
import { createContactAction } from "@/app/argus/actions";
import { Field, inputClass, PageHeader, textareaClass } from "@/app/argus/components/ui";

export default function NewContactPage() {
  return (
    <>
      <PageHeader title="New contact" backHref="/argus/contacts" />
      <form action={createContactAction} className="space-y-4">
        <Field label="Name">
          <input name="name" required className={inputClass} />
        </Field>
        <Field label="Role / title">
          <input name="role" className={inputClass} />
        </Field>
        <Field label="Organization / department">
          <input name="department" className={inputClass} />
        </Field>
        <Field label="Relationship">
          <select name="relationship" className={inputClass} defaultValue={RELATIONSHIPS[0]}>
            {RELATIONSHIPS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Email">
          <input name="email" type="email" className={inputClass} />
        </Field>
        <Field label="Phone">
          <input name="phone" className={inputClass} />
        </Field>
        <Field label="Notes">
          <textarea name="notes" className={textareaClass} placeholder="Context, how you met, follow-ups..." />
        </Field>
        <button type="submit" className="w-full rounded-xl bg-teal-600 py-3.5 font-semibold text-white">
          Save contact
        </button>
      </form>
    </>
  );
}
