"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { AppExchangeActions } from "@/app/components/AppExchangeActions";
import { V2TopBarAddMenu } from "@/app/argus/v2/components/V2TopBarAddMenu";
import { PrivateLockMenu } from "@/app/argus/components/PrivateLockMenu";
import { V2BuildBadge } from "@/app/argus/v2/components/V2BuildBadge";
import { useV2SidebarCollapse } from "@/app/argus/v2/components/V2DesktopShell";
import { useV2MobileMenu } from "@/app/argus/v2/components/V2MobileMenuProvider";
import { getV2NavPageLabel } from "@/lib/argus/v2/nav-items";

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
  const pathname = usePathname();
  const { toggle, open } = useV2MobileMenu();
  const { collapsed, toggle: toggleSidebar } = useV2SidebarCollapse();
  const pageLabel = getV2NavPageLabel(pathname);

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
          className={`flex min-w-0 max-w-[min(100%,13rem)] items-center gap-2 rounded-xl border px-2 py-1.5 text-left transition lg:hidden ${
            open
              ? "border-violet-500/50 bg-violet-500/10 ring-2 ring-violet-500/25"
              : "border-zinc-800 bg-zinc-900/80 hover:border-violet-500/40 hover:bg-zinc-900"
          }`}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-violet-800 text-sm font-bold text-white shadow-sm shadow-violet-950/50 ring-1 ring-violet-400/30">
            A
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold leading-tight text-zinc-50">Argus</span>
            <span
              className={`block truncate text-[10px] leading-tight ${open ? "text-violet-300/90" : "text-zinc-500"}`}
            >
              {pageLabel}
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={toggleSidebar}
          className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/80 text-zinc-400 transition hover:border-zinc-700 hover:text-zinc-200 lg:flex"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? "»" : "«"}
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
            href="/argus/v2/help"
            className="hidden h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/80 text-zinc-400 lg:flex"
            aria-label="How Argus works"
            title="How Argus works"
          >
            ?
          </Link>
          {privateConfigured ? (
            <PrivateLockMenu configured={privateConfigured} unlocked={privateUnlocked} />
          ) : (
            <span
              className="hidden items-center gap-1.5 rounded-xl border border-zinc-800 px-3 py-2 text-xs font-medium text-zinc-600 lg:inline-flex"
              title="Set ARGUS_PRIVATE_PIN to enable protected records"
            >
              <span aria-hidden>🛡</span> PIN
            </span>
          )}
          <V2BuildBadge className="hidden min-[420px]:inline" />
          <V2TopBarAddMenu className="shrink-0" />
          <AppExchangeActions app="argus" inboxCount={inboxCount} />
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
