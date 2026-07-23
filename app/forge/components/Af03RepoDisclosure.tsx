"use client";

/** AF03 §14 prototype disclosure — shared banner for repo / deck / editor / viewer / vault. */
export function Af03RepoDisclosure() {
  return (
    <p
      role="status"
      className="rounded-lg border border-amber-900/60 bg-amber-950/40 px-3 py-2 text-sm text-amber-100/90"
    >
      AF03 prototype — browser <code className="text-amber-50/80">localStorage</code> (repo + vault prep
      queue). Not server persistence; data can be lost. Viewer/editor/Vault prep are local-only. Dual
      Active/Archive roots remain interim (DEBT-AF03-01). Not Alexandria. Focus triggers not implemented.
    </p>
  );
}
