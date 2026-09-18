"use client";

import { RepositoryView } from "./components/RepositoryView";

/**
 * Forge home = My Decks list (AlgoApp-equivalent chrome).
 * Same AF03 repo as /forge/active — UI only.
 */
export default function ForgeHomePage() {
  return <RepositoryView view="active" folderId={null} rootHref="/forge" />;
}
