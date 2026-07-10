"use client";

import { useEffect, useMemo, useState } from "react";
import type { Entity } from "@/lib/argus/types";
import {
  REFERENCE_KINDS,
  REFERENCE_KIND_LABELS,
  type ReferenceKind,
  referenceKindToEntityType,
} from "@/lib/argus/reference-types";
import type { EntityType } from "@/lib/argus/types";
import { REFERENCES } from "@/lib/argus/ux-copy";
import { inputClass } from "./ui";

interface ReferenceCreateModalProps {
  open: boolean;
  onCancel: () => void;
  onSave: (data: { name: string; entityType: EntityType; notes: string }) => void;
  defaultKind?: ReferenceKind;
  allowedKinds?: ReferenceKind[];
  title?: string;
  saveLabel?: string;
  notesOptional?: boolean;
  error?: string;
  /** Stacking above parent overlays (e.g. Link modal at z-200). */
  overlayZIndexClass?: string;
}

export function ReferenceCreateModal({
  open,
  onCancel,
  onSave,
  defaultKind = "person",
  allowedKinds = REFERENCE_KINDS,
  title,
  saveLabel,
  notesOptional = false,
  error,
  overlayZIndexClass = "z-[220]",
}: ReferenceCreateModalProps) {
  const creatableKinds = useMemo(
    () => REFERENCE_KINDS.filter((kind) => allowedKinds.includes(kind)),
    [allowedKinds]
  );
  const initialKind = creatableKinds.includes(defaultKind) ? defaultKind : creatableKinds[0] ?? "person";
  const [name, setName] = useState("");
  const [kind, setKind] = useState<ReferenceKind>(initialKind);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) setKind(initialKind);
  }, [open, initialKind]);

  if (!open) return null;

  function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave({
      name: trimmed,
      entityType: referenceKindToEntityType(kind),
      notes: notes.trim(),
    });
    setName("");
    setKind(initialKind);
    setNotes("");
  }

  return (
    <div className={`fixed inset-0 ${overlayZIndexClass} flex items-center justify-center bg-black/60 p-4`}>
      <div
        className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 p-5 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reference-create-title"
      >
        <h2 id="reference-create-title" className="text-lg font-semibold text-zinc-100">
          {title ?? REFERENCES.createNew}
        </h2>
        {error ? <p className="mt-2 text-sm text-amber-400">{error}</p> : null}
        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="text-xs font-medium text-zinc-500">Name</span>
            <input
              className={`${inputClass} mt-1`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-zinc-500">Type</span>
            <select
              className={`${inputClass} mt-1`}
              value={kind}
              onChange={(e) => setKind(e.target.value as ReferenceKind)}
            >
              {creatableKinds.map((k) => (
                <option key={k} value={k}>
                  {REFERENCE_KIND_LABELS[k]}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-zinc-500">Notes{notesOptional ? " (optional)" : ""}</span>
            <input
              className={`${inputClass} mt-1`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
          >
            {REFERENCES.cancel}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!name.trim()}
            className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-600 disabled:opacity-40"
          >
            {saveLabel ?? REFERENCES.save}
          </button>
        </div>
      </div>
    </div>
  );
}
