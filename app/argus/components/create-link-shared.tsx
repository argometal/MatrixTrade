import type { Entity } from "@/lib/argus/types";
import type { CreateItemKind, JournalLinkRow, LinkFilterKind } from "@/lib/argus/create-flow-types";
import { entityLinkCardMeta, entityLinkFilterKind } from "@/lib/argus/create-flow-helpers";

export const LINK_TABS: LinkFilterKind[] = [
  "all",
  "person",
  "organization",
  "project",
  "event",
  "topic",
  "document",
  "journal",
];

export const TAB_ICONS: Record<LinkFilterKind, string> = {
  all: "◉",
  person: "👤",
  organization: "🏢",
  project: "📁",
  event: "📅",
  topic: "🏷",
  document: "📄",
  journal: "▤",
};

export const ITEM_STYLES: Record<
  CreateItemKind,
  { glyph: string; ring: string; bg: string; text: string }
> = {
  journal: { glyph: "▤", ring: "ring-violet-500/40", bg: "bg-violet-500/15", text: "text-violet-200" },
  person: { glyph: "👤", ring: "ring-emerald-500/40", bg: "bg-emerald-500/15", text: "text-emerald-200" },
  organization: { glyph: "🏢", ring: "ring-sky-500/40", bg: "bg-sky-500/15", text: "text-sky-200" },
  project: { glyph: "📁", ring: "ring-amber-500/40", bg: "bg-amber-500/15", text: "text-amber-200" },
  event: { glyph: "📅", ring: "ring-rose-500/40", bg: "bg-rose-500/15", text: "text-rose-200" },
  topic: { glyph: "🏷", ring: "ring-yellow-500/40", bg: "bg-yellow-500/15", text: "text-yellow-100" },
  document: { glyph: "📄", ring: "ring-zinc-500/40", bg: "bg-zinc-500/15", text: "text-zinc-200" },
};

export const KIND_BADGE: Record<string, string> = {
  person: "bg-emerald-500/20 text-emerald-300",
  organization: "bg-sky-500/20 text-sky-300",
  project: "bg-amber-500/20 text-amber-300",
  event: "bg-rose-500/20 text-rose-300",
  topic: "bg-yellow-500/20 text-yellow-200",
  document: "bg-teal-500/20 text-teal-300",
  journal: "bg-violet-500/20 text-violet-300",
};

export function InboxEvidenceBanner({
  title,
  preview,
}: {
  title: string;
  preview?: string;
}) {
  return (
    <div className="shrink-0 border-b border-violet-500/20 bg-violet-950/30 px-4 py-3 lg:px-6">
      <p className="text-[10px] font-bold uppercase tracking-wider text-violet-400">Email evidence</p>
      <p className="mt-1 truncate text-sm font-semibold text-zinc-100">{title || "(No subject)"}</p>
      {preview ? <p className="mt-1 line-clamp-2 text-xs text-zinc-500">{preview}</p> : null}
      <p className="mt-2 text-[11px] leading-snug text-zinc-600">
        Email stays in Inbox — links appear on every record timeline.
      </p>
    </div>
  );
}

export function KindIcon({
  kind,
  className = "",
}: {
  kind: CreateItemKind | LinkFilterKind;
  className?: string;
}) {
  const style =
    kind in ITEM_STYLES
      ? ITEM_STYLES[kind as CreateItemKind]
      : { glyph: TAB_ICONS[kind as LinkFilterKind] ?? "•", bg: "bg-zinc-800", text: "text-zinc-300", ring: "" };
  return (
    <span
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm ${style.bg} ${style.text} ${className}`}
    >
      {style.glyph}
    </span>
  );
}

export function KindBadge({ kind }: { kind: string }) {
  const label =
    kind === "organization"
      ? "Organization"
      : kind === "journal"
        ? "Journal"
        : kind.charAt(0).toUpperCase() + kind.slice(1);
  return (
    <span
      className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold ${KIND_BADGE[kind] ?? KIND_BADGE.document}`}
    >
      {label}
    </span>
  );
}

export function StepBadge({ n, active }: { n: number; active?: boolean }) {
  return (
    <span
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
        active ? "bg-violet-600 text-white" : "bg-zinc-800 text-zinc-500"
      }`}
    >
      {n}
    </span>
  );
}

export function MobileProgressBar({ step }: { step: 1 | 2 | 3 | 4 }) {
  return (
    <div className="flex items-center justify-center gap-2 px-4 py-3">
      {([1, 2, 3, 4] as const).map((n) => (
        <span key={n} className="flex items-center gap-2">
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
              n === step
                ? "bg-violet-600 text-white ring-2 ring-violet-400/50"
                : n < step
                  ? "bg-violet-600/30 text-violet-300"
                  : "bg-zinc-800 text-zinc-600"
            }`}
          >
            {n}
          </span>
          {n < 4 ? <span className="h-px w-6 bg-zinc-800" /> : null}
        </span>
      ))}
    </div>
  );
}

export function LinkedEntityRow({
  entity,
  allEntities,
  onRemove,
  compact,
}: {
  entity: Entity;
  allEntities: Entity[];
  onRemove: () => void;
  compact?: boolean;
}) {
  const kind = entityLinkFilterKind(entity) ?? "person";
  const { subtitle } = entityLinkCardMeta(entity, allEntities);
  return (
    <div
      className={`flex items-center gap-2 rounded-xl border border-zinc-800/80 bg-zinc-900/50 ${
        compact ? "px-3 py-2" : "px-3 py-2.5"
      }`}
    >
      <KindIcon
        kind={kind === "journal" || kind === "all" ? "person" : (kind as CreateItemKind)}
        className="!h-8 !w-8 !text-xs"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-zinc-100">{entity.name}</p>
        {!compact ? <p className="truncate text-[11px] text-zinc-500">{subtitle}</p> : null}
      </div>
      <KindBadge kind={kind} />
      <button
        type="button"
        onClick={onRemove}
        className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
        aria-label={`Remove ${entity.name}`}
      >
        ✕
      </button>
    </div>
  );
}

export function LinkedJournalRow({
  row,
  onRemove,
  compact,
}: {
  row: JournalLinkRow;
  onRemove: () => void;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-xl border border-zinc-800/80 bg-zinc-900/50 ${
        compact ? "px-3 py-2" : "px-3 py-2.5"
      }`}
    >
      <KindIcon kind="journal" className="!h-8 !w-8 !text-xs" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-zinc-100">{row.title}</p>
        {!compact ? (
          <p className="truncate text-[11px] text-zinc-500">
            {row.date} · {row.kind}
          </p>
        ) : null}
      </div>
      <KindBadge kind="journal" />
      <button
        type="button"
        onClick={onRemove}
        className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
        aria-label={`Remove ${row.title}`}
      >
        ✕
      </button>
    </div>
  );
}
