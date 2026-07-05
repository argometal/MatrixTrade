"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { createEntityInlineAction } from "@/app/argus/actions";
import { useArgusAdd } from "@/app/argus/components/ArgusAddProvider";
import {
  createInputToReferenceKind,
  entityNotesForDisplay,
  REFERENCE_KINDS,
  REFERENCE_KIND_LABELS,
  type ReferenceKind,
} from "@/lib/argus/reference-types";
import type { EntityType } from "@/lib/argus/types";
import { formatArgusError } from "@/lib/argus/persistence/errors";
import { ADD_MENU, ENTITY_CREATE } from "@/lib/argus/ux-copy";
import { ReferenceCreateModal } from "./ReferenceCreateModal";

type MenuPlacement = "up" | "down";
type MenuAlign = "start" | "center" | "end";

type AddMenuIcon = {
  glyph: string;
  boxClass: string;
};

const ADD_MENU_ICONS: Record<"journal" | ReferenceKind, AddMenuIcon> = {
  journal: { glyph: "▤", boxClass: "bg-violet-500/20 text-violet-300" },
  person: { glyph: "👤", boxClass: "bg-emerald-500/20 text-emerald-300" },
  organization: { glyph: "🏢", boxClass: "bg-amber-500/20 text-amber-300" },
  project: { glyph: "📁", boxClass: "bg-sky-500/20 text-sky-300" },
  topic: { glyph: "🏷", boxClass: "bg-yellow-500/20 text-yellow-200" },
  event: { glyph: "📅", boxClass: "bg-rose-500/20 text-rose-300" },
};

function postCreateHref(pathname: string, kind: ReferenceKind, entityId: string, fallbackHref: string): string {
  if (!pathname.startsWith("/argus/v2")) return fallbackHref;
  switch (kind) {
    case "organization":
      return `/argus/v2/organizations/${entityId}`;
    case "project":
      return `/argus/v2/projects/${entityId}`;
    case "topic":
      return `/argus/v2/browse/topics?selected=${entityId}`;
    case "event":
      return `/argus/v2/browse/events?selected=${entityId}`;
    default:
      return `/argus/network/${entityId}`;
  }
}

function useArgusAddMenuControls() {
  const router = useRouter();
  const pathname = usePathname();
  const { openCapture } = useArgusAdd();
  const [menuOpen, setMenuOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createKind, setCreateKind] = useState<ReferenceKind>("person");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function openCreate(kind: ReferenceKind) {
    setMenuOpen(false);
    setSaveError(null);
    setCreateKind(kind);
    setCreateOpen(true);
  }

  function openCaptureNote() {
    setMenuOpen(false);
    openCapture({ entryType: "note" });
  }

  function handleSave(data: { name: string; entityType: EntityType; notes: string }) {
    const kind = createInputToReferenceKind(data.entityType, data.notes);
    setSaveError(null);
    startTransition(async () => {
      try {
        const entity = await createEntityInlineAction(
          kind,
          data.name,
          entityNotesForDisplay(data.notes)
        );
        setCreateOpen(false);
        if (kind === "event") {
          openCapture({ entityIds: [entity.id], entryType: "note" });
        }
        router.push(postCreateHref(pathname, kind, entity.id, entity.href));
        router.refresh();
      } catch (err) {
        const { layer, message } = formatArgusError(err);
        setSaveError(`${layer.toUpperCase()}: ${message}`);
      }
    });
  }

  return {
    menuOpen,
    setMenuOpen,
    createOpen,
    setCreateOpen,
    createKind,
    saveError,
    setSaveError,
    isPending,
    openCreate,
    openCaptureNote,
    handleSave,
  };
}

function ArgusAddMenuPanel({
  open,
  align,
  placement,
  onJournal,
  onCreate,
}: {
  open: boolean;
  align: MenuAlign;
  placement: MenuPlacement;
  onJournal: () => void;
  onCreate: (kind: ReferenceKind) => void;
}) {
  if (!open) return null;

  const alignClass = align === "end" ? "right-0" : align === "start" ? "left-0" : "left-1/2 -translate-x-1/2";
  const placementClass = placement === "down" ? `top-full mt-2 ${alignClass}` : `bottom-full mb-2 ${alignClass}`;

  return (
    <div
      className={`absolute z-[100] w-[min(300px,calc(100vw-2rem))] rounded-2xl border border-zinc-700/80 bg-zinc-900/95 p-2 shadow-2xl shadow-black/50 backdrop-blur-md ${placementClass}`}
      role="menu"
      aria-label={ADD_MENU.title}
    >
      <p className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">{ADD_MENU.title}</p>
      <AddMenuRow
        icon={ADD_MENU_ICONS.journal}
        title={ADD_MENU.journal}
        hint={ADD_MENU.journalHint}
        onClick={onJournal}
      />
      <div className="my-1 border-t border-zinc-800" />
      {REFERENCE_KINDS.map((kind) => (
        <AddMenuRow
          key={kind}
          icon={ADD_MENU_ICONS[kind]}
          title={ADD_MENU.newKind(REFERENCE_KIND_LABELS[kind])}
          hint={ADD_MENU.kindHint[kind]}
          onClick={() => onCreate(kind)}
        />
      ))}
    </div>
  );
}

