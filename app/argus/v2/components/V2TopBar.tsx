"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AddCreateButton } from "@/app/argus/components/ArgusAddLauncher";
import { PrivateLockMenu } from "@/app/argus/components/PrivateLockMenu";
import { useV2MobileMenu } from "@/app/argus/v2/components/V2MobileMenuProvider";

export function V2TopBar({
  inboxCount = 0,
  privateConfigured = false,
  privateUnlocked = false,
}: {
  inboxCount?: number;
  privateConfigured?: boolean;
  privateUnlocked?: boolean;
}) {
  const router = useRouter();
  const { toggle, open } = useV2MobileMenu();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        router.push("/argus/search");
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router]);

  return (
    <header className="sticky top-0 z-40 shrink-0 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md">
      <div className="flex items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3 lg:px-6">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-controls="v2-mobile-menu"
          aria-label={open ? "Close Argus menu" : "Open Argus menu"}
          className="flex min-w-0 items-center gap-2.5 rounded-xl border border-zinc-800 bg-zinc-900/80 px-2 py-1.5 text-left ring-violet-500/30 transition hover:border-violet-500/40 hover:bg-zinc-900 lg:hidden"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-600/25 text-lg ring-1 ring-violet-500/40">
            🌐
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold leading-tight text-zinc-50">Argus</span>
            <span className="block text-[10px] leading-tight text-zinc-500">Home · Browse · Inbox</span>
          </span>
          <span className="ml-0.5 shrink-0 text-base text-zinc-500" aria-hidden>
            {open ? "✕" : "☰"}
          </span>
        </button>

        <form action="/argus/search" method="get" className="mx-auto hidden max-w-xl flex-1 lg:block">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">⌕</span>
            <input
              name="q"
              placeholder="Search anything…"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 py-2.5 pl-9 pr-16 text-sm text-zinc-300 placeholder:text-zinc-600 focus:border-violet-500/50 focus:outline-none"
            />
            <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-500">
              ⌘ K
            </kbd>
          </div>
        </form>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <Link
            href="/argus/search"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/80 text-zinc-400 lg:hidden"
            aria-label="Search"
          >
            ⌕
          </Link>
          <Link
            href="/argus/v2/inbox"
            className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/80 text-zinc-400 lg:hidden"
            aria-label="Inbox"
          >
            ✉
            {inboxCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                {inboxCount > 99 ? "99+" : inboxCount}
              </span>
            ) : null}
          </Link>
          {privateConfigured ? (
            <PrivateLockMenu configured={privateConfigured} unlocked={privateUnlocked} />
          ) : (
            <span
              className="hidden items-center gap-1.5 rounded-xl border border-zinc-800 px-3 py-2 text-xs font-medium text-zinc-600 sm:inline-flex"
              title="Set ARGUS_PRIVATE_PIN to enable protected records"
            >
              <span aria-hidden>🛡</span> PIN
            </span>
          )}
          <AddCreateButton className="shrink-0" />
          <Link
            href="/argus/v2/inbox"
            className="relative hidden h-9 w-9 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 text-zinc-400 sm:flex"
            aria-label="Inbox"
          >
            🔔
            {inboxCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                {inboxCount > 99 ? "99+" : inboxCount}
              </span>
            ) : null}
          </Link>
          <div
            className="hidden h-9 w-9 items-center justify-center rounded-full bg-violet-600/30 text-xs font-bold text-violet-200 ring-1 ring-violet-500/40 sm:flex"
            title="Profile"
          >
            VA
          </div>
        </div>
      </div>
    </header>
  );
}
