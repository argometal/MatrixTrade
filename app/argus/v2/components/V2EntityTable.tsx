import Link from "next/link";

export type EntityTab = "organizations" | "projects" | "people";

export function V2EntityTable({
  tab,
  rows,
}: {
  tab: EntityTab;
  rows: { id: string; name: string; type: string; people: number; last: string; active: boolean; href: string }[];
}) {
  const tabs: EntityTab[] = ["organizations", "projects", "people"];

  return (
    <div className="overflow-x-auto">
      <div className="mb-3 flex gap-2">
        {tabs.map((t) => (
          <Link
            key={t}
            href={t === tab ? "/argus/v2" : `/argus/v2?tab=${t}`}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-medium capitalize ${
              t === tab ? "bg-violet-500/15 text-violet-300" : "text-zinc-600 hover:text-zinc-400"
            }`}
          >
            {t}
          </Link>
        ))}
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-zinc-500">No {tab} yet.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-xs text-zinc-600">
              <th className="pb-2 font-medium">Name</th>
              <th className="pb-2 font-medium">Type</th>
              <th className="pb-2 font-medium">{tab === "people" ? "Role" : "People"}</th>
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
                <td className="py-2.5 text-zinc-500">{row.type}</td>
                <td className="py-2.5 tabular-nums text-zinc-500">
                  {tab === "people" ? row.type : row.people || "—"}
                </td>
                <td className="py-2.5">
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
    </div>
  );
}
