"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
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

type AddMenuButtonProps = {
  variant?: "nav" | "floating";
  align?: "start" | "center" | "end";
  className?: string;
};

export function AddMenuButton({
  variant = "nav",
  align = "center",
  className = "",
}: AddMenuButtonProps) {
  const router = useRouter();
  const { openCapture } = useArgusAdd();
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createKind, setCreateKind] = useState<ReferenceKind>("person");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [menuOpen]);

  function openCreate(kind: ReferenceKind) {
    setMenuOpen(false);
    setSaveError(null);
    setCreateKind(kind);
    setCreateOpen(true);
  }

  function openCaptureNote() {
    setMenuOpen(false);
    openCapture();
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
        router.push(entity.href);
      } catch (err) {
        const { layer, message } = formatArgusError(err);
        setSaveError(`${layer.toUpperCase()}: ${message}`);
      }
    });
  }

  const buttonClass =
    variant === "nav"
      ? "flex h-10 w-10 items-center justify-center rounded-full bg-teal-500 text-lg font-light text-white shadow-md shadow-teal-950/40 transition hover:bg-teal-400 active:scale-95"
      : "flex h-14 w-14 items-center justify-center rounded-full bg-teal-500 text-2xl font-light text-white shadow-lg shadow-teal-950/50 transition hover:bg-teal-400 active:scale-95";

  const menuAlignClass =
    align === "end" ? "right-0" : align === "start" ? "left-0" : "left-1/2 -translate-x-1/2";

  return (
    <>
      <div
        ref={menuRef}
        className={`relative flex flex-col items-center ${className}`}
      >
        {menuOpen ? (
          <div
            className={`absolute bottom-full z-50 mb-2 w-[min(280px,calc(100vw-2.5rem))] rounded-2xl border border-zinc-700/80 bg-zinc-900 p-2 shadow-2xl shadow-black/50 ${menuAlignClass}`}
            role="menu"
            aria-label={ADD_MENU.title}
          >
            <p className="px-3 py-2 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
              {ADD_MENU.title}
            </p>
            <button
              type="button"
              role="menuitem"
              onClick={openCaptureNote}
              className="flex w-full flex-col rounded-xl px-3 py-2.5 text-left hover:bg-zinc-800"
            >
              <span className="text-[15px] font-medium text-zinc-100">{ADD_MENU.captureNote}</span>
              <span className="mt-0.5 text-[12px] leading-snug text-zinc-500">{ADD_MENU.captureHint}</span>
            </button>
            <div className="my-1 border-t border-zinc-800" />
            {REFERENCE_KINDS.map((kind) => (
              <button
                key={kind}
                type="button"
                role="menuitem"
                onClick={() => openCreate(kind)}
                className="flex w-full flex-col rounded-xl px-3 py-2.5 text-left hover:bg-zinc-800"
              >
                <span className="text-[15px] text-zinc-200">{ADD_MENU.newKind(REFERENCE_KIND_LABELS[kind])}</span>
                <span className="mt-0.5 text-[12px] leading-snug text-zinc-500">{ADD_MENU.kindHint[kind]}</span>
              </button>
            ))}
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={ADD_MENU.fab}
          aria-expanded={menuOpen}
          className={buttonClass}
        >
          +
        </button>
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

/** @deprecated Use AddMenuButton in BottomNav */
export function ArgusAddLauncher() {
  return (
    <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-5 z-40">
      <AddMenuButton variant="floating" align="end" />
    </div>
  );
}

export const EntityCreateLauncher = ArgusAddLauncher;
