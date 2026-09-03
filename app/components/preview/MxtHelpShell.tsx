"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PAGE_HELP, type PageHelpId } from "@/lib/page-help";
import { mxtPath } from "@/lib/mxt-paths";

const TOPIC_HREFS: Partial<Record<PageHelpId, string>> = {
  dashboard: mxtPath("/home-preview"),
  trades: mxtPath("/trades"),
  insights: `${mxtPath("/stats")}?tab=pipeline`,
  planning: mxtPath("/scout"),
  scouting: mxtPath("/scout"),
  playbook: mxtPath("/playbook"),
  inbox: mxtPath("/inbox"),
};

const TOPIC_ORDER: PageHelpId[] = [
  "insights",
  "scouting",
  "trades",
  "playbook",
  "dashboard",
  "inbox",
];

/**
 * MXT Help index — Argus-style topic nav + detail, reusing PAGE_HELP.
 */
export function MxtHelpShell() {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<PageHelpId>("insights");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return TOPIC_ORDER.filter((id) => {
      if (!q) return true;
      const h = PAGE_HELP[id];
      const hay = [h.title, h.summary, ...(h.principles ?? []), ...h.steps]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [query]);

  const activeId = visible.includes(active) ? active : visible[0] ?? "insights";
  const help = PAGE_HELP[activeId];
  const href = TOPIC_HREFS[activeId];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 lg:px-6" data-mxt-help-index>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
          Help
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          MXT help topics (same family pattern as Argus System → Help). Use the ?
          Help control on each page for contextual guidance. Learning lives
          inside Insights → Pipeline Performance.
        </p>
        <label className="mt-4 block max-w-md">
          <span className="sr-only">Search help</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search topics…"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500/50 focus:outline-none"
          />
        </label>
      </header>

      <div className="grid gap-6 lg:grid-cols-[14rem_1fr]">
        <nav className="space-y-0.5" aria-label="Help topics">
          {visible.map((id) => {
            const title = PAGE_HELP[id].title;
            const on = id === activeId;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActive(id)}
                className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                  on
                    ? "bg-violet-500/15 text-violet-200"
                    : "text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-200"
                }`}
              >
                {title}
              </button>
            );
          })}
          {visible.length === 0 ? (
            <p className="px-3 py-2 text-sm text-zinc-500">No topics match.</p>
          ) : null}
        </nav>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-base font-semibold text-zinc-100">{help.title}</h2>
            {href ? (
              <Link
                href={href}
                className="shrink-0 text-xs text-violet-400 hover:text-violet-300 hover:underline"
              >
                Open page
              </Link>
            ) : null}
          </div>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            {help.summary}
          </p>

          {help.principles && help.principles.length > 0 ? (
            <>
              <h3 className="mt-5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Principles
              </h3>
              <ul className="mt-2 list-disc space-y-2 pl-4 text-sm text-zinc-300">
                {help.principles.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </>
          ) : null}

          <h3 className="mt-5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {help.workflowTitle ?? "Steps"}
          </h3>
          <ol className="mt-2 list-decimal space-y-2 pl-4 text-sm text-zinc-300">
            {help.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
