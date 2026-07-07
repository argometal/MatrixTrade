import { ArgusStatusPanel } from "@/app/argus/components/ArgusStatusPanel";
import { PageHeader } from "@/app/argus/components/ui";

export default function ArgusDiagnosticsPage() {
  return (
    <>
      <PageHeader title="Diagnostics" backHref="/argus/v2" />
      <p className="mb-4 text-sm text-zinc-500">
        Infrastructure health for ARGUS storage, inbox, evidence, and search.
      </p>
      <ArgusStatusPanel />
    </>
  );
}
