"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { V2EntityLinkButton } from "@/app/argus/v2/components/V2CreateEntityButton";
import { V2OpenCaptureButton } from "@/app/argus/v2/components/V2OpenCaptureButton";
import { V2EntityNeighborhoodPanel } from "@/app/argus/v2/components/V2EntityNeighborhoodPanel";
import { V2OrgTimeline } from "@/app/argus/v2/components/V2OrgTimeline";
import type { V2EntityNeighborhoodGraph } from "@/lib/argus/v2/intelligence-viz";
import type {
  V2EvidenceStreamItem,
  V2EvidenceStreamKind,
} from "@/lib/argus/v2/evidence-stream";
import type { V2TopicDetail } from "@/lib/argus/v2/topic-browse-utils";
import { V2TopicAliasEditor } from "./V2TopicAliasEditor";
import { V2QuickDeliverButton } from "@/app/argus/v2/components/V2QuickDeliverModal";
import { V2EntityLifecycleActions } from "@/app/argus/v2/components/V2EntityLifecycleActions";
import { V2PrivateEvidenceGate } from "@/app/argus/v2/components/V2PrivateEvidenceGate";
import type { V2DeleteGateProps } from "@/lib/argus/v2/delete-gate-props";
import { V2TagPatternBadges } from "@/app/argus/v2/components/V2TagPatternBadges";
import { V2RecordRecentEntity } from "@/app/argus/v2/components/V2RecordRecentEntity";

type PanelTab = "evidence" | "timeline" | "connections" | "aliases";
type EvidenceFilter = "all" | V2EvidenceStreamKind;

const PANEL_TABS: { id: PanelTab; label: string }[] = [
  { id: "evidence", label: "Evidence" },
  { id: "timeline", label: "Timeline" },
  { id: "connections", label: "Connections" },
  { id: "aliases", label: "Aliases" },
];

const EVIDENCE_FILTERS: { id: EvidenceFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "email", label: "Email" },
  { id: "journal", label: "Journal" },
  { id: "file", label: "Files" },
  { id: "photo", label: "Photos" },
];

function EvidenceIcon({ kind }: { kind: V2EvidenceStreamKind }) {
  if (kind === "email") return <>✉</>;
  if (kind === "photo") return <>📷</>;
  if (kind === "file") return <>📎</>;
  return <>📓</>;
}

function MetricPill({ icon, label, count }: { icon: string; label: string; count: number }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg bg-zinc-900/50 px-2 py-2 ring-1 ring-zinc-800/70">
      <span className="text-[11px] leading-none" aria-hidden>
        {icon}
      </span>
      <span className="mt-1 text-[11px] font-semibold tabular-nums leading-none text-violet-300/90">
        {count}
      </span>
      <span className="mt-1 text-[8px] uppercase tracking-wide text-zinc-600">{label}</span>
    </div>
  );
}

