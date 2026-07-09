"use client";

import { useArgusAdd } from "@/app/argus/components/ArgusAddProvider";
import { REGISTER } from "@/lib/argus/ux-copy";

/** Top bar: Register evidence (sheet) + Add context (trimmed entity flow). */
export function AddRegisterCaptureButtons({ className = "" }: { className?: string }) {
  const { openCapture, openCreateFlow } = useArgusAdd();

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <button
        type="button"
        onClick={() => openCapture()}
        className="inline-flex items-center rounded-xl bg-teal-600 px-3.5 py-2 text-sm font-semibold text-white shadow-lg shadow-teal-950/30 transition hover:bg-teal-500 active:scale-[0.98]"
        title="Register what happened — link to topics, events, projects"
      >
        {REGISTER.action}
      </button>
      <button
        type="button"
        onClick={() =>
          openCreateFlow({
            pickItemKind: true,
            entityCaptureOnly: true,
          })
        }
        className="inline-flex items-center rounded-xl border border-violet-500/40 bg-violet-600/15 px-3.5 py-2 text-sm font-semibold text-violet-200 transition hover:bg-violet-600/25 active:scale-[0.98]"
        title={REGISTER.entityCaptureHint}
      >
        {REGISTER.entityCapture}
      </button>
    </div>
  );
}
