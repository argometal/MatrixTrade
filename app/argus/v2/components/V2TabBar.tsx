"use client";

export type V2TabItem<T extends string> = {
  id: T;
  label: string;
};

export function V2TabBar<T extends string>({
  tabs,
  active,
  onChange,
  size = "sm",
}: {
  tabs: V2TabItem<T>[];
  active: T;
  onChange: (id: T) => void;
  size?: "sm" | "md";
}) {
  const pad = size === "md" ? "px-4 py-2 text-sm" : "px-3 py-1.5 text-xs";

  return (
    <div
      className="inline-flex flex-wrap gap-1 rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-1"
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`rounded-lg font-medium transition ${pad} ${
              isActive
                ? "bg-violet-600/25 text-violet-200 ring-1 ring-violet-500/40"
                : "text-zinc-500 hover:bg-zinc-800/80 hover:text-zinc-300"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
