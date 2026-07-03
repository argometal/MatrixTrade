import { updateEntityAction } from "@/app/argus/actions";
import { STRATEGIC_VALUE_LABELS } from "@/lib/argus/labels";
import type { Entity, StrategicValue } from "@/lib/argus/types";
import { inputClass } from "./ui";

export function EntityEditForm({ entity }: { entity: Entity }) {
  const sv = entity.strategicValue ?? 3;

  return (
    <form action={updateEntityAction} className="mb-6 space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
      <input type="hidden" name="entityId" value={entity.id} />
      <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Editable fields</p>

      <label className="block">
        <span className="text-xs text-zinc-500">Strategic value</span>
        <select
          name="strategicValue"
          defaultValue={sv}
          className={`${inputClass} mt-1`}
        >
          {([1, 2, 3, 4, 5] as StrategicValue[]).map((value) => (
            <option key={value} value={value}>
              {value} — {STRATEGIC_VALUE_LABELS[value]}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-xs text-zinc-500">Alias</span>
        <input name="alias" defaultValue={entity.alias ?? ""} placeholder="Optional short label" className={`${inputClass} mt-1`} />
      </label>

      <label className="block">
        <span className="text-xs text-zinc-500">Notes</span>
        <textarea
          name="notes"
          defaultValue={entity.notes}
          rows={3}
          className={`${inputClass} mt-1 resize-none`}
        />
      </label>

      <button type="submit" className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-600">
        Save
      </button>
    </form>
  );
}
