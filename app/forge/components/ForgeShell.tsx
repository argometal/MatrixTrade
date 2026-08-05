"use client";

/**
 * CHANGE 24-01 / 24-22 / 24-47 — primary bottom bar only:
 * [home] | Argus | + (Chaos Dumping) | [Prepared output]
 * Focus / Active / Archive are Home filters — not global navigation (24-47).
 */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { AppExchangeActions } from "@/app/components/AppExchangeActions";
import { useForgeSystem } from "./ForgeSystemProvider";
import { AF_TEXT } from "@/lib/argusforge/af03-visible-ontology";

function sectionTitle(pathname: string, systemLabel: string): string {
  if (pathname.endsWith("/view") || pathname.includes("/view")) return "Viewer";
  if (pathname.includes("/item/")) return "Editor";
  if (pathname.startsWith("/forge/deck/")) return "Chaos Deck";
  if (pathname.startsWith("/forge/realm/")) return "Realm";
  if (pathname.startsWith("/forge/argus/units")) return "Argus units";
  if (pathname.startsWith("/forge/argus")) return "Argus";
  if (pathname.startsWith("/forge/focus")) return "Focus";
  if (pathname.startsWith("/forge/chaos")) return "Chaos Dumping";
  if (pathname.startsWith("/forge/task")) return "Task";
  if (pathname.startsWith("/forge/vault")) return "Prepared output";
  if (pathname.startsWith("/forge/archive")) return "Archive list";
  if (pathname.startsWith("/forge/active")) return "Active list";
  if (pathname.startsWith("/forge/library")) return "Active list";
  if (pathname === "/forge" || pathname === "/forge/") return "Explorer";
  return systemLabel;
}

function isArgusSurface(pathname: string): boolean {
  return (
    pathname.startsWith("/forge/focus") ||
    pathname.startsWith("/forge/active") ||
    pathname.startsWith("/forge/archive") ||
    pathname.startsWith("/forge/library") ||
    pathname.startsWith("/forge/deck") ||
    pathname.startsWith("/forge/realm") ||
    pathname.startsWith("/forge/argus")
  );
}

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className={active ? "text-zinc-100" : "text-zinc-500"}
    >
      <path d="M12 3.2 3.5 10.2V21h6.2v-6.3h4.6V21h6.2V10.2L12 3.2z" />
    </svg>
  );
}

function PreparedOutputIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={active ? "text-zinc-100" : "text-zinc-500"}
    >
      <path d="M8 4h6l4 4v12H8V4z" />
      <path d="M14 4v4h4" />
      <path d="M11 14h7" />
      <path d="M15.5 11.5 18 14l-2.5 2.5" />
    </svg>
  );
}

function ForgeShellInner({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/forge";
  const router = useRouter();
  const { system, setSystem, ready } = useForgeSystem();

  const systemLabel = system === "mta" ? "MTA" : "ArgusForge";
  const title = sectionTitle(pathname, systemLabel);
  const hideChromeTitle = pathname === "/forge" || pathname === "/forge/";
  const onHome = pathname === "/forge" || pathname === "/forge/";
  const onChaos = pathname.startsWith("/forge/chaos");
  const onOutput = pathname.startsWith("/forge/vault");
  const onArgus = isArgusSurface(pathname);
  const onArgusTreemap =
    pathname.startsWith("/forge/argus") && !pathname.startsWith("/forge/argus/units");

  const itemClass =
    "flex min-h-14 w-full flex-col items-center justify-center gap-0.5 px-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-400";

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col overflow-x-hidden bg-zinc-950 lg:max-w-3xl">
      <header className="sticky top-0 z-20 border-b border-zinc-800 bg-zinc-950/95 px-3 pb-2.5 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className={`text-[10px] font-medium uppercase tracking-[0.14em] ${AF_TEXT.metadata}`}>
              System
            </p>
            {!hideChromeTitle ? (
              <h1 className="flex min-w-0 items-center gap-2 truncate text-base font-semibold text-zinc-100">
                <span className="truncate">{title}</span>
                {onArgusTreemap ? (
                  <span className="shrink-0 rounded-full border border-amber-700/50 bg-amber-950/50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200/90">
                    Experimental
                  </span>
                ) : null}
              </h1>
            ) : (
              <p className={`truncate text-xs ${AF_TEXT.metadata}`}>ArgusForge</p>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <div
              className="inline-flex rounded-lg border border-zinc-800 bg-zinc-950 p-0.5"
              role="group"
              aria-label="Operational system"
            >
              <button
                type="button"
                aria-pressed={system === "argusforge"}
                disabled={!ready}
                onClick={() => setSystem("argusforge")}
                className={`min-h-9 rounded-md px-2.5 text-[11px] font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${
                  system === "argusforge"
                    ? "bg-zinc-800 text-zinc-50"
                    : `${AF_TEXT.metadata} hover:text-zinc-300`
                }`}
              >
                ArgusForge
              </button>
              <button
                type="button"
                aria-pressed={system === "mta"}
                disabled={!ready}
                onClick={() => setSystem("mta")}
                className={`min-h-9 rounded-md px-2.5 text-[11px] font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${
                  system === "mta" ? "bg-zinc-800 text-zinc-50" : `${AF_TEXT.metadata} hover:text-zinc-300`
                }`}
              >
                MTA
              </button>
            </div>
            <AppExchangeActions app="forge" />
          </div>
        </div>
      </header>

      <main className="min-w-0 flex-1 overflow-x-hidden px-3 py-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
        {children}
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-lg lg:max-w-3xl">
        <nav
          aria-label="ArgusForge primary"
          className="border-t border-zinc-800 bg-zinc-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
        >
          <ul className="mx-auto flex max-w-lg items-stretch lg:max-w-3xl">
            <li className="min-w-0 flex-1">
              <Link
                href="/forge"
                aria-label="Home"
                title="Home"
                aria-current={onHome ? "page" : undefined}
                className={itemClass}
              >
                <HomeIcon active={onHome} />
              </Link>
            </li>

            <li className="min-w-0 flex-1">
              <button
                type="button"
                aria-label="Argus"
                aria-current={onArgus ? "page" : undefined}
                onClick={() => router.push("/forge/argus?filter=active")}
                className={`${itemClass} text-[13px] font-semibold ${
                  onArgus ? "text-zinc-100" : `${AF_TEXT.metadata} hover:text-zinc-300`
                }`}
              >
                <span>Argus</span>
                <span className="text-[9px] font-normal uppercase tracking-wide text-amber-500/80">
                  exp
                </span>
              </button>
            </li>

            <li className="min-w-0 flex-1">
              <Link
                href="/forge/chaos"
                aria-label="Chaos Dumping"
                title="Chaos Dumping"
                aria-current={onChaos ? "page" : undefined}
                className={`${itemClass} text-2xl font-light leading-none ${
                  onChaos ? "text-zinc-100" : `${AF_TEXT.metadata} hover:text-zinc-300`
                }`}
              >
                +
              </Link>
            </li>

            <li className="min-w-0 flex-1">
              <Link
                href="/forge/vault"
                aria-label="Prepared output"
                title="Prepared output"
                aria-current={onOutput ? "page" : undefined}
                className={itemClass}
              >
                <PreparedOutputIcon active={onOutput} />
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  );
}

export function ForgeShell({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto min-h-screen w-full max-w-lg bg-zinc-950 px-3 py-4 text-sm text-zinc-500 lg:max-w-3xl">
          Loading shell…
        </div>
      }
    >
      <ForgeShellInner>{children}</ForgeShellInner>
    </Suspense>
  );
}
