"use client";

/**
 * AlgoApp-equivalent chrome for Chaos.
 * Layout/IA only — decks, fragments, dump, and AF03 store are unchanged.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, type ReactNode } from "react";
import {
  ExpandScreenButton,
  ExpandScreenProvider,
  useExpandScreenControls,
} from "./ExpandScreen";
import "./algo-surface.css";

const InChaosAlgoChrome = createContext(false);

export function isChaosAlgoSurface(pathname: string): boolean {
  if (pathname === "/forge" || pathname === "/forge/") return true;
  return (
    pathname.startsWith("/forge/chaos") ||
    pathname.startsWith("/forge/active") ||
    pathname.startsWith("/forge/archive") ||
    pathname.startsWith("/forge/library") ||
    pathname.startsWith("/forge/deck") ||
    pathname.startsWith("/forge/realm")
  );
}

function NavIcon({ name, className }: { name: string; className?: string }) {
  const cls = className ?? "h-[18px] w-[18px]";
  if (name === "inbox") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="M3 12h5l2 3h4l2-3h5v7H3v-7z" />
        <path d="M3 12 6 5h12l3 7" />
      </svg>
    );
  }
  if (name === "decks") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <rect x="4" y="5" width="16" height="5" rx="1" />
        <rect x="4" y="14" width="16" height="5" rx="1" />
      </svg>
    );
  }
  if (name === "archive") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <rect x="3" y="4" width="18" height="5" rx="1" />
        <path d="M5 9v10h14V9" />
        <path d="M10 13h4" />
      </svg>
    );
  }
  if (name === "search") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <circle cx="11" cy="11" r="6.5" />
        <path d="M16 16l4.5 4.5" />
      </svg>
    );
  }
  if (name === "home") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12 3.2 3.5 10.2V21h6.2v-6.3h4.6V21h6.2V10.2L12 3.2z" />
      </svg>
    );
  }
  return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="12" cy="12" r="8" />
    </svg>
  );
}

const SIDE = [
  { href: "/forge/chaos", id: "inbox", label: "Inbox", match: (p: string) => p.startsWith("/forge/chaos") },
  {
    href: "/forge",
    id: "decks",
    label: "My Decks",
    match: (p: string) =>
      p === "/forge" ||
      p === "/forge/" ||
      p.startsWith("/forge/active") ||
      p.startsWith("/forge/deck") ||
      p.startsWith("/forge/library") ||
      p.startsWith("/forge/realm"),
  },
  { href: "/forge/archive", id: "archive", label: "Archive", match: (p: string) => p.startsWith("/forge/archive") },
  { href: "/forge#search", id: "search", label: "Search", match: () => false },
] as const;

function navClass(active: boolean) {
  return `flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition ${
    active ? "bg-[#e8f2ff] text-[#2f80ed]" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
  }`;
}

export function ChaosAlgoShell({ children }: { children: ReactNode }) {
  const nested = useContext(InChaosAlgoChrome);
  if (nested) return <>{children}</>;

  return (
    <InChaosAlgoChrome.Provider value={true}>
      <ExpandScreenProvider>
        <ChaosAlgoChrome>{children}</ChaosAlgoChrome>
      </ExpandScreenProvider>
    </InChaosAlgoChrome.Provider>
  );
}

function ChaosAlgoChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/forge/active";
  const { expanded } = useExpandScreenControls();
  const onInbox = pathname.startsWith("/forge/chaos");
  const onDeck = pathname.startsWith("/forge/deck/");
  const onHome = pathname === "/forge" || pathname === "/forge/";
  const fabHref = onInbox
    ? "/forge/chaos"
    : onDeck
      ? `${pathname.split("/item")[0]}?new=card`
      : onHome
        ? "/forge?new=deck"
        : "/forge/active?new=deck";

  return (
    <div
      className={`algo-app flex h-dvh w-full overflow-hidden bg-[#f4f6f8] text-slate-800 antialiased ${
        expanded ? "fixed inset-0 z-[80]" : ""
      }`}
    >
      {expanded ? null : (
      <aside className="hidden w-[232px] shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex items-center gap-2.5 px-5 pb-3 pt-5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2f80ed] text-sm font-bold text-white">
            C
          </span>
          <span className="text-[17px] font-semibold tracking-tight text-slate-900">Chaos</span>
        </div>

        <div className="px-3 pb-3">
          <ExpandScreenButton className="flex min-h-10 w-full items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-[#2f80ed]" />
        </div>

        <Link
          href="/forge/chaos"
          className="mx-3 mb-3 flex items-center justify-center gap-2 rounded-lg bg-[#2f80ed] px-3 py-2.5 text-[13px] font-semibold text-white shadow-sm hover:bg-[#256fd4]"
        >
          Quick Bar
        </Link>

        <nav className="flex flex-1 flex-col gap-0.5 px-3" aria-label="Chaos">
          {SIDE.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              aria-current={item.match(pathname) ? "page" : undefined}
              className={navClass(item.match(pathname))}
            >
              <NavIcon name={item.id} />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto border-t border-slate-100 px-3 py-3">
          <Link href="/forge/argus" className={navClass(false)}>
            <NavIcon name="home" />
            Argus
          </Link>
        </div>
      </aside>
      )}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header
          className={`flex shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 py-2 ${
            expanded ? "" : "lg:hidden"
          }`}
        >
          {expanded ? null : (
            <Link href="/forge" className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#2f80ed] text-xs font-bold text-white">
                C
              </span>
              <span className="text-base font-semibold text-slate-900">Chaos</span>
            </Link>
          )}
          <span className="ml-auto">
            <ExpandScreenButton />
          </span>
        </header>

        <main
          className={
            expanded
              ? "relative flex min-h-0 min-w-0 flex-1 flex-col overflow-auto px-3 py-3"
              : "relative flex min-h-0 min-w-0 flex-1 flex-col overflow-auto px-3 py-4 pb-[calc(5.25rem+env(safe-area-inset-bottom))] lg:px-6 lg:py-5 lg:pb-6"
          }
        >
          {children}
        </main>
      </div>

      {expanded ? null : (
      <nav
        aria-label="Chaos mobile"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        <ul className="flex w-full items-stretch">
          {SIDE.filter((s) => s.id !== "search").map((item) => {
            const active = item.match(pathname);
            return (
              <li key={item.id} className="min-w-0 flex-1">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
                    active ? "text-[#2f80ed]" : "text-slate-400"
                  }`}
                >
                  <NavIcon name={item.id} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      )}

      {!onInbox && !expanded ? (
        <Link
          href={fabHref}
          aria-label="Add"
          className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#2f80ed] text-3xl font-light leading-none text-white shadow-lg hover:bg-[#256fd4] lg:bottom-8 lg:right-8"
        >
          +
        </Link>
      ) : null}
    </div>
  );
}
