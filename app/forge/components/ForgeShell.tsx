"use client";

/**
 * CHANGE 24-01 — primary bottom bar only:
 * [home icon] | Argus | + | [Prepared output icon]
 * Argus secondary: Focus | Active | Archive (order fixed).
 */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { ForgeGlobalCreate } from "./ForgeGlobalCreate";
import { useForgeSystem } from "./ForgeSystemProvider";

type SheetId = "create" | null;

const ARGUS_SECONDARY: {
  href: string;
  label: string;
  pending?: boolean;
  match: (pathname: string) => boolean;
}[] = [
  {
    href: "/forge/focus",
    label: "Focus",
    pending: true,
    match: (p) => p.startsWith("/forge/focus"),
  },
  {
    href: "/forge/active",
    label: "Active",
    match: (p) =>
      p.startsWith("/forge/active") ||
      p.startsWith("/forge/library") ||
      p.startsWith("/forge/deck"),
  },
  {
    href: "/forge/archive",
    label: "Archive",
    match: (p) => p.startsWith("/forge/archive"),
  },
];

function sectionTitle(pathname: string, systemLabel: string): string {
  if (pathname.endsWith("/view") || pathname.includes("/view")) return "Viewer";
  if (pathname.includes("/item/")) return "Editor";
  if (pathname.startsWith("/forge/deck/")) return "Theke";
  if (pathname.startsWith("/forge/argus")) return "Argus";
  if (pathname.startsWith("/forge/focus")) return "Focus";
  if (pathname.startsWith("/forge/chaos")) return "Capture (proto)";
  if (pathname.startsWith("/forge/task")) return "Task";
  if (pathname.startsWith("/forge/vault")) return "Prepared output";
  if (pathname.startsWith("/forge/archive")) return "Archive";
  if (pathname.startsWith("/forge/active")) return "Active";
  if (pathname.startsWith("/forge/library")) return "Active";
  if (pathname === "/forge" || pathname === "/forge/") return "Home";
  return systemLabel;
}

function isArgusSurface(pathname: string): boolean {
  return (
    pathname.startsWith("/forge/focus") ||
    pathname.startsWith("/forge/active") ||
    pathname.startsWith("/forge/archive") ||
    pathname.startsWith("/forge/library") ||
    pathname.startsWith("/forge/deck") ||
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

export function ForgeShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/forge";
  const router = useRouter();
  const { system, setSystem, ready } = useForgeSystem();
  const [sheet, setSheet] = useState<SheetId>(null);
  const [argusOpen, setArgusOpen] = useState(false);

  const systemLabel = system === "mta" ? "MTA" : "ArgusForge";
  const title = sectionTitle(pathname, systemLabel);
  const hideChromeTitle = pathname === "/forge" || pathname === "/forge/";
  const onHome = pathname === "/forge" || pathname === "/forge/";
  const onOutput = pathname.startsWith("/forge/vault");
  const onArgus = isArgusSurface(pathname);
  const showArgusSecondary = argusOpen || onArgus;

  useEffect(() => {
    setSheet(null);
    if (isArgusSurface(pathname)) setArgusOpen(true);
  }, [pathname]);

  const itemClass =
    "flex min-h-14 w-full flex-col items-center justify-center gap-0.5 px-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-400";

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col bg-zinc-950 lg:max-w-3xl">
      <header className="sticky top-0 z-20 border-b border-zinc-800 bg-zinc-950/95 px-3 pb-2.5 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-500">
              System
            </p>
            {!hideChromeTitle ? (
              <h1 className="truncate text-base font-semibold text-zinc-100">{title}</h1>
            ) : (
              <p className="truncate text-xs text-zinc-600">Coordination shell</p>
            )}
          </div>

          <div
            className="inline-flex shrink-0 rounded-lg border border-zinc-800 bg-zinc-950 p-0.5"
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
                  : "text-zinc-500 hover:text-zinc-300"
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
                system === "mta" ? "bg-zinc-800 text-zinc-50" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              MTA
            </button>
          </div>
        </div>
      </header>

      <main
        className={`flex-1 px-3 py-4 ${
          showArgusSecondary
            ? "pb-[calc(8.5rem+env(safe-area-inset-bottom))]"
            : "pb-[calc(5.5rem+env(safe-area-inset-bottom))]"
        }`}
      >
        {children}
      </main>

      {sheet === "create" ? (
        <div
          className={`fixed inset-x-0 z-30 mx-auto max-w-lg border-t border-zinc-800 bg-zinc-950/98 shadow-[0_-12px_40px_rgba(0,0,0,0.45)] lg:max-w-3xl ${
            showArgusSecondary
              ? "bottom-[calc(7rem+env(safe-area-inset-bottom))]"
              : "bottom-[calc(3.5rem+env(safe-area-inset-bottom))]"
          }`}
          role="region"
          aria-label="Create"
        >
          <ForgeGlobalCreate pathname={pathname} onClose={() => setSheet(null)} />
        </div>
      ) : null}

      <div className="fixed inset-x-0 bottom-0 z-40">
        {/* CHANGE 24-01 — Argus secondary (does not replace primary bar) */}
        {showArgusSecondary ? (
          <nav
            aria-label="Argus secondary"
            className="border-t border-zinc-800 bg-zinc-950/98 backdrop-blur"
          >
            <ul className="mx-auto flex max-w-lg items-stretch lg:max-w-3xl">
              {ARGUS_SECONDARY.map((item) => {
                const active = item.match(pathname);
                return (
                  <li key={item.href} className="min-w-0 flex-1">
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={`flex min-h-11 flex-col items-center justify-center gap-0.5 px-1 text-[12px] font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-400 ${
                        active ? "text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      <span>{item.label}</span>
                      {item.pending ? (
                        <span className="text-[9px] font-medium uppercase tracking-wide text-amber-500">
                          Pending
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        ) : null}

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
                aria-current={onHome && !sheet ? "page" : undefined}
                className={itemClass}
              >
                <HomeIcon active={onHome && !sheet} />
              </Link>
            </li>

            <li className="min-w-0 flex-1">
              <button
                type="button"
                aria-label="Argus"
                aria-expanded={showArgusSecondary}
                onClick={() => {
                  if (showArgusSecondary && onArgus) {
                    setArgusOpen(false);
                    return;
                  }
                  setArgusOpen(true);
                  setSheet(null);
                  if (!onArgus) router.push("/forge/active");
                }}
                className={`${itemClass} text-[13px] font-semibold ${
                  showArgusSecondary || onArgus
                    ? "text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Argus
              </button>
            </li>

            <li className="min-w-0 flex-1">
              <button
                type="button"
                aria-label="Create"
                title="Create"
                aria-expanded={sheet === "create"}
                onClick={() => setSheet((s) => (s === "create" ? null : "create"))}
                className={`${itemClass} text-2xl font-light leading-none ${
                  sheet === "create" ? "text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                +
              </button>
            </li>

            <li className="min-w-0 flex-1">
              <Link
                href="/forge/vault"
                aria-label="Prepared output"
                title="Prepared output"
                aria-current={onOutput && !sheet ? "page" : undefined}
                className={itemClass}
              >
                <PreparedOutputIcon active={onOutput && !sheet} />
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  );
}
