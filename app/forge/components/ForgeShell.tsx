"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const NAV = [
  { href: "/forge/active", label: "Active", kind: "live" as const },
  { href: "/forge/archive", label: "Archive", kind: "live" as const },
  { href: "/forge/vault", label: "Vault", kind: "live" as const },
  { href: "/forge/focus", label: "Focus", kind: "pending" as const },
] as const;

function sectionTitle(pathname: string): string {
  if (pathname === "/forge" || pathname === "/forge/") return "Home";
  if (pathname.endsWith("/view") || pathname.includes("/view")) return "Viewer";
  if (pathname.includes("/item/")) return "Editor";
  if (pathname.startsWith("/forge/deck/")) return "Chaos Deck";
  if (pathname.startsWith("/forge/archive")) return "Archive";
  if (pathname.startsWith("/forge/focus")) return "Focus";
  if (pathname.startsWith("/forge/chaos")) return "Capture (proto)";
  if (pathname.startsWith("/forge/task")) return "Task";
  if (pathname.startsWith("/forge/vault")) return "Vault";
  if (pathname.startsWith("/forge/active")) return "Active";
  return "ArgusForge";
}

export function ForgeShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/forge";
  const title = sectionTitle(pathname);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col bg-zinc-950 lg:max-w-3xl">
      <header className="sticky top-0 z-20 border-b border-zinc-800 bg-zinc-950/95 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <Link
              href="/forge"
              className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500 hover:text-zinc-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
            >
              ArgusForge
            </Link>
            <h1 className="truncate text-lg font-semibold text-zinc-100">{title}</h1>
          </div>
          <Link
            href="/home-preview"
            className="shrink-0 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-300 transition hover:border-zinc-700 hover:text-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
          >
            MTA
          </Link>
        </div>
      </header>

      <main className="flex-1 px-4 py-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))]">{children}</main>

      <nav
        aria-label="ArgusForge primary"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-zinc-800 bg-zinc-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
      >
        <ul className="mx-auto flex max-w-lg items-stretch lg:max-w-3xl">
          {NAV.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-400 ${
                    active ? "text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  <span>{item.label}</span>
                  <span className="text-[10px] font-normal uppercase tracking-wide text-zinc-600">
                    {item.kind === "pending" ? "Pending" : "Live"}
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