export function V2TopicDetailPanel({
  selected,
  neighborhood,
  returnTo,
  privateConfigured = false,
  privateUnlocked = false,
  ...deleteGate
}: {
  selected: V2TopicDetail;
  neighborhood?: V2EntityNeighborhoodGraph | null;
  returnTo: string;
  privateConfigured?: boolean;
  privateUnlocked?: boolean;
} & V2DeleteGateProps) {
  const [panelTab, setPanelTab] = useState<PanelTab>("evidence");
  const [evidenceFilter, setEvidenceFilter] = useState<EvidenceFilter>("all");
  const [showGraph, setShowGraph] = useState(false);
  const privateLocked = selected.hasPrivateEvidence && !privateUnlocked;

  const filteredEvidence = useMemo(() => {
    if (evidenceFilter === "all") return selected.evidence;
    return selected.evidence.filter((item) => item.kind === evidenceFilter);
  }, [evidenceFilter, selected.evidence]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <V2RecordRecentEntity
        id={selected.id}
        kind="topic"
        label={selected.name}
        href={`/argus/v2/browse/topics?selected=${selected.id}`}
      />
      <div className="shrink-0 border-b border-zinc-800/80 p-5">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold text-zinc-50">{selected.name}</h2>
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] text-amber-300 ring-1 ring-amber-500/25">
                {selected.category}
              </span>
            </div>
            <p className="max-w-xl text-sm leading-relaxed text-zinc-400">{selected.description}</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <V2QuickDeliverButton
              scopeType="topic"
              scopeId={selected.id}
              scopeName={selected.name}
            />
            <V2EntityLifecycleActions
              entityId={selected.id}
              entityName={selected.name}
              entityKind="topic"
              lifecycleStatus={selected.lifecycleStatus}
              returnTo={returnTo}
              hasPrivateEvidence={selected.hasPrivateEvidence}
              privateConfigured={privateConfigured}
              privateUnlocked={privateUnlocked}
              showDelete
              variant="menu"
              {...deleteGate}
            />
            <V2EntityLinkButton
              entityId={selected.id}
              linkedIds={selected.linkedEntityIds}
              className="rounded-lg border border-violet-500/40 bg-violet-600/15 px-3 py-1.5 text-xs font-semibold text-violet-300 hover:bg-violet-600/25"
            />
          </div>
        </div>

        {selected.tagPatterns.length > 0 ? (
          <V2TagPatternBadges
            patterns={selected.tagPatterns}
            className="mb-3"
            tagHref={(tag) =>
              `/argus/v2/browse/topics?tag=${encodeURIComponent(tag)}&selected=${selected.id}`
            }
          />
        ) : null}

        {privateLocked ? (
          <p className="mb-3 rounded-lg border border-amber-500/25 bg-amber-950/20 px-3 py-2 text-xs text-amber-200/90">
            Protected evidence on this topic — unlock with PIN to view counts and linked data.
          </p>
        ) : (
        <div className="mb-3 inline-grid grid-cols-3 gap-1.5 sm:grid-cols-6">
          <MetricPill icon="📓" label="Journal" count={selected.journalCount} />
          <MetricPill icon="✉" label="Email" count={selected.emailCount} />
          <MetricPill icon="📎" label="Files" count={selected.fileCount} />
          <MetricPill icon="🏢" label="Orgs" count={selected.orgCount} />
          <MetricPill icon="📁" label="Projects" count={selected.projectCount} />
          <MetricPill icon="👤" label="People" count={selected.peopleCount} />
        </div>
        )}

        <div className="flex gap-1 border-b border-zinc-800/80">
          {PANEL_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setPanelTab(t.id)}
              className={`border-b-2 px-3 py-2 text-xs font-medium ${
                panelTab === t.id
                  ? "border-violet-500 text-violet-300"
                  : "border-transparent text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="argus-v2-scroll min-h-0 flex-1 overflow-y-auto p-5">
        <V2PrivateEvidenceGate
          locked={privateLocked}
          privateConfigured={privateConfigured}
          returnTo={returnTo}
        >
        {panelTab === "evidence" ? (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1">
              {EVIDENCE_FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setEvidenceFilter(f.id)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-medium ${
                    evidenceFilter === f.id
                      ? "bg-violet-500/15 text-violet-300"
                      : "text-zinc-600 hover:text-zinc-400"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-zinc-500">
              Chronological evidence linked to this topic — emails, journal entries, and files.
            </p>
            {filteredEvidence.length === 0 ? (
              <p className="text-sm text-zinc-500">No evidence yet. Link emails from inbox or register evidence.</p>
            ) : (
              <ul className="space-y-2">
                {filteredEvidence.map((item) => (
                  <EvidenceRow key={item.id} item={item} />
                ))}
              </ul>
            )}
          </div>
        ) : null}

        {panelTab === "timeline" ? (
          <div>
            <p className="mb-4 text-xs text-zinc-500">Activity over time — journal and inbox evidence on this topic.</p>
            <V2OrgTimeline entries={selected.timeline} />
          </div>
        ) : null}

        {panelTab === "connections" ? (
          <div className="space-y-4">
            {selected.linkedEntities.length > 0 ? (
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-600">Linked entities</h3>
                <ul className="flex flex-wrap gap-2">
                  {selected.linkedEntities.map((entity) => (
                    <li key={entity.id}>
                      <Link
                        href={entity.href}
                        className="inline-flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-xs text-zinc-300 hover:border-violet-500/40 hover:text-violet-200"
                      >
                        <span aria-hidden>{entity.icon}</span>
                        {entity.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-zinc-500">No linked organizations, projects, or people yet.</p>
            )}

            {neighborhood ? (
              <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="text-xs text-zinc-500">Local graph — 1–2 hops from co-mentions and explicit links.</p>
                  <button
                    type="button"
                    onClick={() => setShowGraph((v) => !v)}
                    className="rounded-lg border border-zinc-700 px-2.5 py-1 text-[11px] text-zinc-400 hover:text-zinc-200"
                  >
                    {showGraph ? "Hide graph" : "Show graph"}
                  </button>
                </div>
                {showGraph ? (
                  <V2EntityNeighborhoodPanel graph={neighborhood} entityName={selected.name} />
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {panelTab === "aliases" ? (
          <V2TopicAliasEditor
            topicId={selected.id}
            topicName={selected.name}
            initialAliases={selected.aliases}
            returnTo={returnTo}
          />
        ) : null}

        <div className="mt-8 flex flex-wrap gap-3 border-t border-zinc-800/80 pt-6">
          <V2OpenCaptureButton
            entityIds={[selected.id]}
            className="inline-flex rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-500"
          >
            + Register evidence
          </V2OpenCaptureButton>
        </div>
        </V2PrivateEvidenceGate>
      </div>
    </div>
  );
}

function EvidenceRow({ item }: { item: V2EvidenceStreamItem }) {
  const external = item.kind === "photo" || item.kind === "file";
  return (
    <li>
      <Link
        href={item.href}
        target={external ? "_blank" : undefined}
        rel={external ? "noreferrer" : undefined}
        className="flex items-start gap-3 rounded-xl border border-zinc-800/80 px-3 py-3 transition hover:border-zinc-700"
      >
        <span className="mt-0.5 text-sm text-zinc-500">
          <EvidenceIcon kind={item.kind} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-zinc-200">{item.title}</span>
          <span className="mt-0.5 block text-xs text-zinc-600">{item.meta}</span>
        </span>
      </Link>
    </li>
  );
}
