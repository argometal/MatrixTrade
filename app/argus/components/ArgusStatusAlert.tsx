import Link from "next/link";
import { getArgusHealthReport } from "@/lib/argus/health/status";

const WATCH_KEYS = new Set(["database", "inbox", "evidence", "attachments"]);

export async function ArgusStatusAlert() {
  const report = await getArgusHealthReport();
  const problems = report.subsystems.filter(
    (s) =>
      WATCH_KEYS.has(s.key) &&
      (s.level === "offline" || (s.level === "degraded" && Boolean(s.reason)))
  );

  if (problems.length === 0) return null;

  const summary = problems
    .map((s) => (s.reason ? `${s.label}: ${s.reason}` : s.label))
    .join(" · ");

  return (
    <div
      className="mb-4 rounded-lg border border-amber-900/50 bg-amber-950/30 px-3 py-2 text-sm text-amber-100"
      role="alert"
    >
      <p>
        <span className="font-medium uppercase text-amber-300/90">System:</span> {summary}
      </p>
      <p className="mt-1 text-[12px] text-amber-200/80">
        <Link href="/argus/diagnostics" className="underline hover:text-amber-100">
          View diagnostics
        </Link>
      </p>
    </div>
  );
}
