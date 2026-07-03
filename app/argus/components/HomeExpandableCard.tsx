"use client";

export function HomeExpandableCard({
  expanded,
  onToggle,
  collapsed,
  children,
}: {
  expanded: boolean;
  onToggle: () => void;
  collapsed: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-900/30">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="w-full px-4 py-3 text-left transition hover:bg-zinc-800/30"
      >
        {collapsed}
      </button>
      {expanded ? <div className="border-t border-zinc-800/80 px-4 py-4">{children}</div> : null}
    </div>
  );
}
