"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import type { Entity } from "@/lib/argus/types";
import type { EntityPickerBuckets } from "@/app/argus/components/ReferencePickerModal";
import { updateRelationshipMetricsAction } from "@/app/argus/actions";
import { useArgusAdd } from "@/app/argus/components/ArgusAddProvider";
import { EntityEditForm } from "@/app/argus/components/EntityEditForm";
import { formatDate } from "@/app/argus/components/ui";
import {
  CONTACT_VALUE_ICONS,
  CONTACT_VALUE_OPTIONS,
  MY_VALUE_ICONS,
  MY_VALUE_OPTIONS,
  RELATIONSHIP_REASON_OPTIONS,
  RELATIONSHIP_STATUS_OPTIONS,
  attentionSummaryMessage,
  countOfFive,
  relationshipReasonLabel,
  relationshipStatusLabel,
  type DerivedRelationshipAttention,
} from "@/lib/argus/network-relationship-metrics";
import type {
  NetworkContactPageData,
  NetworkContactRelatedOrg,
  NetworkContactTimelineItem,
} from "@/lib/argus/v2/network-contact-loaders";
import { initialsFromName } from "@/lib/argus/v2/network-contact-loaders";
import { personHasContactEvidence, networkConversationNoteTemplate } from "@/lib/argus/network-dialogue";
import { V2Badge, V2Card } from "@/app/argus/v2/components/v2-ui";
import { V2RecordRecentEntity } from "@/app/argus/v2/components/V2RecordRecentEntity";
import { NetworkDialogueGuide } from "./NetworkDialogueGuide";

const TABS = ["Overview", "Timeline", "Projects", "Organizations", "Topics", "Tags"] as const;
type ContactTab = (typeof TABS)[number];

const TIMELINE_FILTERS = ["All", "Records", "Email", "Project", "Event"] as const;

function ValueCheckboxList({
  title,
  options,
  icons,
  fieldName,
  selected,
  footerLabel,
  footerTone,
}: {
  title: string;
  options: Array<{ key: string; label: string; description: string }>;
  icons: Record<string, string>;
  fieldName: "contactValue" | "myValue";
  selected: string[];
  footerLabel: string;
  footerTone: "blue" | "green";
}) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-zinc-800/80 bg-zinc-900/50">
      <div className="border-b border-zinc-800/80 px-4 py-3">
        <h3 className="text-sm font-semibold text-zinc-100">{title}</h3>
      </div>
      <div className="flex-1 space-y-1 p-3">
        {options.map((option) => (
          <label
            key={option.key}
            className="flex cursor-pointer items-start gap-3 rounded-xl px-2 py-2.5 transition hover:bg-zinc-800/40"
          >
            <input
              type="checkbox"
              name={fieldName}
              value={option.key}
              defaultChecked={selected.includes(option.key)}
              className="mt-1 rounded border-zinc-600 bg-zinc-900"
            />
            <span className="text-lg leading-none">{icons[option.key]}</span>
            <span className="min-w-0">
              <span className="block text-sm font-medium text-zinc-100">{option.label}</span>
              <span className="block text-[11px] leading-snug text-zinc-500">{option.description}</span>
            </span>
          </label>
        ))}
      </div>
      <div
        className={`border-t px-4 py-3 text-sm font-semibold ${
          footerTone === "blue" ? "border-sky-500/20 bg-sky-500/10 text-sky-200" : "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
        }`}
      >
        {footerLabel}: {countOfFive(selected)}
      </div>
    </div>
  );
}

function AttentionPanel({ attention }: { attention: DerivedRelationshipAttention }) {
  const statusOption = RELATIONSHIP_STATUS_OPTIONS.find((option) => option.key === attention.status);
  const reasonOption = RELATIONSHIP_REASON_OPTIONS.find((option) => option.key === attention.reason);

  return (
    <div className="flex h-full flex-col rounded-2xl border border-zinc-800/80 bg-zinc-900/50">
      <div className="border-b border-zinc-800/80 px-4 py-3">
        <h3 className="text-sm font-semibold text-zinc-100">Attention</h3>
      </div>
      <div className="space-y-4 p-4">
        <div>
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-zinc-500">Relationship status</p>
          <div className="flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-950/80 px-3 py-2.5 text-sm text-zinc-200">
            <span>{attention.status === "healthy" ? "💚" : attention.status === "needs_attention" ? "⚠️" : "💤"}</span>
            <span>{statusOption?.label ?? relationshipStatusLabel(attention.status)}</span>
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-zinc-500">Reason</p>
          <div className="flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-950/80 px-3 py-2.5 text-sm text-zinc-200">
            <span>✓</span>
            <span>{reasonOption?.label ?? relationshipReasonLabel(attention.reason)}</span>
          </div>
        </div>
        <div className="rounded-xl border border-sky-500/20 bg-sky-500/10 px-3 py-3 text-[12px] leading-relaxed text-sky-100/90">
          {attentionSummaryMessage(attention)}
        </div>
      </div>
    </div>
  );
}

