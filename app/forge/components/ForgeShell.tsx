"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  hrefForSection,
  sectionFromPathname,
  type ForgeBottomSection,
} from "@/lib/argusforge/af03-system-state";
import { useForgeSystem } from "./ForgeSystemProvider";

const NAV: { section: ForgeBottomSection; label: string }[] = [
  { section: "home", label: "Home" },
  { section: "library", label: "Library" },
  { section: "vault", label: "Vault" },
  { section: "active", label: "Active" },
  { section: "archive", label: "Archive" },
];

function sectionTitle(pathname: string, systemLabel: string): string {
  if (pathname.endsWith("/view") || pathname.includes("/view")) return "Viewer";
  if (pathname.includes("/item/")) return "Editor";
  if (pathname.startsWith("/forge/deck/")) return "Chaos Deck";
  if (pathname.startsWith("/forge/argus")) return "Argus";
  if (pathname.startsWith("/forge/focus")) return "Focus (hidden)";
  if (pathname.startsWith("/forge/chaos")) return "Capture (proto)";
  if (pathname.startsWith("/forge/task")) return "Task";
  if (pathname.startsWith("/forge/vault")) return "Vault";
  if (pathname.startsWith("/forge/archive")) return "Archive";
  if (pathname.startsWith("/forge/active")) return "Active";
  if (pathname.startsWith("/forge/library")) return "Library";
  if (pathname === "/forge" || pathname === "/forge/") return "Home";
  return systemLabel;
}

export function ForgeShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/forge";
  const { system, setSystem, ready } = useForgeSystem();
  const systemLabel = system === "mta" ? "MTA" : "ArgusForge";
  const title = sectionTitle(pathname, systemLabel);
  const currentSection = sectionFromPathname(pathname);
  const hideChromeTitle = pathname === "/forge" || pathname === "/forge/";

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

          {/* ArgusForge | MTA system selector — domains, not folders */}
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

      <main className="flex-1 px-3 py-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
        {children}
      </main>

      <nav
        aria-label="ArgusForge primary"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-zinc-800 bg-zinc-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
      >
        <ul className="mx-auto flex max-w-lg items-stretch lg:max-w-3xl">
          {NAV.map((item) => {
            const href = hrefForSection(item.section);
            const active = currentSection === item.section;
            return (
              <li key={item.section} className="min-w-0 flex-1">
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-14 flex-col items-center justify-center gap-0.5 px-0.5 text-[11px] font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-400 ${
                    active ? "text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  <span className="truncate">{item.label}</span>
                  <span className="text-[9px] font-normal uppercase tracking-wide text-zinc-600">
                    {systemLabel === "MTA" ? "MTA" : "AF"}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
