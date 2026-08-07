"use client";

import { useState } from "react";
import { unlockArgusDeleteAction, unlockArgusDeleteAuthAction } from "@/app/auth/actions";
import { deleteLogAction } from "@/app/argus/actions";
import { resolveLinkedDeleteUnlockMode } from "@/lib/argus/delete-unlock-mode";
import { DELETE_AUTH } from "@/lib/argus/ux-copy";

export type V2ChronicleDeleteLockProps = {
  /** Notes linked to topic/event/org prefer authenticator when TOTP exists. */
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

/** Soft-delete a chronicle Note (Log) — PIN unlock, or authenticator when TOTP is set. */
export function V2ChronicleNoteDeleteButton({
  logId,
  returnTo,
  label = "Delete",
  requiresAuthenticator = false,
  deleteUnlocked = false,
  deleteAuthUnlocked = false,
  deleteCodeConfigured = false,
  totpConfigured = false,
  deleteAuthConfigured = false,
  deleteError = false,
  deleteAuthError = false,
  totpRequired = false,
}: {
  logId: string;
  returnTo: string;
  label?: string;
} & V2ChronicleDeleteLockProps) {
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [code, setCode] = useState("");
  const [totp, setTotp] = useState("");

  const unlockMode = resolveLinkedDeleteUnlockMode({
    linkedRequiresAuthenticator: requiresAuthenticator,
    totpConfigured,
    deleteCodeConfigured,
  });
  const useAuth = unlockMode === "totp";
  const needsUnlock =
    unlockMode === "totp"
      ? !deleteAuthUnlocked
      : unlockMode === "pin"
        ? !deleteUnlocked
        : false;

  if (!deleteAuthConfigured || unlockMode === "none") {
    return (
      <form
        action={deleteLogAction}
        onSubmit={(event) => {
          if (!confirm(DELETE_AUTH.deleteNoteConfirm)) {
            event.preventDefault();
          }
        }}
        className="shrink-0"
        onClick={(event) => event.stopPropagation()}
      >
        <input type="hidden" name="logId" value={logId} />
        <input type="hidden" name="returnTo" value={returnTo} />
        <button
          type="submit"
          className="rounded-lg border border-red-900/50 bg-red-950/25 px-2 py-1 text-[10px] font-medium text-red-300/90 hover:bg-red-950/45"
        >
          {label}
        </button>
      </form>
    );
  }

  if (needsUnlock) {
    return (
      <>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setUnlockOpen(true);
          }}
          className="shrink-0 rounded-lg border border-red-900/40 bg-red-950/15 px-2 py-1 text-[10px] font-medium text-red-300/90 hover:bg-red-950/30"
        >
          {useAuth ? DELETE_AUTH.unlockAuthenticator : DELETE_AUTH.unlockCode}
        </button>
        {unlockOpen ? (
          <UnlockModal
            isAuth={useAuth}
            returnTo={returnTo}
            code={code}
            totp={totp}
            onCode={setCode}
            onTotp={setTotp}
            deleteError={deleteError}
            deleteAuthError={deleteAuthError}
            totpRequired={totpRequired}
            onClose={() => setUnlockOpen(false)}
          />
        ) : null}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setConfirmOpen(true);
        }}
        className="shrink-0 rounded-lg border border-red-900/50 bg-red-950/25 px-2 py-1 text-[10px] font-medium text-red-300/90 hover:bg-red-950/45"
      >
        {label}
      </button>
      {confirmOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setConfirmOpen(false)}
        >
          <form
            action={deleteLogAction}
            className="w-full max-w-sm rounded-2xl border border-zinc-700 bg-zinc-900 p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="text-sm font-medium text-zinc-100">{DELETE_AUTH.deleteNote}</p>
            <p className="mt-2 text-xs text-zinc-500">{DELETE_AUTH.deleteNoteConfirm}</p>
            <input type="hidden" name="logId" value={logId} />
            <input type="hidden" name="returnTo" value={returnTo} />
            <div className="mt-4 flex gap-2">
              <button
                type="submit"
                className="flex-1 rounded-lg bg-red-700 py-2 text-sm font-medium text-white hover:bg-red-600"
              >
                Delete
              </button>
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}

function UnlockModal({
  isAuth,
  returnTo,
  code,
  totp,
  onCode,
  onTotp,
  deleteError,
  deleteAuthError,
  totpRequired,
  onClose,
}: {
  isAuth: boolean;
  returnTo: string;
  code: string;
  totp: string;
  onCode: (value: string) => void;
  onTotp: (value: string) => void;
  deleteError?: boolean;
  deleteAuthError?: boolean;
  totpRequired?: boolean;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <form
        action={isAuth ? unlockArgusDeleteAuthAction : unlockArgusDeleteAction}
        className="w-full max-w-sm rounded-2xl border border-zinc-700 bg-zinc-900 p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="text-sm font-medium text-zinc-100">
          {isAuth ? DELETE_AUTH.authenticatorTitle : DELETE_AUTH.codeTitle}
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          {isAuth ? DELETE_AUTH.authenticatorHint : DELETE_AUTH.codeHint}
        </p>
        <input type="hidden" name="returnTo" value={returnTo} />
        <input
          name={isAuth ? "totp" : "code"}
          type={isAuth ? "text" : "password"}
          inputMode={isAuth ? "numeric" : undefined}
          autoComplete={isAuth ? "one-time-code" : "off"}
          placeholder={isAuth ? "000000" : DELETE_AUTH.codePlaceholder}
          value={isAuth ? totp : code}
          onChange={(event) => (isAuth ? onTotp(event.target.value) : onCode(event.target.value))}
          className="mt-3 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
          autoFocus
        />
        {deleteAuthError && isAuth ? (
          <p className="mt-2 text-xs text-red-400">{DELETE_AUTH.wrongAuthenticator}</p>
        ) : null}
        {deleteError && !isAuth ? (
          <p className="mt-2 text-xs text-red-400">{DELETE_AUTH.wrongCode}</p>
        ) : null}
        {totpRequired && isAuth ? (
          <p className="mt-2 text-xs text-amber-400">{DELETE_AUTH.linkedRequiresAuth}</p>
        ) : null}
        <div className="mt-4 flex gap-2">
          <button
            type="submit"
            className="flex-1 rounded-lg bg-red-700 py-2 text-sm font-medium text-white hover:bg-red-600"
          >
            {DELETE_AUTH.unlockButton}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

/** Extract log id from evidence stream id `journal-{uuid}`. */
export function chronicleLogIdFromEvidenceId(evidenceId: string): string | null {
  if (!evidenceId.startsWith("journal-")) return null;
  return evidenceId.slice("journal-".length) || null;
}
