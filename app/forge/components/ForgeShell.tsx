"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  hrefForView,
  roleFromPathname,
  viewFromPathname,
  type ForgeBottomRole,
  type OperationalViewId,
  type VaultModeId,
} from "@/lib/argusforge/af03-system-state";
import { ForgeGlobalCreate } from "./ForgeGlobalCreate";
import { useForgeSystem } from "./ForgeSystemProvider";

type SheetId = "engine" | "create" | "view" | "output" | null;

const VIEW_OPTIONS: {
  id: OperationalViewId;
  label: string;
  hint: string;
  available: boolean;
}[] = [
  { id: "focus", label: "Focus", hint: "First — pending signals", available: false },
  { id: "active", label: "Active", hint: "Working repository", available: true },
  { id: "archive", label: "Archive", hint: "Preserve / filter", available: true },
];

function sectionTitle(pathname: string, engineLabel: string): string {
  if (pathname.endsWith("/view") || pathname.includes("/view")) return "Viewer";
  if (pathname.includes("/item/")) return "Editor";
  if (pathname.startsWith("/forge/deck/")) return "Chaos Deck";
  if (pathname.startsWith("/forge/focus")) return "Focus";
  if (pathname.startsWith("/forge/chaos")) return "Capture (proto)";
  if (pathname.startsWith("/forge/task")) return "Task";
  if (pathname.startsWith("/forge/vault")) return "Output";
  if (pathname.startsWith("/forge/archive")) return "Archive";
  if (pathname.startsWith("/forge/active") || pathname.startsWith("/forge/library")) return "Active";
  if (pathname === "/forge" || pathname === "/forge/") return "Home";
  return engineLabel;
}

function NavButton({
  label,
  sub,
  active,
  onClick,
  href,
}: {
  label: string;
  sub: string;
  active: boolean;
  onClick?: () => void;
  href?: string;
}) {
  const className = `flex min-h-14 w-full flex-col items-center justify-center gap-0.5 px-0.5 text-[11px] font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-400 ${
    active ? "text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
  }`;

  if (href && !onClick) {
    return (
      <Link href={href} aria-current={active ? "page" : undefined} className={className}>
        <span className="truncate">{label}</span>
        <span className="max-w-full truncate text-[9px] font-normal uppercase tracking-wide text-zinc-600">
          {sub}
        </span>
      </Link>
    );
  }

  return (
    <button
      type="button"
      aria-current={active ? "true" : undefined}
      aria-expanded={active && !!onClick ? true : undefined}
      onClick={onClick}
      className={className}
    >
      <span className="truncate">{label}</span>
      <span className="max-w-full truncate text-[9px] font-normal uppercase tracking-wide text-zinc-600">
        {sub}
      </span>
    </button>
  );
}

