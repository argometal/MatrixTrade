"use client";

/**
 * CHANGE 24-47 — Real entity breadcrumbs + compact Fragment mode switch.
 */

import Link from "next/link";
import {
  entityPathForDeck,
  entityPathForFragment,
  fragmentModeHref,
  type FragmentEditorMode,
} from "@/lib/argusforge/af03-entity-path";
import type { Af03RepoState } from "@/lib/argusforge/af03-repo-types";
import { AF_TEXT } from "@/lib/argusforge/af03-visible-ontology";

export function ForgeBackLink({
  href,
  label = "Back",
}: {
  href: string;
  label?: string;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={`inline-flex min-h-11 min-w-11 items-center gap-1.5 rounded-lg px-1.5 text-sm font-medium ${AF_TEXT.secondary} hover:text-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400`}
    >
      <span aria-hidden className="text-base leading-none">
        ←
      </span>
      <span className="truncate">{label}</span>
    </Link>
  );
}

export function EntityLocationBreadcrumb({
  state,
  deckId,
  fragmentId,
}: {
  state: Af03RepoState;
  deckId: string;
  fragmentId?: string;
}) {
  const crumbs = fragmentId
    ? entityPathForFragment(state, deckId, fragmentId)
    : entityPathForDeck(state, deckId);

  const parent = crumbs.length >= 2 ? crumbs[crumbs.length - 2] : crumbs[0];
  const backHref = parent?.href ?? "/forge";
  const backLabel =
    parent?.kind === "home"
      ? "Explorer"
      : parent?.title
        ? parent.title
        : "Back";

  return (
    <div className="space-y-1">
      <ForgeBackLink href={backHref} label={backLabel} />
      <nav
        aria-label="Location"
        className={`flex max-w-full items-center gap-1 overflow-x-auto text-xs ${AF_TEXT.metadata} [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}
      >
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <span key={`${c.kind}-${c.id ?? "root"}-${i}`} className="flex shrink-0 items-center gap-1">
              {i > 0 ? <span aria-hidden>/</span> : null}
              {last || !c.href ? (
                <span className={`max-w-[10rem] truncate ${last ? AF_TEXT.secondary : ""}`}>
                  {c.title}
                </span>
              ) : (
                <Link
                  href={c.href}
                  className="max-w-[10rem] truncate hover:text-zinc-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
                >
                  {c.title}
                </Link>
              )}
            </span>
          );
        })}
      </nav>
    </div>
  );
}

export function FragmentModeSwitch({
  deckId,
  fragmentId,
  mode,
}: {
  deckId: string;
  fragmentId: string;
  mode: FragmentEditorMode;
}) {
  const modes: { id: FragmentEditorMode; label: string }[] = [
    { id: "viewer", label: "Viewer" },
    { id: "classic", label: "Classic" },
    { id: "builder", label: "Builder" },
  ];
  return (
    <div
      role="group"
      aria-label="Fragment mode"
      className="flex rounded-lg border border-zinc-800 p-0.5 text-[11px]"
    >
      {modes.map((m) => {
        const active = mode === m.id;
        return (
          <Link
            key={m.id}
            href={fragmentModeHref(deckId, fragmentId, m.id)}
            aria-current={active ? "page" : undefined}
            className={`min-h-9 rounded-md px-2.5 font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${
              active ? "bg-zinc-800 text-zinc-100" : `${AF_TEXT.metadata} hover:text-zinc-200`
            }`}
          >
            {m.label}
          </Link>
        );
      })}
    </div>
  );
}
