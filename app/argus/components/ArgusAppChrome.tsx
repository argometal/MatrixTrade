"use client";

import { usePathname } from "next/navigation";
import { BottomNav } from "@/app/argus/components/BottomNav";
import { SignOutButton } from "@/app/components/SignOutButton";

/**
 * Legacy `(app)` chrome. Note edit (`/argus/logs/*`) drops the phone BottomNav
 * and narrow max-width — Inbox-converted journals only; Chronicle notes stay in v2.
 */
export function ArgusAppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isNoteEdit = pathname.startsWith("/argus/logs");

  return (
    <div
      className={
        isNoteEdit
          ? "mx-auto min-h-screen max-w-3xl px-5 pb-10 pt-4"
          : "mx-auto min-h-screen max-w-lg px-5 pb-24 pt-4 md:max-w-4xl"
      }
    >
      <div className="mb-3 flex justify-end">
        <SignOutButton className="text-xs font-medium text-zinc-500 hover:text-zinc-300" />
      </div>
      {children}
      {isNoteEdit ? null : <BottomNav />}
    </div>
  );
}
