import Link from "next/link";
import type { V2EntityRow, V2EntityTab } from "@/lib/argus/v2/loaders";

export function V2EntityTableBody({
  tab,
  rows,
  primary = false,
}: {
  tab: V2EntityTab;
  rows: V2EntityRow[];
  primary?: boolean;
}) {
  const thirdColumnLabel =
    tab === "people" ? "Role" : tab === "topics" || tab === "events" ? "Links" : "People";

  return (
    <div className="overflow-x-auto">
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
    </div>
  );
}
