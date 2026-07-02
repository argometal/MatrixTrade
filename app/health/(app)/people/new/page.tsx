import { RELATIONSHIPS } from "@/lib/health-vault/labels";
import { createPersonAction } from "@/app/health/actions";
import { Field, inputClass, PageHeader, textareaClass } from "@/app/health/components/ui";

export default function NewPersonPage() {
  return (
    <>
      <PageHeader title="New person" backHref="/health/people" />
      <form action={createPersonAction} className="space-y-4">
        <Field label="Name">
          <input name="name" required className={inputClass} />
        </Field>
        <Field label="Role / title">
          <input name="role" className={inputClass} />
        </Field>
        <Field label="Department">
          <input name="department" className={inputClass} />
        </Field>
        <Field label="Relationship to you">
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
          <textarea name="notes" className={textareaClass} />
        </Field>
        <button type="submit" className="w-full rounded-xl bg-teal-600 py-3.5 font-semibold text-white">
          Save person
        </button>
      </form>
    </>
  );
}
