import { ArgusInboxStatusRow } from "@/app/argus/components/ArgusInboxStatusRow";
import { getArgusHealthReport, healthLevelIcon } from "@/lib/argus/health/status";

function formatChecked(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export async function ArgusStatusPanel() {
  const report = await getArgusHealthReport();

  return (
    <section
      className="mb-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-4"
      aria-label="ARGUS Status"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">ARGUS Status</h2>
        <span className="text-[11px] text-zinc-600">Checked {formatChecked(report.checkedAt)}</span>
      </div>
      <ul className="space-y-2">
        {report.subsystems.map((s) =>
          s.key === "inbox" ? (
            <ArgusInboxStatusRow
              key={s.key}
              label={s.label}
              level={s.level}
              icon={healthLevelIcon(s.level)}
              lastCheckedLabel={formatChecked(s.lastChecked)}
              count={s.count}
              reason={s.reason}
            />
          ) : (
            <li key={s.key} className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 px-3 py-2">
              <div className="flex items-start justify-between gap-3">
                <span className="text-sm text-zinc-200">
                  {healthLevelIcon(s.level)} {s.label}
                </span>
                <span className="shrink-0 text-[11px] capitalize text-zinc-500">
                  {s.level === "healthy" ? "Healthy" : s.level === "degraded" ? "Degraded" : "Offline"}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-zinc-600">
                <span>Last checked {formatChecked(s.lastChecked)}</span>
                {s.count !== undefined ? <span>{s.count.toLocaleString()} records</span> : null}
                {s.reason ? <span className="text-amber-400/90">{s.reason}</span> : null}
              </div>
            </li>
          )
        )}
      </ul>
    </section>
  );
}
