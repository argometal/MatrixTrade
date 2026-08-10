/** Board column title — clarifies Archived never deletes. */

export function BrowseBoardColumnHeader({
  column,
  count,
}: {
  column: string;
  count: number;
}) {
  const safety =
    column === "Archived"
      ? "Hide only — not delete. Drag back or Restore anytime."
      : null;

  return (
    <div className="border-b border-zinc-800/80 px-3 py-2.5">
      <h3 className="text-sm font-semibold text-zinc-200">{column}</h3>
      <p className="text-[11px] text-zinc-600">{count}</p>
      {safety ? <p className="mt-1 text-[10px] leading-snug text-zinc-500">{safety}</p> : null}
    </div>
  );
}
