"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { unlockArgusDeleteAction, unlockArgusDeleteAuthAction } from "@/app/auth/actions";
import {
  archiveEntityAction,
  deleteEntityV2Action,
  restoreEntityAction,
  renameEntityAction,
} from "@/app/argus/actions";
import type { EntityLifecycleStatus } from "@/lib/argus/types";
import { DELETE_AUTH, TESTING } from "@/lib/argus/ux-copy";

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
  requiresAuthenticator?: boolean;
  deleteUnlocked?: boolean;
  deleteAuthUnlocked?: boolean;
  deleteCodeConfigured?: boolean;
  totpConfigured?: boolean;
  deleteAuthConfigured?: boolean;
  deleteError?: boolean;
  deleteAuthError?: boolean;
  totpRequired?: boolean;
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
  requiresAuthenticator = false,
  deleteUnlocked = false,
  deleteAuthUnlocked = false,
  deleteCodeConfigured = false,
  totpConfigured = false,
  deleteAuthConfigured = false,
  deleteError = false,
  deleteAuthError = false,
  totpRequired = false,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [draftName, setDraftName] = useState(entityName);
  const [confirmName, setConfirmName] = useState("");
  const [pin, setPin] = useState("");
  const [unlockCode, setUnlockCode] = useState("");
  const [unlockTotp, setUnlockTotp] = useState("");
  const [busy, setBusy] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isArchived = lifecycleStatus === "archived";
  const deleteLabel = entityKind === "project" ? TESTING.deleteProject : TESTING.deleteEntity;
  const deleteHint =
    entityKind === "project" ? TESTING.deleteProjectConfirmHint : TESTING.deleteEntityConfirmHint;
  const typeNameLabel =
    entityKind === "project" ? TESTING.deleteProjectTypeName : TESTING.deleteEntityTypeName;
  const pinHint =
    entityKind === "project" ? TESTING.deleteProjectPinHint : TESTING.deleteEntityPinHint;

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

  const needsPrivatePin = hasPrivateEvidence && privateConfigured && !privateUnlocked;
  const nameMatches = confirmName.trim().toLowerCase() === entityName.trim().toLowerCase();
  const canSubmitDelete = showDelete && nameMatches && (!needsPrivatePin || pin.length > 0);

  const deleteBlockedNoTotp = Boolean(
    showDelete && deleteAuthConfigured && requiresAuthenticator && !totpConfigured
  );
  const needsDeleteUnlock = Boolean(
    showDelete &&
      deleteAuthConfigured &&
      !deleteBlockedNoTotp &&
      (requiresAuthenticator ? !deleteAuthUnlocked : deleteCodeConfigured && !deleteUnlocked)
  );

  function openDeleteFlow() {
    setMenuOpen(false);
    if (needsDeleteUnlock) {
      setUnlockOpen(true);
      return;
    }
    setConfirmName("");
    setPin("");
    setDeleteOpen(true);
  }

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
    if (!canSubmitDelete) return;
    setBusy(true);
    const formData = new FormData();
    formData.set("entityId", entityId);
    formData.set("confirmName", confirmName.trim());
    formData.set("pin", pin);
    formData.set("returnTo", returnTo);
    await deleteEntityV2Action(formData);
  }

  const archiveLabel = entityKind === "project" ? "Archive project" : "Archive";

  const deleteControl =
    showDelete && deleteBlockedNoTotp ? (
      <span className="rounded-xl border border-amber-900/40 bg-amber-950/20 px-3 py-2 text-xs text-amber-200/90">
        {DELETE_AUTH.totpNotConfigured}
      </span>
    ) : showDelete ? (
      <button
        type="button"
        onClick={openDeleteFlow}
        className="rounded-xl border border-red-900/50 bg-red-950/20 px-4 py-2 text-sm text-red-300 hover:bg-red-950/40"
      >
        {needsDeleteUnlock
          ? requiresAuthenticator
            ? DELETE_AUTH.unlockAuthenticator
            : DELETE_AUTH.unlockCode
          : deleteLabel}
      </button>
    ) : null;

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
      {deleteControl}
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
          {showDelete && !deleteBlockedNoTotp ? (
            <button
              type="button"
              onClick={openDeleteFlow}
              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-red-300 hover:bg-red-950/40"
            >
              {needsDeleteUnlock
                ? requiresAuthenticator
                  ? DELETE_AUTH.unlockAuthenticator
                  : DELETE_AUTH.unlockCode
                : deleteLabel}
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

      {unlockOpen && needsDeleteUnlock ? (
        <Modal
          title={requiresAuthenticator ? DELETE_AUTH.authenticatorTitle : DELETE_AUTH.codeTitle}
          onClose={() => setUnlockOpen(false)}
        >
          <form
            action={requiresAuthenticator ? unlockArgusDeleteAuthAction : unlockArgusDeleteAction}
            className="space-y-4"
          >
            <p className="text-sm text-zinc-400">
              {requiresAuthenticator ? DELETE_AUTH.authenticatorHint : DELETE_AUTH.codeHint}
            </p>
            <input type="hidden" name="returnTo" value={returnTo} />
            <input
              name={requiresAuthenticator ? "totp" : "code"}
              type={requiresAuthenticator ? "text" : "password"}
              inputMode={requiresAuthenticator ? "numeric" : undefined}
              autoComplete={requiresAuthenticator ? "one-time-code" : "off"}
              placeholder={requiresAuthenticator ? "000000" : DELETE_AUTH.codePlaceholder}
              value={requiresAuthenticator ? unlockTotp : unlockCode}
              onChange={(event) =>
                requiresAuthenticator
                  ? setUnlockTotp(event.target.value)
                  : setUnlockCode(event.target.value)
              }
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 focus:border-red-500/40 focus:outline-none"
              autoFocus
              required
            />
            {deleteAuthError && requiresAuthenticator ? (
              <p className="text-xs text-red-400">{DELETE_AUTH.wrongAuthenticator}</p>
            ) : null}
            {deleteError && !requiresAuthenticator ? (
              <p className="text-xs text-red-400">{DELETE_AUTH.wrongCode}</p>
            ) : null}
            {totpRequired && requiresAuthenticator ? (
              <p className="text-xs text-amber-400">{DELETE_AUTH.linkedRequiresAuth}</p>
            ) : null}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setUnlockOpen(false)}
                className="rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-xl border border-red-800 bg-red-950/50 px-4 py-2 text-sm font-medium text-red-200 hover:bg-red-950"
              >
                {DELETE_AUTH.unlockButton}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {deleteOpen && showDelete && !needsDeleteUnlock ? (
        <Modal title={deleteLabel} onClose={() => !busy && setDeleteOpen(false)}>
          <form onSubmit={(event) => void submitDelete(event)} className="space-y-4">
            <p className="text-sm leading-relaxed text-zinc-400">{deleteHint}</p>
            {hasPrivateEvidence ? (
              <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
                🔒 {needsPrivatePin ? pinHint : "This record includes protected evidence."}
              </p>
            ) : null}
            <label className="block text-sm text-zinc-400">
              {typeNameLabel}: <span className="font-medium text-zinc-200">{entityName}</span>
              <input
                value={confirmName}
                onChange={(event) => setConfirmName(event.target.value)}
                placeholder={entityName}
                className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 focus:border-red-500/40 focus:outline-none"
                autoComplete="off"
                required
              />
            </label>
            {needsPrivatePin ? (
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
                disabled={busy || !canSubmitDelete}
                className="rounded-xl border border-red-800 bg-red-950/50 px-4 py-2 text-sm font-medium text-red-200 hover:bg-red-950 disabled:opacity-50"
              >
                {deleteLabel}
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
