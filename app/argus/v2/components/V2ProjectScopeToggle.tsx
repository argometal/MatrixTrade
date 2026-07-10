import Link from "next/link";

export function V2ProjectScopeToggle({
  projectId,
  respectDates,
}: {
  projectId: string;
  respectDates: boolean;
}) {
  const base = `/argus/v2/projects/${projectId}`;
  return (
    <div className="inline-flex rounded-lg border border-zinc-800 bg-zinc-900/60 p-0.5 text-xs">
      <Link
        href={base}
        className={`rounded-md px-3 py-1.5 font-medium transition ${
          respectDates ? "bg-violet-600/25 text-violet-200" : "text-zinc-500 hover:text-zinc-300"
        }`}
      >
        In project dates
      </Link>
      <Link
        href={`${base}?scope=all`}
        className={`rounded-md px-3 py-1.5 font-medium transition ${
          !respectDates ? "bg-violet-600/25 text-violet-200" : "text-zinc-500 hover:text-zinc-300"
        }`}
      >
        All dates
      </Link>
    </div>
  );
}
