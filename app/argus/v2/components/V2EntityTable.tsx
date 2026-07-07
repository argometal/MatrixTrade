import Link from "next/link";
import { V2_ENTITY_TABS, type V2EntityTab } from "@/lib/argus/v2/loaders";

const TAB_LABELS: Record<V2EntityTab, string> = {
  organizations: "Organizations",
  projects: "Projects",
  people: "People",
  topics: "Topics",
  events: "Events",
};

export function V2EntityTable({
  tab,
  rows,
}: {
  tab: V2EntityTab;
  rows: { id: string; name: string; type: string; people: number; last: string; active: boolean; href: string }[];
}) {
  const thirdColumnLabel =
    tab === "people" ? "Role" : tab === "topics" || tab === "events" ? "Links" : "People";

  return (
    <div className="overflow-x-auto">
      <div className="mb-3 flex flex-wrap gap-2">
        {V2_ENTITY_TABS.map((t) => (
          <Link
            key={t}
            href={
              t === "organizations"
                ? "/argus/v2?tab=organizations"
                : t === "topics"
                  ? "/argus/v2/browse/topics"
                  : t === "events"
                    ? "/argus/v2/browse/events"
                    : `/argus/v2?tab=${t}`
            }
            className={`rounded-lg px-2.5 py-1 text-sm font-medium ${
              t === tab ? "bg-violet-500/15 text-violet-300" : "text-zinc-400 hover:text-zinc-400"
            }`}
          >
            {TAB_LABELS[t]}
          </Link>
        ))}
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-zinc-400">No {TAB_LABELS[tab].toLowerCase()} yet.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-sm text-zinc-400">
              <th className="pb-2 font-medium">Name</th>
              <th className="pb-2 font-medium">Type</th>
              <th className="pb-2 font-medium">{thirdColumnLabel}</th>
              <th className="pb-2 font-medium">Last Activity</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-zinc-800/50 last:border-0">
                <td className="py-2.5">
                  <Link href={row.href} className="font-medium text-zinc-200 hover:text-violet-300">
                    {row.name}
                  </Link>
                </td>
                <td className="py-2.5 text-zinc-400">{row.type}</td>
                <td className="py-2.5 tabular-nums text-zinc-400">
                  {tab === "people" ? row.type : row.people || "—"}
                </td>
                <td className="py-2.5">
                  <span className="inline-flex items-center gap-1.5 text-zinc-400">
                    {row.active ? <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> : null}
                    {row.last}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
