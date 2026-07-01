import { RELATIONSHIPS } from "@/lib/health-vault/labels";
import { createPersonAction } from "@/app/health/actions";
import { Field, inputClass, PageHeader, textareaClass } from "@/app/health/components/ui";

export default function NewPersonPage() {
  return (
    <>
      <PageHeader title="Nueva persona" backHref="/health/people" />
      <form action={createPersonAction} className="space-y-4">
        <Field label="Nombre">
          <input name="name" required className={inputClass} />
        </Field>
        <Field label="Rol / puesto">
          <input name="role" className={inputClass} />
        </Field>
        <Field label="Departamento">
          <input name="department" className={inputClass} />
        </Field>
        <Field label="Relación contigo">
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
        <Field label="Teléfono">
          <input name="phone" className={inputClass} />
        </Field>
        <Field label="Notas">
          <textarea name="notes" className={textareaClass} />
        </Field>
        <button type="submit" className="w-full rounded-xl bg-teal-600 py-3.5 font-semibold text-white">
          Guardar persona
        </button>
      </form>
    </>
  );
}
