"use client";

/**
 * CHANGE 24-01 — primary bottom bar:
 * [home icon] | Argus | + | [handoff icon]
 * Argus expands secondary: Focus → Active → Archive.
 */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  hrefForView,
  roleFromPathname,
  viewFromPathname,
  type OperationalViewId,
} from "@/lib/argusforge/af03-system-state";
import { ForgeGlobalCreate } from "./ForgeGlobalCreate";
import { useForgeSystem } from "./ForgeSystemProvider";

type SheetId = "argus" | "create" | null;

const ARGUS_NAV: {
  id: OperationalViewId;
  label: string;
  hint: string;
  pending: boolean;
}[] = [
  { id: "focus", label: "Focus", hint: "Pending — first in order", pending: true },
  { id: "active", label: "Active", hint: "Working set", pending: false },
  { id: "archive", label: "Archive", hint: "Preserve filter", pending: false },
];

function sectionTitle(pathname: string): string {
  if (pathname.endsWith("/view") || pathname.includes("/view")) return "Viewer";
  if (pathname.includes("/item/")) return "Editor";
  if (pathname.startsWith("/forge/deck/")) return "Chaos Deck";
  if (pathname.startsWith("/forge/focus")) return "Focus";
  if (pathname.startsWith("/forge/chaos")) return "Capture (proto)";
  if (pathname.startsWith("/forge/task")) return "Task";
  if (pathname.startsWith("/forge/vault")) return "Prepared output";
  if (pathname.startsWith("/forge/archive")) return "Archive";
  if (pathname.startsWith("/forge/active") || pathname.startsWith("/forge/library")) return "Active";
  if (pathname === "/forge" || pathname === "/forge/") return "Home";
  return "ArgusForge";
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

function HandoffIcon({ active }: { active: boolean }) {
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
      {/* Document with arrow — provisional handoff / prepared output */}
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
  const { view, setView } = useForgeSystem();
  const [sheet, setSheet] = useState<SheetId>(null);

  const title = sectionTitle(pathname);
  const currentRole = roleFromPathname(pathname);
  const pathView = viewFromPathname(pathname);
  const hideChromeTitle = pathname === "/forge" || pathname === "/forge/";
  const onHome = pathname === "/forge" || pathname === "/forge/";
  const onHandoff = pathname.startsWith("/forge/vault");
  const onArgusSurface =
    currentRole === "view" ||
    pathname.startsWith("/forge/focus") ||
    pathname.startsWith("/forge/active") ||
    pathname.startsWith("/forge/archive") ||
    pathname.startsWith("/forge/library") ||
    pathname.startsWith("/forge/deck");

  useEffect(() => {
    if (pathView) setView(pathView);
  }, [pathView, setView]);

  useEffect(() => {
    setSheet(null);
  }, [pathname]);

  function toggle(id: SheetId) {
    setSheet((s) => (s === id ? null : id));
  }

  function selectArgusView(next: OperationalViewId) {
    setView(next);
    setSheet(null);
    router.push(hrefForView(next));
  }

  const itemClass =
    "flex min-h-14 w-full flex-col items-center justify-center gap-0.5 px-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-400";

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col bg-zinc-950 lg:max-w-3xl">
      <header className="sticky top-0 z-20 border-b border-zinc-800 bg-zinc-950/95 px-3 pb-2.5 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur">
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-500">
            ArgusForge
          </p>
          {!hideChromeTitle ? (
            <h1 className="truncate text-base font-semibold text-zinc-100">{title}</h1>
          ) : (
            <p className="truncate text-xs text-zinc-600">Coordination shell</p>
          )}
        </div>
      </header>

      <main className="flex-1 px-3 py-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
        {children}
      </main>

      {sheet ? (
        <div
          className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 mx-auto max-w-lg border-t border-zinc-800 bg-zinc-950/98 shadow-[0_-12px_40px_rgba(0,0,0,0.45)] lg:max-w-3xl"
          role="region"
          aria-label={sheet === "argus" ? "Argus navigation" : "Create"}
        >
          {sheet === "argus" ? (
            <div className="space-y-3 p-3">
              <p className="text-sm font-semibold text-zinc-100">Argus</p>
              <p className="text-xs text-zinc-500">
                Secondary navigation — Focus, Active, Archive (not separate products on the primary
                bar).
              </p>
              <ul className="space-y-2">
                {ARGUS_NAV.map((opt) => {
                  const selected = (pathView ?? view) === opt.id;
                  return (
                    <li key={opt.id}>
                      <button
                        type="button"
                        onClick={() => selectArgusView(opt.id)}
                        className={`flex min-h-12 w-full items-center justify-between rounded-lg border px-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${
                          selected
                            ? "border-zinc-600 bg-zinc-900 text-zinc-50"
                            : "border-zinc-800 text-zinc-300 hover:border-zinc-700"
                        }`}
                      >
                        <span>
                          <span className="block text-sm font-semibold">{opt.label}</span>
                          <span className="text-[11px] text-zinc-500">{opt.hint}</span>
                        </span>
                        {opt.pending ? (
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-500">
                            Pending
                          </span>
                        ) : selected ? (
                          <span className="text-[10px] uppercase tracking-wide text-zinc-500">
                            On
                          </span>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          {sheet === "create" ? (
            <ForgeGlobalCreate pathname={pathname} onClose={() => setSheet(null)} />
          ) : null}
        </div>
      ) : null}

      <nav
        aria-label="ArgusForge primary"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-800 bg-zinc-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
      >
        {/* CHANGE 24-01: [home] Argus + [handoff] */}
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
              aria-expanded={sheet === "argus"}
              onClick={() => toggle("argus")}
              className={`${itemClass} text-[13px] font-semibold ${
                sheet === "argus" || (onArgusSurface && !sheet)
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
              onClick={() => toggle("create")}
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
              aria-label="Handoff"
              title="Prepared output"
              aria-current={onHandoff && !sheet ? "page" : undefined}
              className={itemClass}
            >
              <HandoffIcon active={onHandoff && !sheet} />
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}
