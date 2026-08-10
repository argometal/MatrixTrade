"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  FORGE_SYSTEMS,
  ForgeHexIcon,
  ForgeHomeMark,
  ForgeQuickNavMenu,
  type ForgeSystem,
} from "./ForgePortalNav";

type ContinueItem = {
  id: string;
  systemId: ForgeSystem["id"];
  title: string;
  detail: string;
  badge: string;
  badgeTone: "blue" | "green" | "purple";
  when: string;
  href: string;
};

const CONTINUE: ContinueItem[] = [
  {
    id: "c1",
    systemId: "argus",
    title: "Argus · Tags architecture",
    detail: "Working on entity relationships and taxonomy.",
    badge: "In Progress",
    badgeTone: "blue",
    when: "12m ago",
    href: "/argus/v2",
  },
  {
    id: "c2",
    systemId: "matrixtrade",
    title: "MatrixTrade · Scout allocation",
    detail: "Review active cases and capital readiness.",
    badge: "Analysis",
    badgeTone: "green",
    when: "Yesterday",
    href: "/home-preview",
  },
  {
    id: "c3",
    systemId: "argusforge",
    title: "ArgusForge · Chaos capture",
    detail: "Dumping loci and fragments into Explorer.",
    badge: "Learning",
    badgeTone: "purple",
    when: "2d ago",
    href: "/forge/chaos",
  },
];

const BADGE: Record<ContinueItem["badgeTone"], string> = {
  blue: "bg-blue-50 text-blue-700 ring-blue-200",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  purple: "bg-violet-50 text-violet-700 ring-violet-200",
};

const STATUS_DOT: Record<ForgeSystem["status"], string> = {
  active: "bg-emerald-500",
  ready: "bg-sky-500",
  frozen: "bg-zinc-400",
  planned: "bg-amber-400",
};

function systemById(id: ForgeSystem["id"]) {
  return FORGE_SYSTEMS.find((s) => s.id === id)!;
}

