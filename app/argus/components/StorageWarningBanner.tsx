import type { StorageSafetyStatus } from "@/lib/argus/data-safety";

export function StorageWarningBanner({ safety }: { safety: StorageSafetyStatus }) {
  if (!safety.ephemeralJournal && !safety.writesBlocked) {
    if (safety.journalStore === "supabase") {
      return (
        <p className="mb-4 rounded-lg border border-teal-900/50 bg-teal-950/30 px-3 py-2 text-[13px] text-teal-300/90">
          Journal stored in Supabase ({safety.inboxStore} inbox). Data survives deploy.
        </p>
      );
    }
    return null;
  }

  if (safety.writesBlocked) {
    return (
      <div
        className="mb-4 rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-[13px] text-red-200"
        role="alert"
      >
        <p className="font-medium">ARGUS writes blocked — storage is not persistent on this host.</p>
        <p className="mt-1 text-red-200/80">
          Set <code className="text-red-100">ARGUS_JOURNAL_STORE=supabase</code> on Vercel and run{" "}
          <code className="text-red-100">supabase/argus-journal.sql</code>. Until then, notes and references
          will be lost on deploy.
        </p>
        {safety.inboxStore === "supabase" && (
          <p className="mt-1 text-amber-200/90">Email inbox is cloud-backed; journal data is not.</p>
        )}
      </div>
    );
  }

  return (
    <p className="mb-4 rounded-lg border border-amber-900/50 bg-amber-950/30 px-3 py-2 text-[13px] text-amber-200/90">
      Using local folder <span className="font-mono text-amber-100">{safety.root}</span>. Set{" "}
      <code className="text-amber-100">ARGUS_DATA_DIR</code> outside the repo for safer persistence.
    </p>
  );
}
