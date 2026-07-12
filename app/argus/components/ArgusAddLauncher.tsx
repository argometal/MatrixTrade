"use client";

import { useArgusAdd } from "@/app/argus/components/ArgusAddProvider";
import type { CreateItemKind } from "@/lib/argus/create-flow-types";

import { ADD_MENU } from "@/lib/argus/ux-copy";

type MenuAlign = "start" | "center" | "end";

export function AddMenuButton({
  variant = "nav",
  align = "center",
  className = "",
  defaultKind = "journal",
}: {
  variant?: "nav" | "floating";
  align?: MenuAlign;
  className?: string;
  defaultKind?: CreateItemKind;
}) {
  const { openCapture } = useArgusAdd();

  const buttonClass =
    variant === "nav"
      ? "flex h-10 w-10 items-center justify-center rounded-full bg-teal-500 text-lg font-light text-white shadow-md shadow-teal-950/40 transition hover:bg-teal-400 active:scale-95"
      : "flex h-14 w-14 items-center justify-center rounded-full bg-teal-500 text-2xl font-light text-white shadow-lg shadow-teal-950/50 transition hover:bg-teal-400 active:scale-95";

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <button
        type="button"
        onClick={() => openCapture()}
        aria-label={ADD_MENU.fab}
        className={buttonClass}
      >
        +
      </button>
    </div>
  );
}

/** Primary context entry — opens slim Add context flow (not legacy wizard). */
export function AddCreateButton({
  align = "end",
  className = "",
  label = "Create",
}: {
  align?: MenuAlign;
  className?: string;
  /** @deprecated */
  defaultKind?: CreateItemKind;
  label?: string;
}) {
  const { openAddContext } = useArgusAdd();

  return (
    <button
      type="button"
      onClick={() => openAddContext()}
      aria-label={label}
      className={`inline-flex items-center rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-violet-900/30 transition hover:bg-violet-500 active:scale-[0.98] ${className}`}
    >
      {label}
    </button>
  );
}

/** @deprecated Use AddCreateButton */
export const AddJournalMenuButton = AddCreateButton;

/** @deprecated Use AddMenuButton in BottomNav */
export function ArgusAddLauncher() {
  return (
    <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-5 z-40">
      <AddMenuButton variant="floating" align="end" />
    </div>
  );
}

export const EntityCreateLauncher = ArgusAddLauncher;