export function ForgeHomePortal() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const applications = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return FORGE_SYSTEMS;
    return FORGE_SYSTEMS.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.statusLabel.toLowerCase().includes(q)
    );
  }, [query]);

  const continueItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CONTINUE;
    return CONTINUE.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.detail.toLowerCase().includes(q) ||
        item.badge.toLowerCase().includes(q)
    );
  }, [query]);

  function onSearch(event: FormEvent) {
    event.preventDefault();
    const q = query.trim().toLowerCase();
    if (!q) return;
    const hit = FORGE_SYSTEMS.find(
      (s) => s.name.toLowerCase() === q || s.name.toLowerCase().startsWith(q)
    );
    if (hit && hit.status !== "planned") router.push(hit.href);
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#f4f6fa] text-zinc-900">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(ellipse_at_top,_#dbeafe_0%,_transparent_55%)]"
      />

      <header className="relative z-20 border-b border-zinc-200/80 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:gap-4 sm:px-6">
          {/* A mark = Home (this page). Home is not duplicated in the ··· menu. */}
          <Link
            href="/apps"
            aria-label="ARGUS FORGE Home"
            title="Home"
            className="flex min-w-0 items-center gap-3 rounded-xl px-1 py-1 transition hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          >
            <ForgeHomeMark size={38} />
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold tracking-tight text-zinc-900 sm:text-base">
                ARGUS FORGE
              </span>
              <span className="hidden truncate text-[11px] text-zinc-500 sm:block">
                Your systems. One workspace.
              </span>
            </span>
          </Link>

          <form onSubmit={onSearch} className="mx-auto hidden min-w-0 max-w-xl flex-1 md:block">
            <label className="relative block">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400">
                ⌕
              </span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search across Forge..."
                className="w-full rounded-full border border-zinc-200 bg-zinc-50 py-2.5 pl-10 pr-14 text-sm text-zinc-800 placeholder:text-zinc-400 shadow-inner focus:border-blue-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
              <kbd className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 rounded-md border border-zinc-200 bg-white px-1.5 py-0.5 text-[10px] text-zinc-400">
                ⌘ K
              </kbd>
            </label>
          </form>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <button
              type="button"
              aria-label="Notifications"
              title="Notifications"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-500 shadow-sm transition hover:border-zinc-300 hover:text-zinc-800"
            >
              <span aria-hidden className="text-base leading-none">
                🔔
              </span>
            </button>
            {/* No per-app icons here — ··· opens quick navigate. */}
            <ForgeQuickNavMenu currentId="home" />
          </div>
        </div>

        <form onSubmit={onSearch} className="border-t border-zinc-100 px-4 py-2.5 md:hidden">
          <label className="relative block">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">⌕</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search across Forge..."
              className="w-full rounded-full border border-zinc-200 bg-zinc-50 py-2 pl-9 pr-3 text-sm text-zinc-800 placeholder:text-zinc-400 focus:border-blue-300 focus:bg-white focus:outline-none"
            />
          </label>
        </form>
      </header>

      <main className="relative z-10 mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="min-w-0 space-y-10">
          <section aria-labelledby="forge-applications">
            <h2
              id="forge-applications"
              className="mb-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400"
            >
              Applications
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {applications.map((system) => {
                const interactive = system.status !== "planned";
                const cardClass =
                  "group flex flex-col rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-sm shadow-zinc-900/[0.03] transition hover:border-blue-200 hover:shadow-md";
                const body = (
                  <>
                    <ForgeHexIcon tone={system.tone} label={system.name} size={48} />
                    <p className="mt-3 text-base font-semibold text-zinc-900">{system.name}</p>
                    <p className="mt-1 flex-1 text-sm leading-relaxed text-zinc-500">{system.description}</p>
                    <div className="mt-4 flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-600">
                        <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[system.status]}`} aria-hidden />
                        {system.statusLabel}
                      </span>
                      <span className="text-zinc-300 transition group-hover:text-blue-500" aria-hidden>
                        →
                      </span>
                    </div>
                  </>
                );
                return interactive ? (
                  <Link key={system.id} href={system.href} className={cardClass}>
                    {body}
                  </Link>
                ) : (
                  <div
                    key={system.id}
                    className={`${cardClass} cursor-default opacity-80`}
                    title="Planned — not wired yet"
                  >
                    {body}
                  </div>
                );
              })}

              <div className="flex flex-col rounded-2xl border border-dashed border-blue-300/80 bg-blue-50/40 p-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-2xl font-light text-white shadow-sm shadow-blue-900/20">
                  +
                </span>
                <p className="mt-3 text-base font-semibold text-zinc-900">New System</p>
                <p className="mt-1 flex-1 text-sm leading-relaxed text-zinc-500">
                  Create or integrate a new system
                </p>
                <button
                  type="button"
                  disabled
                  className="mt-4 inline-flex w-fit items-center rounded-full bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white opacity-60"
                  title="Coming soon"
                >
                  Create
                </button>
              </div>
            </div>
            {applications.length === 0 ? (
              <p className="mt-3 text-sm text-zinc-500">No systems match “{query}”.</p>
            ) : null}
          </section>

          <section aria-labelledby="forge-continue">
            <h2
              id="forge-continue"
              className="mb-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400"
            >
              Continue
            </h2>
            <ul className="overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-sm shadow-zinc-900/[0.03]">
              {continueItems.map((item, index) => {
                const system = systemById(item.systemId);
                return (
                  <li key={item.id} className={index > 0 ? "border-t border-zinc-100" : undefined}>
                    <Link
                      href={item.href}
                      className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-zinc-50"
                    >
                      <ForgeHexIcon tone={system.tone} label={system.name} size={36} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-zinc-900">{item.title}</span>
                        <span className="mt-0.5 block truncate text-xs text-zinc-500">{item.detail}</span>
                      </span>
                      <span
                        className={`hidden shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ring-1 sm:inline ${BADGE[item.badgeTone]}`}
                      >
                        {item.badge}
                      </span>
                      <span className="hidden shrink-0 text-[11px] text-zinc-400 sm:inline">{item.when}</span>
                      <span className="shrink-0 text-zinc-300" aria-hidden>
                        →
                      </span>
                    </Link>
                  </li>
                );
              })}
              {continueItems.length === 0 ? (
                <li className="px-4 py-8 text-center text-sm text-zinc-500">No continue items match.</li>
              ) : null}
            </ul>
          </section>
        </div>

        <aside className="lg:pt-8">
          <div className="sticky top-6 rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-sm shadow-zinc-900/[0.03]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-400">Forge Status</p>
            <div className="mt-3 flex items-start justify-between gap-3">
              <div>
                <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-zinc-900">
                  All systems operational
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-zinc-500">
                  <span aria-hidden>↻</span>
                  Last sync: just now
                </p>
              </div>
              <span
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-lg text-emerald-600 ring-1 ring-emerald-100"
                aria-hidden
              >
                ✓
              </span>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
