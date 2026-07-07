"use client";

const TABS = ["Overview", "Timeline", "People", "Projects", "Files", "Notes", "Settings"] as const;

export function V2OrgTabs({ active = "Overview" }: { active?: (typeof TABS)[number] }) {
  return (
    <div className="mb-6 flex gap-1 overflow-x-auto border-b border-zinc-800/80 pb-px">
      {TABS.map((tab) => (
        <button
          key={tab}
          type="button"
          className={`shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium transition ${
            tab === active
              ? "border-violet-500 text-violet-300"
              : "border-transparent text-zinc-400 hover:text-zinc-300"
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
