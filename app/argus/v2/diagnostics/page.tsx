import { ArgusStatusPanel } from "@/app/argus/components/ArgusStatusPanel";
import { V2StorageGaugePanel } from "@/app/argus/v2/components/V2StorageGaugePanel";

export default function V2DiagnosticsPage() {
  return (
    <div className="v2-page-shell flex h-full min-h-0 flex-col overflow-hidden">
      <div className="argus-v2-scroll min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
        <div className="px-4 py-6 lg:px-8">
          <header className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-50">Settings & Diagnostics</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-500">
              Infrastructure health and storage quotas for ARGUS local disk, Supabase, and runtime context.
            </p>
          </header>
          <div className="space-y-6">
            <V2StorageGaugePanel />
            <ArgusStatusPanel />
          </div>
        </div>
      </div>
    </div>
  );
}
