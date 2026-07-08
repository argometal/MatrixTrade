import Link from "next/link";
import { V2_ENTITY_TABS, type V2EntityTab } from "@/lib/argus/v2/loaders";

const TAB_LABELS: Record<V2EntityTab, string> = {
  organizations: "Organizations",
  projects: "Projects",
  people: "People",
  topics: "Topics",
  events: "Events",
};

const TAB_HREFS: Record<V2EntityTab, string> = {
  organizations: "/argus/v2?tab=organizations",
  projects: "/argus/v2?tab=projects",
  people: "/argus/v2?tab=people",
  topics: "/argus/v2/browse/topics",
  events: "/argus/v2/browse/events",
};

const BROWSE_HREFS: Record<V2EntityTab, string> = {
  organizations: "/argus/v2/browse/organizations",
  projects: "/argus/v2/browse/projects",
  people: "/argus/v2/browse/network",
  topics: "/argus/v2/browse/topics",
  events: "/argus/v2/browse/events",
};

export function V2EntityTable({
  tab,
  rows,
  primary = false,
}: {
  tab: V2EntityTab;
  rows: { id: string; name: string; type: string; people: number; last: string; active: boolean; href: string }[];
  primary?: boolean;
}) {
  const thirdColumnLabel =
    tab === "people" ? "Role" : tab === "topics" || tab === "events" ? "Links" : "People";

  return (
    <div className="overflow-x-auto">
      <div className={`flex flex-wrap gap-2 ${primary ? "mb-5" : "mb-3"}`}>
        {V2_ENTITY_TABS.map((t) => (
          <Link
            key={t}
            href={TAB_HREFS[t]}
            className={`rounded-xl border px-3 py-1.5 font-medium transition ${
              primary ? "text-xs" : "text-[11px]"
            } ${
              t === tab
                ? "border-violet-500/40 bg-violet-500/15 text-violet-200"
                : "border-transparent text-zinc-600 hover:border-zinc-800 hover:bg-zinc-900/60 hover:text-zinc-300"
            }`}
          >
            {TAB_LABELS[t]}
          </Link>
        ))}
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-zinc-500">No {TAB_LABELS[tab].toLowerCase()} yet.</p>
      ) : (
        <table className={`w-full text-left ${primary ? "text-sm" : "text-sm"}`}>
          <thead>
            <tr className="border-b border-zinc-800 text-xs uppercase tracking-wide text-zinc-600">
              <th className={`pb-3 font-medium ${primary ? "pl-1" : ""}`}>Name</th>
              <th className="pb-3 font-medium">Type</th>
              <th className="pb-3 font-medium">{thirdColumnLabel}</th>
              <th className="pb-3 font-medium">Last Activity</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-zinc-800/50 transition last:border-0 hover:bg-zinc-900/40"
              >
                <td className={`${primary ? "py-3.5 pl-1" : "py-2.5"}`}>
                  <Link
                    href={row.href}
                    className={`font-semibold text-zinc-100 hover:text-violet-300 ${primary ? "text-base" : ""}`}
                  >
                    {row.name}
                  </Link>
                </td>
                <td className={`text-zinc-500 ${primary ? "py-3.5" : "py-2.5"}`}>{row.type}</td>
                <td className={`tabular-nums text-zinc-500 ${primary ? "py-3.5" : "py-2.5"}`}>
                  {tab === "people" ? row.type : row.people || "—"}
                </td>
                <td className={primary ? "py-3.5" : "py-2.5"}>
                  <span className="inline-flex items-center gap-1.5 text-zinc-500">
                    {row.active ? <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> : null}
                    {row.last}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {rows.length > 0 ? (
        <div className={`flex items-center justify-between gap-3 border-t border-zinc-800/80 ${primary ? "mt-4 pt-4" : "mt-3 pt-3"}`}>
          <p className="text-xs text-zinc-600">
            Showing {rows.length} {TAB_LABELS[tab].toLowerCase()}
          </p>
          <Link href={BROWSE_HREFS[tab]} className="text-xs font-medium text-violet-400 hover:text-violet-300">
            Browse all →
          </Link>
        </div>
      ) : null}
    </div>
  );
}
