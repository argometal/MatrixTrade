"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { V2Card, V2SectionTitle } from "@/app/argus/v2/components/v2-ui";
import {
  HELP_GROUP_LABELS,
  HELP_SECTIONS,
  helpTopicMatches,
  type HelpGroup,
  type HelpSection,
} from "@/lib/argus/v2/help-topics";

function HelpNav({
  sections,
  activeId,
  onSelect,
}: {
  sections: HelpSection[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <nav className="space-y-0.5" aria-label="Help topics">
      {sections.map((section) => (
        <button
          key={section.id}
          type="button"
          onClick={() => onSelect(section.id)}
          className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition ${
            activeId === section.id
              ? "bg-violet-500/15 text-violet-200"
              : "text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-200"
          }`}
        >
          {section.title}
        </button>
      ))}
    </nav>
  );
}

function HelpSectionBlock({ section }: { section: HelpSection }) {
  return (
    <section id={section.id} className="scroll-mt-6">
      <V2Card className="p-5 sm:p-6">
        <h2 className="text-base font-semibold text-zinc-100">{section.title}</h2>
        {section.intro ? <p className="mt-2 text-sm leading-relaxed text-zinc-500">{section.intro}</p> : null}
        <ul className={`space-y-4 ${section.intro ? "mt-5" : "mt-4"}`}>
          {section.items.map((item) => (
            <li key={item.title}>
              <p className="text-sm font-medium text-violet-300">{item.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-zinc-500">{item.body}</p>
            </li>
          ))}
        </ul>
        {section.tip ? (
          <div className="mt-5 rounded-xl border border-amber-500/25 bg-amber-500/5 px-3 py-2.5">
            <p className="text-xs leading-relaxed text-amber-200/90">Tip: {section.tip}</p>
          </div>
        ) : null}
      </V2Card>
    </section>
  );
}

/** Full Help index — filter by group / search. Contextual ? panels use the same topics. */
export function V2HelpShell() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const topicParam = searchParams.get("topic") ?? "";
  const groupParam = (searchParams.get("group") as HelpGroup | "all" | null) ?? "all";

  const initialGroup: HelpGroup | "all" =
    groupParam === "basics" ||
    groupParam === "intelligence" ||
    groupParam === "browse" ||
    groupParam === "ops"
      ? groupParam
      : topicParam && HELP_SECTIONS.some((s) => s.id === topicParam)
        ? HELP_SECTIONS.find((s) => s.id === topicParam)!.group
        : "all";

  const [group, setGroup] = useState<HelpGroup | "all">(initialGroup);
  const [query, setQuery] = useState("");
  const [activeNav, setActiveNav] = useState(
    topicParam && HELP_SECTIONS.some((s) => s.id === topicParam) ? topicParam : HELP_SECTIONS[0].id
  );

  const visible = useMemo(
    () => HELP_SECTIONS.filter((section) => helpTopicMatches(section, group, query)),
    [group, query]
  );

  useEffect(() => {
    if (!topicParam) return;
    const match = HELP_SECTIONS.find((s) => s.id === topicParam);
    if (!match) return;
    setGroup(match.group);
    setActiveNav(match.id);
    const timer = window.setTimeout(() => {
      document.getElementById(match.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [topicParam]);

  function selectTopic(id: string) {
    setActiveNav(id);
    const params = new URLSearchParams(searchParams.toString());
    params.set("topic", id);
    params.delete("group");
    router.replace(`/argus/v2/help?${params.toString()}`, { scroll: false });
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function changeGroup(next: HelpGroup | "all") {
    setGroup(next);
    const params = new URLSearchParams(searchParams.toString());
    if (next === "all") params.delete("group");
    else params.set("group", next);
    const topic = params.get("topic");
    if (topic) {
      const section = HELP_SECTIONS.find((s) => s.id === topic);
      if (!section || (next !== "all" && section.group !== next)) {
        params.delete("topic");
      }
    }
    const qs = params.toString();
    router.replace(qs ? `/argus/v2/help?${qs}` : "/argus/v2/help", { scroll: false });
  }

  return (
    <div className="v2-page-shell flex h-full min-h-0 flex-col overflow-hidden">
      <div className="argus-v2-scroll min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
        <div className="px-4 py-6 lg:px-8">
          <header className="mb-5">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/15 text-lg ring-1 ring-violet-500/30">
                ?
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-50">Help index</h1>
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-500">
              Full guide. On any screen, tap <span className="text-zinc-300">?</span> for help about what you’re
              looking at — then come here for the rest.
            </p>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
              <div
                className="inline-flex flex-wrap gap-1 rounded-lg border border-zinc-800/80 bg-zinc-950/60 p-0.5"
                role="group"
                aria-label="Help topic group"
              >
                {HELP_GROUP_LABELS.map((item) => {
                  const active = group === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => changeGroup(item.id)}
                      className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition sm:text-xs ${
                        active
                          ? "bg-violet-600/30 text-violet-100 ring-1 ring-violet-500/45"
                          : "text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
              <label className="block min-w-0 flex-1 sm:max-w-xs">
                <span className="sr-only">Search help</span>
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Filter topics… e.g. patterns, portfolio"
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950/80 px-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-violet-500/40 focus:outline-none"
                />
              </label>
            </div>
          </header>

          <div className="grid gap-6 xl:grid-cols-[220px_1fr]">
            <aside className="xl:sticky xl:top-6 xl:self-start">
              <V2SectionTitle>
                Topics{visible.length !== HELP_SECTIONS.length ? ` · ${visible.length}` : ""}
              </V2SectionTitle>
              {visible.length === 0 ? (
                <p className="mt-2 text-xs text-zinc-600">No topics match. Clear search or switch group.</p>
              ) : (
                <HelpNav sections={visible} activeId={activeNav} onSelect={selectTopic} />
              )}
            </aside>

            <div className="space-y-4">
              {visible.length === 0 ? (
                <V2Card className="p-5">
                  <p className="text-sm text-zinc-500">No help topics match this filter.</p>
                </V2Card>
              ) : (
                visible.map((section) => <HelpSectionBlock key={section.id} section={section} />)
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
