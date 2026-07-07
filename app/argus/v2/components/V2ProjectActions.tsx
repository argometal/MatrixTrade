"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { deleteProjectAction, renameProjectAction } from "@/app/argus/actions";
import { TESTING } from "@/lib/argus/ux-copy";

type ProjectActionsProps = {
  projectId: string;
  projectName: string;
  href: string;
  hasPrivateEvidence: boolean;
  privateConfigured: boolean;
  privateUnlocked: boolean;
  returnTo?: string;
  /** Compact kebab on browse cards; full buttons on detail header */
  variant?: "menu" | "inline";
};

export function V2ProjectActions({
  projectId,
  projectName,
  href,
  hasPrivateEvidence,
  privateConfigured,
  privateUnlocked,
  returnTo = "/argus/v2/browse/projects",
  variant = "menu",
}: ProjectActionsProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [draftName, setDraftName] = useState(projectName);
  const [confirmName, setConfirmName] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDraftName(projectName);
  }, [projectName]);

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
  const nameMatches = confirmName.trim().toLowerCase() === projectName.trim().toLowerCase();
  const canDelete = nameMatches && (!needsPin || pin.length > 0);

  async function submitRename(event: React.FormEvent) {
    event.preventDefault();
    if (!draftName.trim() || draftName.trim() === projectName) {
      setRenameOpen(false);
      return;
    }
    setBusy(true);
    const formData = new FormData();
    formData.set("entityId", projectId);
    formData.set("name", draftName.trim());
    formData.set("returnTo", returnTo);
    await renameProjectAction(formData);
  }

  async function submitDelete(event: React.FormEvent) {
    event.preventDefault();
    if (!canDelete) return;
    setBusy(true);
    const formData = new FormData();
    formData.set("entityId", projectId);
    formData.set("confirmName", confirmName.trim());
    formData.set("pin", pin);
    formData.set("returnTo", "/argus/v2/browse/projects");
    await deleteProjectAction(formData);
  }

  function openRename() {
    setMenuOpen(false);
    setDraftName(projectName);
    setRenameOpen(true);
  }

  function openDelete() {
    setMenuOpen(false);
    setConfirmName("");
    setPin("");
    setDeleteOpen(true);
  }

  const trigger =
    variant === "inline" ? (
      <div className="flex gap-2">
        <button
          type="button"
          onClick={openRename}
          className="rounded-xl border border-zinc-700/80 bg-zinc-900/60 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-600 hover:text-zinc-200"
        >
          Rename
        </button>
        <button
          type="button"
          onClick={openDelete}
          className="rounded-xl border border-red-900/50 bg-red-950/20 px-4 py-2 text-sm text-red-300 hover:bg-red-950/40"
        >
          {TESTING.deleteProject}
        </button>
      </div>
    ) : (
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setMenuOpen((open) => !open);
          }}
          className="rounded-lg px-2 py-1 text-sm text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
          aria-label={`Actions for ${projectName}`}
        >
          ···
        </button>
        {menuOpen ? (
          <div
            className="absolute right-0 top-full z-20 mt-1 min-w-[140px] rounded-xl border border-zinc-700 bg-zinc-900 p-1 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <Link
              href={href}
              className="block rounded-lg px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800"
              onClick={() => setMenuOpen(false)}
            >
              Open
            </Link>
            <button
              type="button"
              onClick={openRename}
              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800"
            >
              Rename
            </button>
            <button
              type="button"
              onClick={openDelete}
              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-red-300 hover:bg-red-950/40"
            >
              {TESTING.deleteProject}
            </button>
          </div>
        ) : null}
      </div>
    );

  return (
    <>
      {trigger}

      {renameOpen ? (
        <Modal title="Rename project" onClose={() => !busy && setRenameOpen(false)}>
          <form onSubmit={(event) => void submitRename(event)} className="space-y-4">
            <label className="block text-sm text-zinc-400">
              Project name
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

      {deleteOpen ? (
        <Modal title={TESTING.deleteProject} onClose={() => !busy && setDeleteOpen(false)}>
          <form onSubmit={(event) => void submitDelete(event)} className="space-y-4">
            <p className="text-sm leading-relaxed text-zinc-400">{TESTING.deleteProjectConfirmHint}</p>
            {hasPrivateEvidence ? (
              <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
                🔒 This project includes protected evidence.
                {needsPin ? ` ${TESTING.deleteProjectPinHint}` : " Unlock private records first if delete is blocked."}
              </p>
            ) : null}
            <label className="block text-sm text-zinc-400">
              {TESTING.deleteProjectTypeName}: <span className="font-medium text-zinc-200">{projectName}</span>
              <input
                value={confirmName}
                onChange={(event) => setConfirmName(event.target.value)}
                placeholder={projectName}
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
        aria-labelledby="v2-project-modal-title"
      >
        <h3 id="v2-project-modal-title" className="text-lg font-semibold text-zinc-50">
          {title}
        </h3>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
