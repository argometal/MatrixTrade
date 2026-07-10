"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  archiveEntityAction,
  deleteProjectAction,
  restoreEntityAction,
  renameEntityAction,
} from "@/app/argus/actions";
import type { EntityLifecycleStatus } from "@/lib/argus/types";
import { TESTING } from "@/lib/argus/ux-copy";

type EntityKind = "project" | "organization" | "topic" | "event" | "person";

type Props = {
  entityId: string;
  entityName: string;
  entityKind: EntityKind;
  lifecycleStatus?: EntityLifecycleStatus;
  href?: string;
  returnTo: string;
  variant?: "menu" | "inline";
  showDelete?: boolean;
  hasPrivateEvidence?: boolean;
  privateConfigured?: boolean;
  privateUnlocked?: boolean;
};

export function V2EntityLifecycleActions({
  entityId,
  entityName,
  entityKind,
  lifecycleStatus = "active",
  href,
  returnTo,
  variant = "menu",
  showDelete = false,
  hasPrivateEvidence = false,
  privateConfigured = false,
  privateUnlocked = false,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [draftName, setDraftName] = useState(entityName);
  const [confirmName, setConfirmName] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isArchived = lifecycleStatus === "archived";

  useEffect(() => {
    setDraftName(entityName);
  }, [entityName]);

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

  const needsPin = hasPrivateEvidence && privateConfigured && !privateUnlocked;
  const nameMatches = confirmName.trim().toLowerCase() === entityName.trim().toLowerCase();
  const canDelete = showDelete && nameMatches && (!needsPin || pin.length > 0);

  async function submitRename(event: React.FormEvent) {
    event.preventDefault();
    if (!draftName.trim() || draftName.trim() === entityName) {
      setRenameOpen(false);
      return;
    }
    setBusy(true);
    const formData = new FormData();
    formData.set("entityId", entityId);
    formData.set("name", draftName.trim());
    formData.set("returnTo", returnTo);
    await renameEntityAction(formData);
  }

  async function submitArchive() {
    setBusy(true);
    const formData = new FormData();
    formData.set("entityId", entityId);
    formData.set("returnTo", returnTo);
    await archiveEntityAction(formData);
  }

  async function submitRestore() {
    setBusy(true);
    const formData = new FormData();
    formData.set("entityId", entityId);
    formData.set("returnTo", returnTo);
    await restoreEntityAction(formData);
  }

  async function submitDelete(event: React.FormEvent) {
    event.preventDefault();
    if (!canDelete) return;
    setBusy(true);
    const formData = new FormData();
    formData.set("entityId", entityId);
    formData.set("confirmName", confirmName.trim());
    formData.set("pin", pin);
    formData.set("returnTo", returnTo);
    await deleteProjectAction(formData);
  }

  const archiveLabel = entityKind === "project" ? "Archive project" : "Archive";

  const inlineButtons = (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => setRenameOpen(true)}
        className="rounded-xl border border-zinc-700/80 bg-zinc-900/60 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-600 hover:text-zinc-200"
      >
        Rename
      </button>
      {isArchived ? (
        <button
          type="button"
          onClick={() => void submitRestore()}
          disabled={busy}
          className="rounded-xl border border-emerald-800/50 bg-emerald-950/30 px-4 py-2 text-sm text-emerald-300 hover:bg-emerald-950/50 disabled:opacity-50"
        >
          Restore
        </button>
      ) : (
        <button
          type="button"
          onClick={() => void submitArchive()}
          disabled={busy}
          className="rounded-xl border border-zinc-700/80 bg-zinc-900/60 px-4 py-2 text-sm text-zinc-400 hover:border-zinc-600 hover:text-zinc-200 disabled:opacity-50"
        >
          {archiveLabel}
        </button>
      )}
      {showDelete ? (
        <button
          type="button"
          onClick={() => setDeleteOpen(true)}
          className="rounded-xl border border-red-900/50 bg-red-950/20 px-4 py-2 text-sm text-red-300 hover:bg-red-950/40"
        >
          {TESTING.deleteProject}
        </button>
      ) : null}
    </div>
  );

  const menuTrigger = (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setMenuOpen((open) => !open);
        }}
        className="rounded-lg px-2 py-1 text-sm text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
        aria-label={`Actions for ${entityName}`}
      >
        ···
      </button>
      {menuOpen ? (
        <div
          className="absolute right-0 top-full z-20 mt-1 min-w-[160px] rounded-xl border border-zinc-700 bg-zinc-900 p-1 shadow-xl"
          onClick={(event) => event.stopPropagation()}
        >
          {href ? (
            <Link
              href={href}
              className="block rounded-lg px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800"
              onClick={() => setMenuOpen(false)}
            >
              Open
            </Link>
          ) : null}
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              setRenameOpen(true);
            }}
            className="block w-full rounded-lg px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800"
          >
            Rename
          </button>
          {isArchived ? (
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                void submitRestore();
              }}
              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-emerald-300 hover:bg-zinc-800"
            >
              Restore
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                void submitArchive();
              }}
              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800"
            >
              {archiveLabel}
            </button>
          )}
          {showDelete ? (
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setDeleteOpen(true);
              }}
              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-red-300 hover:bg-red-950/40"
            >
              {TESTING.deleteProject}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );

  return (
    <>
      {variant === "inline" ? inlineButtons : menuTrigger}

      {renameOpen ? (
        <Modal title={`Rename ${entityKind}`} onClose={() => !busy && setRenameOpen(false)}>
          <form onSubmit={(event) => void submitRename(event)} className="space-y-4">
            <label className="block text-sm text-zinc-400">
              Name
              <input
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 focus:border-violet-500/50 focus:outline-none"
                autoFocus
                required
              />
            </label>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRenameOpen(false)}
                disabled={busy}
                className="rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy || !draftName.trim()}
                className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {deleteOpen && showDelete ? (
        <Modal title={TESTING.deleteProject} onClose={() => !busy && setDeleteOpen(false)}>
          <form onSubmit={(event) => void submitDelete(event)} className="space-y-4">
            <p className="text-sm leading-relaxed text-zinc-400">{TESTING.deleteProjectConfirmHint}</p>
            <label className="block text-sm text-zinc-400">
              {TESTING.deleteProjectTypeName}: <span className="font-medium text-zinc-200">{entityName}</span>
              <input
                value={confirmName}
                onChange={(event) => setConfirmName(event.target.value)}
                placeholder={entityName}
                className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 focus:border-red-500/40 focus:outline-none"
                autoComplete="off"
                required
              />
            </label>
            {needsPin ? (
              <label className="block text-sm text-zinc-400">
                PIN
                <input
                  type="password"
                  inputMode="numeric"
                  value={pin}
                  onChange={(event) => setPin(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 focus:border-red-500/40 focus:outline-none"
                  required
                />
              </label>
            ) : null}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteOpen(false)}
                disabled={busy}
                className="rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy || !canDelete}
                className="rounded-xl border border-red-800 bg-red-950/50 px-4 py-2 text-sm font-medium text-red-200 hover:bg-red-950 disabled:opacity-50"
              >
                {TESTING.deleteProject}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
    </>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <h3 className="text-lg font-semibold text-zinc-50">{title}</h3>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