function ContactAside({
  page,
}: {
  page: Pick<
    NetworkContactPageData,
    "entity" | "organization" | "location" | "email" | "linkedIn" | "role" | "industry" | "tags" | "relatedOrganizations"
  >;
}) {
  return (
    <div className="space-y-4">
      <V2Card className="p-4">
        <h3 className="mb-3 text-sm font-semibold text-zinc-100">About</h3>
        <dl className="space-y-2.5 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-zinc-500">Company</dt>
            <dd className="text-right text-zinc-200">{page.organization?.name ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-zinc-500">Role</dt>
            <dd className="text-right text-zinc-200">{page.role}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-zinc-500">Location</dt>
            <dd className="text-right text-zinc-200">{page.location ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-zinc-500">Industry</dt>
            <dd className="text-right text-zinc-200">{page.industry ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-zinc-500">Date added</dt>
            <dd className="text-right text-zinc-200">{formatDate(page.entity.createdAt)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-zinc-500">By</dt>
            <dd className="text-right text-zinc-200">You</dd>
          </div>
        </dl>
      </V2Card>

      <V2Card className="p-4">
        <h3 className="mb-3 text-sm font-semibold text-zinc-100">Tags</h3>
        {page.tags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {page.tags.map((tag, index) => (
              <V2Badge key={tag} tone={index % 3 === 0 ? "blue" : index % 3 === 1 ? "green" : "purple"}>
                {tag}
              </V2Badge>
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-600">No tags yet.</p>
        )}
      </V2Card>

      <V2Card className="p-4">
        <h3 className="mb-3 text-sm font-semibold text-zinc-100">Related organizations</h3>
        {page.relatedOrganizations.length > 0 ? (
          <ul className="space-y-2">
            {page.relatedOrganizations.map((org) => (
              <li key={org.id}>
                <a href={org.href} className="flex items-center justify-between gap-2 text-sm text-zinc-300 hover:text-violet-300">
                  <span>{org.name}</span>
                  <span className="text-[11px] text-zinc-600">{org.relation}</span>
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-zinc-600">No linked organizations.</p>
        )}
      </V2Card>
    </div>
  );
}

function TagsSection({
  page,
}: {
  page: Pick<NetworkContactPageData, "tags" | "relatedTopics" | "entity" | "intel">;
}) {
  const manualTags = (page.entity.linkedTags ?? []).map((tag) => tag.trim()).filter(Boolean);
  const evidenceTags = [...new Set(page.intel.topics.map((tag) => tag.trim()).filter(Boolean))];

  return (
    <V2Card className="p-4">
      <h3 className="mb-1 text-sm font-semibold text-zinc-100">Associated tags</h3>
      <p className="mb-4 text-[11px] text-zinc-600">Labels and topics tied to this contact through links and evidence.</p>

      {page.tags.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {page.tags.map((tag, index) => (
            <V2Badge key={tag} tone={index % 3 === 0 ? "blue" : index % 3 === 1 ? "green" : "purple"}>
              {tag}
            </V2Badge>
          ))}
        </div>
      ) : (
        <p className="text-sm text-zinc-600">No tags yet. Link topics or add labels on the contact to build context.</p>
      )}

      {manualTags.length > 0 ? (
        <div className="mt-5">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-zinc-500">Manual labels</p>
          <div className="flex flex-wrap gap-2">
            {manualTags.map((tag) => (
              <V2Badge key={`manual-${tag}`} tone="blue">
                {tag}
              </V2Badge>
            ))}
          </div>
        </div>
      ) : null}

      {evidenceTags.length > 0 ? (
        <div className="mt-5">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-zinc-500">From evidence</p>
          <div className="flex flex-wrap gap-2">
            {evidenceTags.map((tag) => (
              <V2Badge key={`evidence-${tag}`} tone="purple">
                {tag}
              </V2Badge>
            ))}
          </div>
        </div>
      ) : null}

      {page.relatedTopics.length > 0 ? (
        <div className="mt-5">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-zinc-500">Linked topics</p>
          <ul className="space-y-2">
            {page.relatedTopics.map((topic) => (
              <li key={topic.id}>
                <a href={topic.href} className="text-sm text-violet-400 hover:text-violet-300">
                  {topic.name}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </V2Card>
  );
}

function TimelineSection({ items }: { items: NetworkContactTimelineItem[] }) {
  const [filter, setFilter] = useState<(typeof TIMELINE_FILTERS)[number]>("All");
  const filtered = useMemo(() => {
    if (filter === "All") return items;
    if (filter === "Records") return items.filter((item) => item.kind === "journal");
    if (filter === "Email") return items.filter((item) => item.kind === "email");
    return items;
  }, [items, filter]);

  return (
    <V2Card className="p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-zinc-100">Timeline</h3>
        <div className="flex flex-wrap gap-1.5">
          {TIMELINE_FILTERS.map((entry) => (
            <button
              key={entry}
              type="button"
              onClick={() => setFilter(entry)}
              className={`rounded-full px-2.5 py-1 text-[11px] ${
                filter === entry ? "bg-violet-500/15 text-violet-300" : "bg-zinc-800 text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {entry}
            </button>
          ))}
        </div>
      </div>
      {filtered.length === 0 ? (
        <p className="text-sm text-zinc-600">No timeline items yet.</p>
      ) : (
        <ul className="space-y-3">
          {filtered.slice(0, 12).map((item) => (
            <li key={`${item.kind}-${item.id}`}>
              <a href={item.href} className="block rounded-xl border border-zinc-800/80 px-4 py-3 transition hover:border-zinc-700 hover:bg-zinc-900/60">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="mb-1 flex items-center gap-2">
                      <V2Badge tone={item.kind === "journal" ? "purple" : "blue"}>{item.kind === "journal" ? "Record" : "Email"}</V2Badge>
                      <span className="text-[11px] text-zinc-600">{formatDate(item.date)}</span>
                    </div>
                    <p className="font-medium text-zinc-100">{item.title}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-zinc-500">{item.preview}</p>
                  </div>
                  <span className="text-zinc-600">›</span>
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}
    </V2Card>
  );
}

export function NetworkContactShell({
  page,
  buckets,
}: {
  page: NetworkContactPageData;
  buckets: EntityPickerBuckets;
}) {
  const router = useRouter();
  const { openCapture } = useArgusAdd();
  const [tab, setTab] = useState<ContactTab>("Overview");
  const [showEdit, setShowEdit] = useState(false);
  const [isPending, startTransition] = useTransition();
  const entity = page.entity;
  const contactValue = entity.contactValue ?? [];
  const myValue = entity.myValue ?? [];
  const hasContact = personHasContactEvidence(page.timeline.length);

  function saveMetrics(formData: FormData) {
    startTransition(async () => {
      await updateRelationshipMetricsAction(formData);
      router.refresh();
    });
  }

  return (
    <div className="v2-page-shell flex h-full min-h-0 flex-col overflow-hidden">
      <V2RecordRecentEntity
        id={entity.id}
        kind="contact"
        label={entity.name}
        href={`/argus/v2/network/${entity.id}`}
      />
      <div className="argus-v2-scroll min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
        <div className="network-contact-shell px-4 py-6 lg:px-8">
      <div className="mb-4 text-xs text-zinc-600">
        <a href="/argus/v2/browse/network" className="hover:text-zinc-400">
          Network
        </a>
        <span className="mx-2">›</span>
        <span className="text-zinc-400">People</span>
        <span className="mx-2">›</span>
        <span className="text-zinc-300">{entity.name}</span>
      </div>

      <header className="mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 flex-1 gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600/40 to-zinc-700 text-lg font-bold text-violet-100">
              {initialsFromName(entity.name)}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-zinc-50">{entity.name}</h1>
                <span className="text-amber-400">★</span>
              </div>
              <p className="mt-1 text-sm text-zinc-400">{page.role}</p>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-500">
                {page.organization ? <span>{page.organization.name}</span> : null}
                {page.location ? <span>📍 {page.location}</span> : null}
              </div>
              <div className="mt-2 flex flex-wrap gap-3 text-xs">
                {page.email ? (
                  <a href={`mailto:${page.email}`} className="text-sky-400 hover:text-sky-300">
                    ✉ {page.email}
                  </a>
                ) : null}
                {page.linkedIn ? (
                  <a href={page.linkedIn} target="_blank" rel="noreferrer" className="text-sky-400 hover:text-sky-300">
                    in LinkedIn
                  </a>
                ) : null}
              </div>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => setShowEdit((value) => !value)}
              className="rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => openCapture({ entityIds: [entity.id] })}
              className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500"
            >
              + Register
            </button>
            <a
              href={`/argus/v2/deliver?scopeType=person&scopeId=${entity.id}`}
              className="rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
            >
              Export
            </a>
          </div>
        </div>
      </header>

      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-zinc-800/80 pb-px">
        {TABS.map((entry) => (
          <button
            key={entry}
            type="button"
            onClick={() => setTab(entry)}
            className={`shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium transition ${
              tab === entry
                ? "border-violet-500 text-violet-300"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {entry}
          </button>
        ))}
      </div>

      {showEdit ? (
        <div className="mb-6">
          <EntityEditForm entity={entity} allBuckets={buckets} />
        </div>
      ) : null}

      {tab === "Overview" ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-6">
            {hasContact ? (
              <section>
                <h2 className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">
                  Relationship overview
                </h2>
                <p className="mb-4 text-[11px] text-zinc-600">Unlocked after first contact — value exchange over time.</p>
                <form action={saveMetrics}>
                  <input type="hidden" name="entityId" value={entity.id} />
                  <div className="grid gap-4 lg:grid-cols-3">
                    <ValueCheckboxList
                      title="Contact Value"
                      options={CONTACT_VALUE_OPTIONS}
                      icons={CONTACT_VALUE_ICONS}
                      fieldName="contactValue"
                      selected={contactValue}
                      footerLabel="Strategic Value"
                      footerTone="blue"
                    />
                    <ValueCheckboxList
                      title="My Value"
                      options={MY_VALUE_OPTIONS}
                      icons={MY_VALUE_ICONS}
                      fieldName="myValue"
                      selected={myValue}
                      footerLabel="My Value"
                      footerTone="green"
                    />
                    <AttentionPanel attention={page.attention} />
                  </div>
                  <div className="mt-4 flex justify-end">
                    <button
                      type="submit"
                      disabled={isPending}
                      className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
                    >
                      {isPending ? "Saving…" : "Save relationship outcomes"}
                    </button>
                  </div>
                </form>
              </section>
            ) : (
              <NetworkDialogueGuide
                entityName={entity.name}
                email={page.email}
                linkedIn={page.linkedIn}
                onRegister={() => openCapture({ entityIds: [entity.id] })}
                onRegisterWithTemplate={() =>
                  openCapture({
                    entityIds: [entity.id],
                    body: networkConversationNoteTemplate(entity.name),
                  })
                }
              />
            )}
            <TimelineSection items={page.timeline} />
          </div>
          <ContactAside page={page} />
        </div>
      ) : null}

      {tab === "Timeline" ? <TimelineSection items={page.timeline} /> : null}

      {tab === "Projects" ? (
        <V2Card className="p-4">
          <h3 className="mb-3 text-sm font-semibold text-zinc-100">Projects</h3>
          <ul className="space-y-2">
            {page.relatedProjects.map((project) => (
              <li key={project.id}>
                <a href={project.href} className="text-sm text-violet-400 hover:text-violet-300">
                  {project.name}
                </a>
              </li>
            ))}
            {page.relatedProjects.length === 0 ? <li className="text-sm text-zinc-600">No linked projects.</li> : null}
          </ul>
        </V2Card>
      ) : null}

      {tab === "Organizations" ? (
        <V2Card className="p-4">
          <h3 className="mb-3 text-sm font-semibold text-zinc-100">Organizations</h3>
          <ul className="space-y-2">
            {page.relatedOrganizations.map((org: NetworkContactRelatedOrg) => (
              <li key={org.id}>
                <a href={org.href} className="text-sm text-violet-400 hover:text-violet-300">
                  {org.name} <span className="text-zinc-600">({org.relation})</span>
                </a>
              </li>
            ))}
          </ul>
        </V2Card>
      ) : null}

      {tab === "Topics" ? (
        <V2Card className="p-4">
          <h3 className="mb-3 text-sm font-semibold text-zinc-100">Topics</h3>
          <ul className="space-y-2">
            {page.relatedTopics.map((topic) => (
              <li key={topic.id}>
                <a href={topic.href} className="text-sm text-violet-400 hover:text-violet-300">
                  {topic.name}
                </a>
              </li>
            ))}
            {page.relatedTopics.length === 0 ? <li className="text-sm text-zinc-600">No linked topics.</li> : null}
          </ul>
        </V2Card>
      ) : null}

      {tab === "Tags" ? <TagsSection page={page} /> : null}
        </div>
      </div>
    </div>
  );
}
