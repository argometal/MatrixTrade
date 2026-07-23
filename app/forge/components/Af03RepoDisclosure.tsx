"use client";

/** AF03 §14 prototype disclosure — shared banner for repo / deck / editor views. */
export function Af03RepoDisclosure() {
  return (
    <p
      role="status"
      className="rounded-lg border border-amber-900/60 bg-amber-950/40 px-3 py-2 text-sm text-amber-100/90"
    >
      AF03 §3–6 / delivery 3–6 prototype — folders, Chaos Decks, text/link ingest, and basic editor in this
      browser (<code className="text-amber-50/80">localStorage</code>). Not server persistence. Data can be
      lost. Image/file/PDF binary ingest, Viewer, Focus triggers, and Vault prep are not functional here.
    </p>
  );
}
