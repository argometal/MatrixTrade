import Link from "next/link";
import { createTradeAction } from "@/app/actions";
import type { Playbook } from "@/lib/playbook-types";
import type { Setup } from "@/lib/setup-types";

const inputClass =
  "mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500";

export function PreviewTradeNew({
  setups,
  playbooks,
}: {
  setups: Setup[];
  playbooks: Playbook[];
}) {
  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden">
      <div className="min-w-0 flex-1 overflow-y-auto">
        <header className="border-b border-zinc-800 px-4 py-4 lg:px-6">
          <Link href="/trades" className="text-sm text-zinc-500 hover:text-violet-400">
            ← Trades
          </Link>
          <h1 className="mt-2 text-xl font-semibold text-zinc-100">New trade</h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            H-prefix ID (e.g. H003) · Obsidian link auto-generated
          </p>
        </header>

        <div className="mx-auto max-w-lg px-4 py-4 lg:px-6 lg:py-6">
          <form
            action={createTradeAction}
            className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6"
          >
            <Field label="Trade ID" name="id" placeholder="H001" required />
            <Field label="Ticker" name="ticker" placeholder="MSFT" required />
            <Field label="Entry" name="entry" type="number" step="0.01" min="0" required />
            <Field label="Stop" name="stop" type="number" step="0.01" min="0" required />
            <Field label="Target (optional)" name="target" type="number" step="0.01" min="0" />
            <Field label="Shares" name="shares" type="number" step="1" min="1" required />

            <label className="block text-sm">
              <span className="font-medium text-zinc-300">Playbook (optional)</span>
              <select name="playbookId" className={inputClass} defaultValue="">
                <option value="">— Assign later —</option>
                {playbooks.map((pb) => (
                  <option key={pb.id} value={pb.id}>
                    {pb.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm">
              <span className="font-medium text-zinc-300">Setup tag (optional)</span>
              <select name="setupId" className={inputClass} defaultValue="">
                <option value="">— Select later —</option>
                {setups.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="submit"
              className="w-full rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
            >
              Create trade
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  required,
  step,
  min,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  step?: string;
  min?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-zinc-300">{label}</span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        step={step}
        min={min}
        className={inputClass}
      />
    </label>
  );
}
