"use client";

export type HomeSectionId = "activity" | "followUps" | "inbox" | "network" | "documents";

export type HomeSectionNavItem = {
  id: HomeSectionId;
  label: string;
  badge?: number;
};

function NavButton({
  item,
  active,
  onSelect,
  layout,
}: {
  item: HomeSectionNavItem;
  active: boolean;
  onSelect: (id: HomeSectionId) => void;
  layout: "sidebar" | "tabs";
}) {
  const showBadge = item.badge != null && item.badge > 0;

  return (
    <button
      type="button"
      onClick={() => onSelect(item.id)}
      aria-current={active ? "page" : undefined}
      className={
        layout === "sidebar"
          ? `flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-[13px] font-medium transition ${
              active
                ? "bg-zinc-800/80 text-teal-50"
                : "text-zinc-400 hover:bg-zinc-900/80 hover:text-zinc-200"
            }`
          : `flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-medium transition ${
              active
                ? "bg-zinc-800 text-teal-50"
                : "bg-zinc-900/60 text-zinc-500 hover:text-zinc-300"
            }`
      }
    >
      <span className="min-w-0 truncate">{item.label}</span>
      {showBadge && (
        <span
          className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${
            item.id === "inbox"
              ? "bg-teal-500/20 text-teal-300"
              : "bg-amber-500/20 text-amber-300"
          } ${layout === "sidebar" ? "ml-auto" : ""}`}
        >
          {item.badge}
        </span>
      )}
    </button>
  );
}

export function HomeSectionNav({
  items,
  active,
  onSelect,
}: {
  items: HomeSectionNavItem[];
  active: HomeSectionId;
  onSelect: (id: HomeSectionId) => void;
}) {
  return (
    <>
      <nav
        aria-label="Home sections"
        className="mb-4 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] md:hidden [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item) => (
          <NavButton key={item.id} item={item} active={active === item.id} onSelect={onSelect} layout="tabs" />
        ))}
      </nav>

      <nav
        aria-label="Home sections"
        className="mb-0 hidden w-[7.25rem] shrink-0 flex-col gap-1 md:flex"
      >
        {items.map((item) => (
          <NavButton key={item.id} item={item} active={active === item.id} onSelect={onSelect} layout="sidebar" />
        ))}
      </nav>
    </>
  );
}