function AddMenuRow({
  icon,
  title,
  hint,
  onClick,
}: {
  icon: AddMenuIcon;
  title: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-zinc-800/90"
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base ${icon.boxClass}`}
        aria-hidden
      >
        {icon.glyph}
      </span>
      <span className="min-w-0">
        <span className="block text-[15px] font-medium text-zinc-100">{title}</span>
        <span className="mt-0.5 block text-[12px] leading-snug text-zinc-500">{hint}</span>
      </span>
    </button>
  );
}

function ArgusAddMenuShell({
  align,
  placement,
  className = "",
  trigger,
  controls,
}: {
  align: MenuAlign;
  placement: MenuPlacement;
  className?: string;
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode;
  controls: ReturnType<typeof useArgusAddMenuControls>;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const { menuOpen, setMenuOpen, createOpen, setCreateOpen, createKind, saveError, setSaveError, isPending, openCreate, openCaptureNote, handleSave } =
    controls;

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, [menuOpen, setMenuOpen]);

  return (
    <>
      <div ref={menuRef} className={`relative ${className}`}>
        <ArgusAddMenuPanel
          open={menuOpen}
          align={align}
          placement={placement}
          onJournal={openCaptureNote}
          onCreate={openCreate}
        />
        {trigger({
          open: menuOpen,
          toggle: () => setMenuOpen((value) => !value),
        })}
      </div>

      <ReferenceCreateModal
        open={createOpen}
        defaultKind={createKind}
        onCancel={() => {
          if (!isPending) {
            setSaveError(null);
            setCreateOpen(false);
          }
        }}
        onSave={handleSave}
        title={ENTITY_CREATE.title}
        saveLabel={isPending ? "Saving…" : ENTITY_CREATE.save}
        notesOptional
        error={saveError ?? undefined}
      />
    </>
  );
}

type AddMenuButtonProps = {
  variant?: "nav" | "floating";
  align?: MenuAlign;
  placement?: MenuPlacement;
  className?: string;
};

export function AddMenuButton({
  variant = "nav",
  align = "center",
  placement = "up",
  className = "",
}: AddMenuButtonProps) {
  const controls = useArgusAddMenuControls();

  const buttonClass =
    variant === "nav"
      ? "flex h-10 w-10 items-center justify-center rounded-full bg-teal-500 text-lg font-light text-white shadow-md shadow-teal-950/40 transition hover:bg-teal-400 active:scale-95"
      : "flex h-14 w-14 items-center justify-center rounded-full bg-teal-500 text-2xl font-light text-white shadow-lg shadow-teal-950/50 transition hover:bg-teal-400 active:scale-95";

  return (
    <ArgusAddMenuShell
      align={align}
      placement={placement}
      className={`flex flex-col items-center ${className}`}
      controls={controls}
      trigger={({ open, toggle }) => (
        <button
          type="button"
          onClick={toggle}
          aria-label={ADD_MENU.fab}
          aria-expanded={open}
          className={buttonClass}
        >
          +
        </button>
      )}
    />
  );
}

type AddJournalMenuButtonProps = {
  align?: MenuAlign;
  className?: string;
};

/** Primary add entry — opens the full Add menu (Journal + New Person/Org/Project/Topic/Event). */
export function AddJournalMenuButton({ align = "end", className = "" }: AddJournalMenuButtonProps) {
  const controls = useArgusAddMenuControls();

  return (
    <ArgusAddMenuShell
      align={align}
      placement="down"
      className={className}
      controls={controls}
      trigger={({ open, toggle }) => (
        <button
          type="button"
          onClick={toggle}
          aria-label={ADD_MENU.journal}
          aria-expanded={open}
          aria-haspopup="menu"
          className="inline-flex items-center rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-violet-900/30 transition hover:bg-violet-500 active:scale-[0.98]"
        >
          + Journal
        </button>
      )}
    />
  );
}

/** @deprecated Use AddMenuButton in BottomNav */
export function ArgusAddLauncher() {
  return (
    <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-5 z-40">
      <AddMenuButton variant="floating" align="end" />
    </div>
  );
}

export const EntityCreateLauncher = ArgusAddLauncher;
