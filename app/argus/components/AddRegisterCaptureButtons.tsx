"use client";

import { useArgusAdd } from "@/app/argus/components/ArgusAddProvider";
import { ADD_CONTEXT } from "@/lib/argus/ux-copy";

/** Top bar: create a new entity. */
export function AddRegisterCaptureButtons({ className = "" }: { className?: string }) {
  const { openAddContext } = useArgusAdd();

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <button
        type="button"
        onClick={() => openAddContext()}
        className="inline-flex items-center rounded-xl bg-violet-600 px-3.5 py-2 text-sm font-semibold text-white shadow-lg shadow-violet-950/30 transition hover:bg-violet-500 active:scale-[0.98]"
        title={ADD_CONTEXT.hint}
      >
        {ADD_CONTEXT.action}
      </button>
    </div>
  );
}