export function ForgeShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/forge";
  const router = useRouter();
  const { system, setSystem, view, setView, vaultMode, setVaultMode, ready } = useForgeSystem();
  const [sheet, setSheet] = useState<SheetId>(null);

  const engineLabel = system === "mta" ? "MTA Engine" : "Argus Engine";
  const title = sectionTitle(pathname, engineLabel);
  const currentRole = roleFromPathname(pathname);
  const pathView = viewFromPathname(pathname);
  const hideChromeTitle = pathname === "/forge" || pathname === "/forge/";

  useEffect(() => {
    if (pathView) setView(pathView);
  }, [pathView, setView]);

  useEffect(() => {
    setSheet(null);
  }, [pathname]);

  function toggle(id: SheetId) {
    setSheet((s) => (s === id ? null : id));
  }

  function selectView(next: OperationalViewId) {
    setView(next);
    setSheet(null);
    router.push(hrefForView(next));
  }

  function selectOutput(mode: VaultModeId) {
    setVaultMode(mode);
    setSheet(null);
    router.push("/forge/vault");
  }

  const viewLabel =
    pathView === "focus" ? "Focus" : pathView === "archive" ? "Archive" : pathView === "active" ? "Active" : view === "focus" ? "Focus" : view === "archive" ? "Archive" : "Active";

  const outputLabel = vaultMode === "alexandria" ? "Alexandria" : "Vault";

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col bg-zinc-950 lg:max-w-3xl">
      <header className="sticky top-0 z-20 border-b border-zinc-800 bg-zinc-950/95 px-3 pb-2.5 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur">
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-500">
            ArgusForge · {ready ? engineLabel : "…"}
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
          aria-label="Shell control"
        >
          {sheet === "engine" ? (
            <div className="space-y-3 p-3">
              <p className="text-sm font-semibold text-zinc-100">Engine</p>
              <p className="text-xs text-zinc-500">
                Which logic is active — not a folder, not a view. May enable composition later.
              </p>
              <div
                className="inline-flex w-full rounded-lg border border-zinc-800 bg-zinc-950 p-0.5"
                role="group"
                aria-label="Engine"
              >
                <button
                  type="button"
                  aria-pressed={system === "argusforge"}
                  disabled={!ready}
                  onClick={() => {
                    setSystem("argusforge");
                    setSheet(null);
                  }}
                  className={`min-h-11 flex-1 rounded-md text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${
                    system === "argusforge"
                      ? "bg-zinc-800 text-zinc-50"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  Argus Engine
                </button>
                <button
                  type="button"
                  aria-pressed={system === "mta"}
                  disabled={!ready}
                  onClick={() => {
                    setSystem("mta");
                    setSheet(null);
                  }}
                  className={`min-h-11 flex-1 rounded-md text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${
                    system === "mta" ? "bg-zinc-800 text-zinc-50" : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  MTA Engine
                </button>
              </div>
            </div>
          ) : null}

          {sheet === "create" ? (
            <ForgeGlobalCreate pathname={pathname} onClose={() => setSheet(null)} />
          ) : null}

          {sheet === "view" ? (
            <div className="space-y-3 p-3">
              <p className="text-sm font-semibold text-zinc-100">View</p>
              <p className="text-xs text-zinc-500">
                Operational lens — order fixed: Focus → Active → Archive. Focus stays in the control
                even when unavailable.
              </p>
              <ul className="space-y-2">
                {VIEW_OPTIONS.map((opt) => {
                  const selected = (pathView ?? view) === opt.id;
                  return (
                    <li key={opt.id}>
                      <button
                        type="button"
                        onClick={() => selectView(opt.id)}
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
                        {!opt.available ? (
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-500">
                            Blocked
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

          {sheet === "output" ? (
            <div className="space-y-3 p-3">
              <p className="text-sm font-semibold text-zinc-100">Output</p>
              <p className="text-xs text-zinc-500">
                Prep / disclosure surfaces — not the working repository view.
              </p>
              <div
                className="inline-flex w-full rounded-lg border border-zinc-800 bg-zinc-950 p-0.5"
                role="group"
                aria-label="Output"
              >
                <button
                  type="button"
                  aria-pressed={vaultMode === "vault"}
                  onClick={() => selectOutput("vault")}
                  className={`min-h-11 flex-1 rounded-md text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${
                    vaultMode === "vault"
                      ? "bg-zinc-800 text-zinc-50"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  Vault
                </button>
                <button
                  type="button"
                  aria-pressed={vaultMode === "alexandria"}
                  onClick={() => selectOutput("alexandria")}
                  className={`min-h-11 flex-1 rounded-md text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${
                    vaultMode === "alexandria"
                      ? "bg-zinc-800 text-zinc-50"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  Alexandria
                </button>
              </div>
              <p className="text-[11px] text-zinc-600">
                Alexandria may stay locked (FROZEN disclosure only).
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      <nav
        aria-label="ArgusForge primary"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-800 bg-zinc-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
      >
        <ul className="mx-auto flex max-w-lg items-stretch lg:max-w-3xl">
          <li className="min-w-0 flex-1">
            <NavButton
              label="Home"
              sub="Hub"
              active={currentRole === "home" && !sheet}
              href="/forge"
            />
          </li>
          <li className="min-w-0 flex-1">
            <NavButton
              label="Engine"
              sub={system === "mta" ? "MTA" : "Argus"}
              active={sheet === "engine"}
              onClick={() => toggle("engine")}
            />
          </li>
          <li className="min-w-0 flex-1">
            <NavButton
              label="Create"
              sub="Action"
              active={sheet === "create"}
              onClick={() => toggle("create")}
            />
          </li>
          <li className="min-w-0 flex-1">
            <NavButton
              label="View"
              sub={viewLabel}
              active={currentRole === "view" || sheet === "view"}
              onClick={() => toggle("view")}
            />
          </li>
          <li className="min-w-0 flex-1">
            <NavButton
              label="Output"
              sub={outputLabel}
              active={currentRole === "output" || sheet === "output"}
              onClick={() => toggle("output")}
            />
          </li>
        </ul>
      </nav>
    </div>
  );
}

export type { ForgeBottomRole };
