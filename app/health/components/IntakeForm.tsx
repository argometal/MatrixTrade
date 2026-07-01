import { getPeople } from "@/lib/health-vault/server-storage";
import { logIntakeAction } from "@/app/health/actions";
import { RECORD_TYPE_LABELS, RECORD_TYPES } from "@/lib/health-vault/labels";
import { Field, inputClass, textareaClass } from "./ui";

export async function IntakeForm() {
  const people = await getPeople();
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={logIntakeAction} encType="multipart/form-data" className="space-y-3">
      <Field label="¿Qué pasó?">
        <textarea
          name="description"
          required
          rows={4}
          placeholder="Describe el hecho, correo, reunión..."
          className={textareaClass}
          autoFocus
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Tipo">
          <select name="type" className={inputClass} defaultValue="queja">
            {RECORD_TYPES.map((t) => (
              <option key={t} value={t}>
                {RECORD_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Fecha">
          <input name="date" type="date" required defaultValue={today} className={inputClass} />
        </Field>
      </div>

      <Field label="Título (opcional)">
        <input name="title" className={inputClass} placeholder="Se genera del texto si lo dejas vacío" />
      </Field>

      {people.length > 0 && (
        <Field label="Persona (opcional)">
          <select name="personId" className={inputClass} defaultValue="">
            <option value="">— Ninguna —</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
      )}

      <Field label="Adjunto (opcional)">
        <input
          name="attachment"
          type="file"
          accept="image/*,.pdf,.doc,.docx,.txt,.eml"
          className="w-full text-sm text-zinc-400 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-800 file:px-3 file:py-2 file:text-sm file:text-zinc-200"
        />
      </Field>

      <label className="flex items-center gap-2 text-sm text-violet-200">
        <input type="checkbox" name="secret" className="h-4 w-4 rounded" />
        Secreto
      </label>

      <button type="submit" className="w-full rounded-xl bg-teal-600 py-4 text-base font-semibold text-white">
        Guardar
      </button>
    </form>
  );
}
