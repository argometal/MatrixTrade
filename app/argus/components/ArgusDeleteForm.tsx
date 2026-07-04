"use client";

import type { ReactNode } from "react";

const dangerClass =
  "rounded-lg border border-red-900/60 bg-red-950/30 px-3 py-2 text-xs font-medium text-red-300 hover:bg-red-950/50";

export function ArgusDeleteForm({
  action,
  confirmMessage,
  label,
  children,
  className,
}: {
  action: (formData: FormData) => void | Promise<void>;
  confirmMessage: string;
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <form
      action={action}
      className={className}
      onSubmit={(event) => {
        if (!confirm(confirmMessage)) event.preventDefault();
      }}
    >
      {children}
      <button type="submit" className={dangerClass}>
        {label}
      </button>
    </form>
  );
}

export function ArgusClearAllForm({
  action,
  confirmMessage,
  label,
  hint,
}: {
  action: (formData: FormData) => void | Promise<void>;
  confirmMessage: string;
  label: string;
  hint: string;
}) {
  return (
    <form
      action={action}
      className="mt-8 rounded-xl border border-red-900/40 bg-red-950/20 p-4"
      onSubmit={(event) => {
        if (!confirm(confirmMessage)) event.preventDefault();
      }}
    >
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-red-400/80">Testing</p>
      <p className="mt-2 text-[13px] text-zinc-500">{hint}</p>
      <button
        type="submit"
        className="mt-3 w-full rounded-xl border border-red-800/60 py-3 text-sm font-medium text-red-300 hover:bg-red-950/40"
      >
        {label}
      </button>
    </form>
  );
}
