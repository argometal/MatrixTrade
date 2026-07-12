"use client";

import { useArgusAdd } from "@/app/argus/components/ArgusAddProvider";

/** Top-bar create entry — new person, topic, project, event, or organization. */
export function V2TopBarAddMenu({ className = "" }: { className?: string }) {
  const { openAddContext } = useArgusAdd();

  return (
    <button
      type="button"
      onClick={() => openAddContext()}
      className={`inline-flex h-9 items-center rounded-xl bg-violet-600 px-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-950/30 transition hover:bg-violet-500 active:scale-[0.98] ${className}`}
      title="Create a person, project, topic, event, or organization"
    >
      Create
    </button>
  );
}
