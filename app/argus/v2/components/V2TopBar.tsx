import Link from "next/link";
import { AddJournalMenuButton } from "@/app/argus/components/ArgusAddLauncher";

export function V2TopBar() {
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md">
      <div className="flex items-center gap-3 px-4 py-3 lg:px-6">
        <Link href="/argus/v2" className="flex min-w-0 items-center gap-2 lg:hidden">
          <span className="text-lg" aria-hidden>
            🌐
          </span>
          <span className="truncate text-base font-bold text-zinc-50">Argus</span>
        </Link>

        <div className="mx-auto hidden max-w-xl flex-1 lg:block">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">⌕</span>
            <input
              readOnly
              placeholder="Search anything…"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 py-2.5 pl-9 pr-16 text-sm text-zinc-300 placeholder:text-zinc-600"
            />
            <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-500">
              ⌘ K
            </kbd>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            className="hidden items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-400 sm:inline-flex"
          >
            <span aria-hidden>🛡</span> PIN
          </button>
          <AddJournalMenuButton className="shrink-0" />
          <button
            type="button"
            className="relative hidden h-9 w-9 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 text-zinc-400 sm:flex"
            aria-label="Notifications"
          >
            🔔
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
              12
            </span>
          </button>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-600/30 text-xs font-bold text-violet-200 ring-1 ring-violet-500/40">
            VA
          </div>
        </div>
      </div>
    </header>
  );
}
