import { createEntityAction } from "@/app/argus/actions";
import { REFERENCE_KINDS, REFERENCE_KIND_LABELS } from "@/lib/argus/reference-types";
import { ENTITY_CREATE } from "@/lib/argus/ux-copy";
import { inputClass } from "./ui";

export function EntityCreateForm({ error }: { error?: string }) {
  return (
    <form action={createEntityAction} className="mb-6 space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">{ENTITY_CREATE.title}</p>
      {error === "name" && <p className="text-sm text-amber-400">Name is required.</p>}
      {error === "kind" && <p className="text-sm text-amber-400">Invalid type.</p>}
      {error === "storage" && <p className="text-sm text-amber-400">Could not save — check storage.</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="text-xs text-zinc-500">Name</span>
          <input name="name" required className={`${inputClass} mt-1`} />
        </label>
        <label className="block">
          <span className="text-xs text-zinc-500">Type</span>
          <select name="kind" defaultValue="person" className={`${inputClass} mt-1`}>
            {REFERENCE_KINDS.map((k) => (
              <option key={k} value={k}>
                {REFERENCE_KIND_LABELS[k]}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs text-zinc-500">Notes (optional)</span>
          <input name="notes" className={`${inputClass} mt-1`} />
        </label>
      </div>
      <button type="submit" className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-600">
        Create
      </button>
    </form>
  );
}
