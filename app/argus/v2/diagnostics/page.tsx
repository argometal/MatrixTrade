import { ArgusStatusPanel } from "@/app/argus/components/ArgusStatusPanel";

export default function V2DiagnosticsPage() {
  return (
    <div className="px-4 py-6 lg:px-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-50">Settings & Diagnostics</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-500">
          Infrastructure health for ARGUS storage, inbox, evidence, and search.
        </p>
      </header>
      <ArgusStatusPanel />
    </div>
  );
}
