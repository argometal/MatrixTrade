"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { V2EntityCreateButton, V2EntityLinkButton } from "./V2CreateEntityButton";
import { V2Badge, V2Card } from "./v2-ui";
import { V2TagPatternBadges } from "./V2TagPatternBadges";
import type { TagPattern } from "@/lib/argus/v2/tag-patterns";

type LinkPerson = { id: string; name: string; subtitle?: string; href: string };
type LinkProject = { id: string; name: string; href: string; meta?: string };
/** Structural Topic/Event binders — never evidence tag strings. */
type LinkBinder = { id: string; name: string; href: string };

export function V2EntityLinksTab({
  entityId,
  linkedIds,
  people,
  projects,
  organizations,
  topics,
  events,
  tagPatterns,
  manualTags,
  tagHref,
  signalTags,
}: {
  entityId: string;
  linkedIds: string[];
  people: LinkPerson[];
  projects?: LinkProject[];
  organizations?: LinkProject[];
  topics: LinkBinder[];
  events: LinkBinder[];
  tagPatterns: TagPattern[];
  manualTags: string[];
  tagHref?: (tag: string) => string;
  signalTags?: string[];
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <V2EntityLinkButton
          entityId={entityId}
          linkedIds={linkedIds}
          className="rounded-xl border border-violet-500/40 bg-violet-600/15 px-4 py-2 text-sm font-semibold text-violet-300 hover:bg-violet-600/25"
        />
        <V2EntityCreateButton className="rounded-xl border border-zinc-700 bg-zinc-900/60 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-800" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <LinksColumn title="People">
          {people.length === 0 ? (
            <EmptyLinks />
          ) : (
            <ul className="space-y-2">
              {people.map((person) => (
                <li key={person.id}>
                  <Link href={person.href} className="text-sm text-violet-400 hover:text-violet-300">
                    {person.name}
                    {person.subtitle ? <span className="text-zinc-600"> · {person.subtitle}</span> : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </LinksColumn>

        {organizations ? (
          <LinksColumn title="Organizations">
            {organizations.length === 0 ? (
              <EmptyLinks />
            ) : (
              <ul className="space-y-2">
                {organizations.map((org) => (
                  <li key={org.id}>
                    <Link href={org.href} className="text-sm text-violet-400 hover:text-violet-300">
                      {org.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </LinksColumn>
        ) : null}

        {projects ? (
          <LinksColumn title="Projects">
            {projects.length === 0 ? (
              <EmptyLinks />
            ) : (
              <ul className="space-y-2">
                {projects.map((project) => (
                  <li key={project.id}>
                    <Link href={project.href} className="text-sm text-violet-400 hover:text-violet-300">
                      {project.name}
                      {project.meta ? <span className="text-zinc-600"> · {project.meta}</span> : null}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </LinksColumn>
        ) : null}

        <LinksColumn title="Topics">
          {topics.length === 0 ? (
            <EmptyLinks />
          ) : (
            <div className="flex flex-wrap gap-2">
              {topics.map((topic) => (
                <Link
                  key={topic.id}
                  href={topic.href}
                  className="inline-flex"
                >
                  <V2Badge tone="purple">{topic.name}</V2Badge>
                </Link>
              ))}
            </div>
          )}
        </LinksColumn>

        <LinksColumn title="Events">
          {events.length === 0 ? (
            <EmptyLinks />
          ) : (
            <div className="flex flex-wrap gap-2">
              {events.map((event) => (
                <Link
                  key={event.id}
                  href={event.href}
                  className="inline-flex rounded-full border border-rose-500/30 bg-rose-950/30 px-3 py-1.5 text-xs text-rose-100 hover:border-rose-400/50"
                >
                  <span aria-hidden className="mr-1">
                    📅
                  </span>
                  {event.name}
                </Link>
              ))}
            </div>
          )}
        </LinksColumn>

        <V2Card className="p-4 lg:col-span-2 xl:col-span-3">
          <h3 className="mb-4 text-sm font-semibold text-zinc-100">Tags</h3>
          {tagPatterns.length > 0 ? (
            <V2TagPatternBadges
              patterns={tagPatterns}
              signalTags={signalTags}
              className="mb-4"
              tagHref={tagHref}
            />
          ) : null}
          {manualTags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {manualTags.map((tag, index) => (
                <V2Badge key={tag} tone={index % 3 === 0 ? "blue" : index % 3 === 1 ? "green" : "purple"}>
                  {tag}
                </V2Badge>
              ))}
            </div>
          ) : tagPatterns.length === 0 ? (
            <p className="text-sm text-zinc-600">No tags yet. Add labels on evidence or the record.</p>
          ) : null}
        </V2Card>
      </div>
    </div>
  );
}

function LinksColumn({ title, children }: { title: string; children: ReactNode }) {
  return (
    <V2Card className="p-4">
      <h3 className="mb-3 text-sm font-semibold text-zinc-100">{title}</h3>
      {children}
    </V2Card>
  );
}

function EmptyLinks() {
  return <p className="text-sm text-zinc-600">None linked yet.</p>;
}
