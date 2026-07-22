import {
  OBSERVATION_STATUSES,
  OBSERVATION_TERMINAL_EVENTS,
  type ObservationRecord,
} from "@/lib/observation-types";
import { saveTradeObservationAction } from "@/app/actions";

const inputClass =
  "mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500";

function triStateValue(value: boolean | undefined): string {
  if (value === true) return "true";
  if (value === false) return "false";
  return "";
}

/** Closed-trade Observation Engine form — reuses observation-update fields (manual). */
export function TradeObservationPanel({
  tradeId,
  observation,
}: {
  tradeId: string;
  observation: ObservationRecord | null;
}) {
  return (
    <section className="rounded-2xl border border-amber-500/25 bg-amber-950/15 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-amber-200/90">
          Observation
        </h2>
        {observation ? (
          <span className="rounded-full border border-amber-500/30 px-2 py-0.5 text-[11px] text-amber-100/80">
            {observation.id} · {observation.status}
          </span>
        ) : (
          <span className="text-[11px] text-amber-100/60">Will create OBS on save</span>
        )}
      </div>
      <p className="mt-1 text-xs text-zinc-500">
        Post-close evidence only — never invent prices. Same fields as{" "}
        <code className="text-zinc-400">observation-update</code>.
      </p>

      {observation ? (
        <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-zinc-400">
          <div>
            <dt className="text-zinc-600">Window</dt>
            <dd>
              {new Date(observation.startedAt).toLocaleDateString()} →{" "}
              {new Date(observation.endsAt).toLocaleDateString()}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-600">Ref entry / stop</dt>
            <dd>
              {observation.referenceEntry ?? "—"} / {observation.referenceStop ?? "—"}
            </dd>
          </div>
        </dl>
      ) : null}

      <form action={saveTradeObservationAction.bind(null, tradeId)} className="mt-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            <span className="font-medium text-zinc-300">Target reached</span>
            <select
              name="targetReached"
              defaultValue={triStateValue(observation?.targetReached)}
              className={inputClass}
            >
              <option value="">—</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="font-medium text-zinc-300">Thesis invalidated</span>
            <select
              name="thesisInvalidated"
              defaultValue={triStateValue(observation?.thesisInvalidated)}
              className={inputClass}
            >
              <option value="">—</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="font-medium text-zinc-300">Target reached at</span>
            <input
              name="targetReachedAt"
              type="date"
              defaultValue={observation?.targetReachedAt?.slice(0, 10) ?? ""}
              className={inputClass}
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-zinc-300">Invalidation at</span>
            <input
              name="invalidationReachedAt"
              type="date"
              defaultValue={observation?.invalidationReachedAt?.slice(0, 10) ?? ""}
              className={inputClass}
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-zinc-300">Max price</span>
            <input
              name="maxPrice"
              type="number"
              step="any"
              defaultValue={observation?.maxPrice ?? ""}
              className={inputClass}
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-zinc-300">Min price</span>
            <input
              name="minPrice"
              type="number"
              step="any"
              defaultValue={observation?.minPrice ?? ""}
              className={inputClass}
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-zinc-300">MFE</span>
            <input
              name="mfe"
              type="number"
              step="any"
              defaultValue={observation?.mfe ?? ""}
              className={inputClass}
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-zinc-300">MAE</span>
            <input
              name="mae"
              type="number"
              step="any"
              defaultValue={observation?.mae ?? ""}
              className={inputClass}
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-zinc-300">MFE/MAE unit</span>
            <select
              name="mfeMaeUnit"
              defaultValue={observation?.mfeMaeUnit ?? "price"}
              className={inputClass}
            >
              <option value="price">Price</option>
              <option value="r">R</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="font-medium text-zinc-300">First terminal</span>
            <select
              name="firstTerminalEvent"
              defaultValue={observation?.firstTerminalEvent ?? ""}
              className={inputClass}
            >
              <option value="">—</option>
              {OBSERVATION_TERMINAL_EVENTS.map((ev) => (
                <option key={ev} value={ev}>
                  {ev}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="font-medium text-zinc-300">Better entry?</span>
            <select
              name="betterEntryAvailable"
              defaultValue={triStateValue(observation?.betterEntryAvailable)}
              className={inputClass}
            >
              <option value="">—</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="font-medium text-zinc-300">Better entry price</span>
            <input
              name="betterEntryPrice"
              type="number"
              step="any"
              defaultValue={observation?.betterEntryPrice ?? ""}
              className={inputClass}
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-zinc-300">Status</span>
            <select
              name="status"
              defaultValue={observation?.status ?? "observing"}
              className={inputClass}
            >
              {OBSERVATION_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="block text-sm">
          <span className="font-medium text-zinc-300">Notes</span>
          <textarea
            name="notes"
            rows={2}
            defaultValue={observation?.notes ?? ""}
            className={inputClass}
            placeholder="Facts only — what happened after the fill"
          />
        </label>
        <button
          type="submit"
          className="rounded-lg bg-amber-600/90 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500"
        >
          Save observation
        </button>
      </form>
    </section>
  );
}
