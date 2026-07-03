import Link from "next/link";
import { createTradeAction } from "@/app/actions";
import { getSetups } from "@/lib/setups";

export default async function NewTradePage() {
  const setups = await getSetups();

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <header>
        <Link href="/trades" className="text-sm text-zinc-500 hover:underline">
          ← Back to trades
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">New trade</h1>
        <p className="text-sm text-zinc-500">H001–H030 only · Obsidian link auto-generated</p>
      </header>

      <form action={createTradeAction} className="space-y-4 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <Field label="Trade ID" name="id" placeholder="H001" required />
        <Field label="Ticker" name="ticker" placeholder="MSFT" required />
        <Field label="Entry" name="entry" type="number" step="0.01" min="0" required />
        <Field label="Stop" name="stop" type="number" step="0.01" min="0" required />
        <Field label="Target (optional)" name="target" type="number" step="0.01" min="0" />
        <Field label="Shares" name="shares" type="number" step="1" min="1" required />

        <label className="block text-sm">
          <span className="font-medium text-zinc-700">Setup (optional)</span>
          <select
            name="setupId"
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            defaultValue=""
          >
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
          className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Create trade
        </button>
      </form>
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
      <span className="font-medium text-zinc-700">{label}</span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        step={step}
        min={min}
        className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
      />
    </label>
  );
}
