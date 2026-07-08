import { ArgusInboxStatusRow } from "@/app/argus/components/ArgusInboxStatusRow";
import { V2Badge, V2Card, V2SectionTitle } from "@/app/argus/v2/components/v2-ui";
import { getArgusHealthReport, healthLevelIcon, type HealthLevel } from "@/lib/argus/health/status";

function formatChecked(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function levelLabel(level: HealthLevel): string {
  if (level === "healthy") return "Healthy";
  if (level === "degraded") return "Degraded";
  return "Offline";
}

function levelTone(level: HealthLevel): "green" | "amber" | "red" {
  if (level === "healthy") return "green";
  if (level === "degraded") return "amber";
  return "red";
}

function StatusRow({
  label,
  level,
  icon,
  lastCheckedLabel,
  count,
  reason,
}: {
  label: string;
  level: HealthLevel;
  icon: string;
  lastCheckedLabel: string;
  count?: number;
  reason?: string;
}) {
  return (
    <li className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 px-4 py-3 transition hover:border-zinc-700/80">
      <div className="flex items-start justify-between gap-3">
        <span className="text-sm font-medium text-zinc-200">
          <span className="mr-1.5" aria-hidden>
            {icon}
          </span>
          {label}
        </span>
        <V2Badge tone={levelTone(level)}>{levelLabel(level)}</V2Badge>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zinc-500">
        <span>Last checked {lastCheckedLabel}</span>
        {count !== undefined ? <span>{count.toLocaleString()} records</span> : null}
        {reason ? <span className="text-amber-300/90">{reason}</span> : null}
      </div>
    </li>
  );
}

export async function ArgusStatusPanel() {
  const report = await getArgusHealthReport();
  const healthyCount = report.subsystems.filter((s) => s.level === "healthy").length;
  const problemCount = report.subsystems.length - healthyCount;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <V2Card className="p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">Subsystems</p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-zinc-50">{report.subsystems.length}</p>
        </V2Card>
        <V2Card className="p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">Healthy</p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-emerald-400">{healthyCount}</p>
        </V2Card>
        <V2Card className="p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">Needs attention</p>
          <p className={`mt-2 text-2xl font-bold tabular-nums ${problemCount > 0 ? "text-amber-400" : "text-zinc-500"}`}>
            {problemCount}
          </p>
        </V2Card>
      </div>

      <V2Card className="p-5">
        <V2SectionTitle
          action={
            <span className="text-[11px] text-zinc-600">
              Checked {formatChecked(report.checkedAt)}
            </span>
          }
        >
          System status
        </V2SectionTitle>
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
              <StatusRow
                key={s.key}
                label={s.label}
                level={s.level}
                icon={healthLevelIcon(s.level)}
                lastCheckedLabel={formatChecked(s.lastChecked)}
                count={s.count}
                reason={s.reason}
              />
            )
          )}
        </ul>
      </V2Card>
    </div>
  );
}
