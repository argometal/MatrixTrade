import { V2Badge, V2Card, V2SectionTitle } from "@/app/argus/v2/components/v2-ui";
import { formatFileSize } from "@/lib/argus/email-view";
import {
  getArgusStorageQuotaReport,
  type QuotaGaugeStatus,
  type StorageQuotaGauge,
} from "@/lib/argus/storage/quota-report";

function formatChecked(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function statusLabel(status: QuotaGaugeStatus): string {
  if (status === "ok") return "OK";
  if (status === "warn") return "Warning";
  if (status === "critical") return "Critical";
  return "Unavailable";
}

function statusTone(status: QuotaGaugeStatus): "green" | "amber" | "red" | "default" {
  if (status === "ok") return "green";
  if (status === "warn") return "amber";
  if (status === "critical") return "red";
  return "default";
}

function barTone(status: QuotaGaugeStatus): string {
  if (status === "critical") return "bg-gradient-to-r from-red-700 to-red-500";
  if (status === "warn") return "bg-gradient-to-r from-amber-600 to-amber-400";
  return "bg-gradient-to-r from-emerald-600 to-emerald-400";
}

function formatLimit(limitBytes: number | null): string {
  if (limitBytes === null) return "no limit set";
  return formatFileSize(limitBytes);
}

function GaugeRow({ gauge }: { gauge: StorageQuotaGauge }) {
  const showBar = gauge.status !== "unavailable" && gauge.limitBytes !== null && gauge.percent !== null;
  const barWidth = showBar ? Math.min(100, Math.max(0, gauge.percent ?? 0)) : 0;

  return (
    <li className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-zinc-200">{gauge.label}</p>
          <p className="mt-1 text-[11px] text-zinc-500">{gauge.detail}</p>
        </div>
        <V2Badge tone={statusTone(gauge.status)}>{statusLabel(gauge.status)}</V2Badge>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-400">
        <span>
          <span className="font-medium tabular-nums text-zinc-200">{formatFileSize(gauge.usedBytes)}</span>
          {gauge.limitBytes !== null ? (
            <>
              {" "}
              / {formatLimit(gauge.limitBytes)}
            </>
          ) : (
            " used"
          )}
        </span>
        {gauge.percent !== null ? (
          <span className="font-medium tabular-nums text-zinc-300">{gauge.percent}%</span>
        ) : null}
        {gauge.fileCount !== undefined ? (
          <span className="text-zinc-600">{gauge.fileCount.toLocaleString()} files</span>
        ) : null}
        {gauge.estimated ? <span className="text-amber-300/90">Estimated</span> : null}
      </div>

      {showBar ? (
        <div className="mt-3">
          <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
            <div className={`h-full rounded-full ${barTone(gauge.status)}`} style={{ width: `${barWidth}%` }} />
          </div>
        </div>
      ) : gauge.limitBytes === null && gauge.status !== "unavailable" ? (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-800">
          <div className="h-full w-full rounded-full bg-zinc-700/80" />
        </div>
      ) : null}
    </li>
  );
}

export async function V2StorageGaugePanel() {
  const report = await getArgusStorageQuotaReport();

  return (
    <div className="space-y-4">
      <V2Card className="p-5">
        <V2SectionTitle
          action={<span className="text-[11px] text-zinc-600">Checked {formatChecked(report.checkedAt)}</span>}
        >
          Storage quotas
        </V2SectionTitle>
        <ul className="space-y-2">
          <GaugeRow gauge={report.local} />
          <GaugeRow gauge={report.supabaseDb} />
          <GaugeRow gauge={report.supabaseStorage} />
        </ul>
      </V2Card>

      <V2Card className="p-5">
        <V2SectionTitle>Vercel runtime</V2SectionTitle>
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-medium text-zinc-200">
              {report.vercel.isVercel ? "Vercel serverless" : "Non-Vercel host"}
            </p>
            <V2Badge tone={report.vercel.isVercel ? "blue" : "default"}>
              {report.vercel.isVercel ? report.vercel.vercelEnv ?? "production" : "local / other"}
            </V2Badge>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-zinc-500">{report.vercel.detail}</p>
          {report.vercel.isVercel ? (
            <p className="mt-2 text-[11px] text-zinc-600">
              Ephemeral filesystem only — durable ARGUS data must live in Supabase database and storage.
            </p>
          ) : null}
        </div>
      </V2Card>
    </div>
  );
}
